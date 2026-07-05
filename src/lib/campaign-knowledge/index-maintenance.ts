import { CAMPAIGN_FOLDERS } from "@/lib/campaign-knowledge/folders";
import { getKnowledgeStorage } from "@/lib/campaign-knowledge/storage";
import type { CampaignKnowledgeRoot } from "@/lib/campaign-knowledge/types";
import { walkCampaignKnowledgeNodes } from "@/lib/campaign-knowledge/sync-to-graph";

/** Rebuild the Page counts section of index.md from stored document pages. */
export async function rebuildKnowledgeIndex(
  root: CampaignKnowledgeRoot,
): Promise<void> {
  const storage = getKnowledgeStorage(root);
  const existing = await storage.readFile("index.md");
  if (existing === null) {
    return;
  }

  const headerEnd = existing.indexOf("## Page counts");
  const header =
    headerEnd >= 0
      ? existing.slice(0, headerEnd).trimEnd()
      : existing.trimEnd();

  const nodes = await walkCampaignKnowledgeNodes(root);
  const byFolder = new Map<string, Array<{ path: string; title: string; summary: string }>>();

  for (const node of nodes) {
    if (node.kind !== "document") continue;
    const list = byFolder.get(node.folder) ?? [];
    list.push({
      path: node.path,
      title: node.title,
      summary: node.summary ?? "",
    });
    byFolder.set(node.folder, list);
  }

  const sectionLines: string[] = ["## Page counts", ""];

  for (const folder of CAMPAIGN_FOLDERS) {
    const pages = byFolder.get(folder.id) ?? [];
    sectionLines.push(`## ${folder.label} (${pages.length})`);
    if (pages.length === 0) {
      sectionLines.push("");
      continue;
    }
    for (const page of pages.sort((a, b) => a.title.localeCompare(b.title))) {
      const summarySuffix = page.summary ? ` — ${page.summary}` : "";
      sectionLines.push(`- [${page.title}](${page.path})${summarySuffix}`);
    }
    sectionLines.push("");
  }

  sectionLines.push(
    "---",
    "",
    "_Each section lists pages as: `- [Title](path/to/page.md) — one-line summary`_",
    "",
  );

  await storage.writeFile("index.md", `${header}\n\n${sectionLines.join("\n")}`);
}

/** Update index after a wiki write (full rebuild for consistency). */
export async function touchKnowledgeIndexAfterWrite(input: {
  root: CampaignKnowledgeRoot;
  relativePath: string;
  title: string;
  summary?: string;
}): Promise<void> {
  await rebuildKnowledgeIndex(input.root);
}
