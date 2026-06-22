export type SourceLink = {
  href: string;
  label: string;
};

const SOURCE_OBJECT_LINKS: Record<
  string,
  { href: string; label: string }
> = {
  asset: { href: "/assets", label: "Open Asset Studio" },
  task: { href: "/tasks", label: "Open Tasks" },
  calendar_event: { href: "/planner", label: "Open Planner" },
  research_brief: { href: "/research", label: "Open Research Hub" },
  fundraising_prospect: { href: "/fundraising", label: "Open Fundraising Planner" },
};

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

  return config;
}
