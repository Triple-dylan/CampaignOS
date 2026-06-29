export type SourceLink = {
  href: string;
  label: string;
};

type SourceObjectConfig = {
  href: string;
  label: string;
  /** Query param used for record deep-links (e.g. assetId). */
  idParam: string;
};

const SOURCE_OBJECT_LINKS: Record<string, SourceObjectConfig> = {
  asset: { href: "/assets", label: "Open Asset Studio", idParam: "assetId" },
  task: { href: "/tasks", label: "Open Tasks", idParam: "taskId" },
  calendar_event: { href: "/planner", label: "Open Planner", idParam: "eventId" },
  research_brief: {
    href: "/research",
    label: "Open Research Hub",
    idParam: "briefId",
  },
  fundraising_prospect: {
    href: "/fundraising",
    label: "Open Fundraising Planner",
    idParam: "prospectId",
  },
};

/**
 * Resolve a graph node's linked source record to a module URL.
 * When `sourceObjectId` is present, appends the record deep-link query param
 * so the receiving module page can open the matching detail view.
 */
export function getSourceObjectLink(input: {
  sourceObjectType: string | null;
  sourceObjectId: string | null;
}): SourceLink | null {
  if (!input.sourceObjectType?.trim()) {
    return null;
  }

  const config = SOURCE_OBJECT_LINKS[input.sourceObjectType];
  if (!config) {
    return null;
  }

  const href =
    input.sourceObjectId?.trim()
      ? `${config.href}?${config.idParam}=${encodeURIComponent(input.sourceObjectId.trim())}`
      : config.href;

  return {
    href,
    label: config.label,
  };
}

/** Build a module record deep-link URL (for tests and non-graph callers). */
export function buildRecordDeepLink(
  sourceObjectType: string,
  sourceObjectId: string,
): string | null {
  const link = getSourceObjectLink({ sourceObjectType, sourceObjectId });
  return link?.href ?? null;
}
