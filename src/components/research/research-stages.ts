import type { DbResearchBrief } from "@/lib/db/schema";

/**
 * Client-side pseudo-stages layered on top of the existing `draft`/`complete`
 * status. These exist purely in the UI to give the board Notion-style lanes —
 * there is NO database column for them. Stage is derived from how much of the
 * brief has been filled in, so a brief naturally moves left → right as a user
 * (or the assistant) scopes it, gathers content, attaches sources, and marks it
 * complete.
 */
export const RESEARCH_STAGES = [
  "to_scope",
  "collecting",
  "verifying",
  "ready",
] as const;

export type ResearchStage = (typeof RESEARCH_STAGES)[number];

export const RESEARCH_STAGE_META: Record<
  ResearchStage,
  { label: string; hint: string; dot: string }
> = {
  to_scope: {
    label: "To scope",
    hint: "Fresh briefs that need a topic and direction.",
    dot: "bg-slate-400",
  },
  collecting: {
    label: "Collecting",
    hint: "Summary and findings are taking shape.",
    dot: "bg-sky-500",
  },
  verifying: {
    label: "Verifying",
    hint: "Sources attached — confirm before publishing.",
    dot: "bg-amber-500",
  },
  ready: {
    label: "Ready",
    hint: "Marked complete and ready to use.",
    dot: "bg-emerald-500",
  },
};

export function keyFindings(brief: DbResearchBrief): string[] {
  return Array.isArray(brief.key_findings_json)
    ? brief.key_findings_json.filter(Boolean)
    : [];
}

export function sourceCount(brief: DbResearchBrief): number {
  return Array.isArray(brief.sources_json) ? brief.sources_json.length : 0;
}

/**
 * Map an existing brief onto one of the four pseudo-stages using only fields
 * already present in `research_briefs`. Completed briefs are always "ready";
 * drafts are bucketed by how much research has been captured so far.
 */
export function deriveStage(brief: DbResearchBrief): ResearchStage {
  if (brief.status === "complete") {
    return "ready";
  }

  const hasSummary = Boolean(brief.summary?.trim());
  const findings = keyFindings(brief).length;
  const sources = sourceCount(brief);

  if (!hasSummary && findings === 0 && sources === 0) {
    return "to_scope";
  }
  if (sources > 0) {
    return "verifying";
  }
  return "collecting";
}

export type NormalizedSource = {
  url: string;
  title: string;
  snippet?: string;
  type?: string;
};

function looksLikeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidUrl(value: string): boolean {
  return looksLikeUrl(value);
}

/**
 * Normalize a stored source into a predictable shape. `sources_json` is *meant*
 * to be `{ url, title, snippet }[]`, but historical / AI-generated rows can hold
 * plain strings or partial objects, so we handle those gracefully instead of
 * crashing the detail drawer.
 */
export function normalizeSource(raw: unknown): NormalizedSource {
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) {
      return { url: "", title: "Source" };
    }
    return looksLikeUrl(value)
      ? { url: value, title: value }
      : { url: "", title: value };
  }

  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url.trim() : "";
    const rawTitle = typeof record.title === "string" ? record.title.trim() : "";
    const snippet =
      typeof record.snippet === "string" && record.snippet.trim()
        ? record.snippet.trim()
        : undefined;
    const type =
      typeof record.type === "string" && record.type.trim()
        ? record.type.trim()
        : undefined;
    return {
      url,
      title: rawTitle || url || "Source",
      snippet,
      type,
    };
  }

  return { url: "", title: "Source" };
}

export function normalizeSources(raw: unknown): NormalizedSource[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(normalizeSource);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Graph node linked to a brief, surfaced read-only in the detail drawer. */
export type BriefGraphLink = {
  id: string;
  title: string;
  type: string;
};
