import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { CampaignKnowledgeRoot } from "@/lib/campaign-knowledge/types";

/**
 * Storage backend for the campaign knowledge tree (the file/folder base behind
 * the context graph).
 *
 * Two backends implement the same interface:
 * - `supabase`: canonical cloud store (Supabase Storage bucket) so trees
 *   persist across serverless deploys and can be exported/synced by the user.
 * - `local`: plain files under the project root — for local-first development
 *   or self-hosted setups where the user owns the folder directly.
 *
 * Select via CAMPAIGN_KNOWLEDGE_STORAGE=local|supabase; defaults to supabase
 * whenever Supabase is configured.
 */
export type KnowledgeStorage = {
  backend: "local" | "supabase";
  /** Read a UTF-8 file relative to the campaign knowledge root; null if missing. */
  readFile(relativePath: string): Promise<string | null>;
  /** Create or overwrite a UTF-8 file relative to the root. */
  writeFile(relativePath: string, content: string): Promise<void>;
  exists(relativePath: string): Promise<boolean>;
  /** All markdown file paths under the root, relative, POSIX-separated. */
  listMarkdownFiles(): Promise<string[]>;
};

export const KNOWLEDGE_BUCKET = "campaign-knowledge";

export function knowledgeStorageBackend(): "local" | "supabase" {
  const override = process.env.CAMPAIGN_KNOWLEDGE_STORAGE;
  if (override === "local" || override === "supabase") return override;
  return isSupabaseConfigured() ? "supabase" : "local";
}

/* ------------------------------- local fs ------------------------------- */

function localStore(root: CampaignKnowledgeRoot): KnowledgeStorage {
  const absoluteRoot = path.join(process.cwd(), root.rootPath);

  async function walk(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await walk(fullPath)));
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
    return files;
  }

  return {
    backend: "local",
    async readFile(relativePath) {
      try {
        return await readFile(path.join(absoluteRoot, relativePath), "utf8");
      } catch {
        return null;
      }
    },
    async writeFile(relativePath, content) {
      const absolutePath = path.join(absoluteRoot, relativePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, content, "utf8");
    },
    async exists(relativePath) {
      try {
        await access(path.join(absoluteRoot, relativePath));
        return true;
      } catch {
        return false;
      }
    },
    async listMarkdownFiles() {
      try {
        const files = await walk(absoluteRoot);
        return files.map((file) =>
          path.relative(absoluteRoot, file).split(path.sep).join("/"),
        );
      } catch {
        return [];
      }
    },
  };
}

/* --------------------------- supabase storage --------------------------- */

let bucketEnsured: Promise<void> | null = null;

function ensureBucket(): Promise<void> {
  if (!bucketEnsured) {
    bucketEnsured = (async () => {
      const supabase = getSupabaseAdmin();
      // Idempotent: createBucket fails harmlessly when the bucket exists.
      await supabase.storage
        .createBucket(KNOWLEDGE_BUCKET, { public: false })
        .catch(() => undefined);
    })();
  }
  return bucketEnsured;
}

function supabaseStore(root: CampaignKnowledgeRoot): KnowledgeStorage {
  const prefix = `${root.organizationId}/${root.campaignId}`;
  const key = (relativePath: string) =>
    `${prefix}/${relativePath.replace(/^\/+/, "")}`;

  return {
    backend: "supabase",
    async readFile(relativePath) {
      await ensureBucket();
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(KNOWLEDGE_BUCKET)
        .download(key(relativePath));
      if (error || !data) return null;
      return await data.text();
    },
    async writeFile(relativePath, content) {
      await ensureBucket();
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.storage
        .from(KNOWLEDGE_BUCKET)
        .upload(key(relativePath), new Blob([content]), {
          upsert: true,
          contentType: "text/markdown; charset=utf-8",
        });
      if (error) {
        throw new Error(
          `campaign-knowledge upload failed for ${relativePath}: ${error.message}`,
        );
      }
    },
    async exists(relativePath) {
      await ensureBucket();
      const supabase = getSupabaseAdmin();
      const target = key(relativePath);
      const dir = target.slice(0, target.lastIndexOf("/"));
      const filename = target.slice(target.lastIndexOf("/") + 1);
      const { data, error } = await supabase.storage
        .from(KNOWLEDGE_BUCKET)
        .list(dir, { search: filename, limit: 1 });
      if (error) return false;
      return (data ?? []).some((item) => item.name === filename);
    },
    async listMarkdownFiles() {
      await ensureBucket();
      const supabase = getSupabaseAdmin();
      const results: string[] = [];
      // Supabase Storage lists one level at a time; walk directories breadth-first.
      const queue: string[] = [prefix];
      while (queue.length > 0) {
        const dir = queue.shift()!;
        const { data, error } = await supabase.storage
          .from(KNOWLEDGE_BUCKET)
          .list(dir, { limit: 1000 });
        if (error || !data) continue;
        for (const item of data) {
          // Directories come back with a null id in Supabase Storage lists.
          if (item.id === null) {
            queue.push(`${dir}/${item.name}`);
          } else if (item.name.endsWith(".md")) {
            results.push(`${dir}/${item.name}`.slice(prefix.length + 1));
          }
        }
      }
      return results;
    },
  };
}

export function getKnowledgeStorage(
  root: CampaignKnowledgeRoot,
): KnowledgeStorage {
  return knowledgeStorageBackend() === "supabase"
    ? supabaseStore(root)
    : localStore(root);
}
