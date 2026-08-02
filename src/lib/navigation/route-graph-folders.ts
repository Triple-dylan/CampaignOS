import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";

/**
 * Primary app routes → knowledge-graph folder hubs.
 *
 * Navigating these destinations travels the persistent graph camera to the
 * matching cluster (GraphCon-style pull-through). `null` means overview —
 * ease back to the whole campaign map.
 */
export const ROUTE_GRAPH_FOLDERS: ReadonlyArray<{
  prefix: string;
  folder: CampaignFolderId | null;
}> = [
  { prefix: "/dashboard", folder: null },
  { prefix: "/assets", folder: "assets" },
  { prefix: "/research", folder: "research" },
  { prefix: "/fundraising", folder: "fundraising" },
  { prefix: "/planner", folder: "events" },
  { prefix: "/tasks", folder: "initiatives" },
  { prefix: "/compliance", folder: "compliance" },
  { prefix: "/brain", folder: null },
  { prefix: "/automations", folder: "campaign" },
  { prefix: "/agents/campaign-manager", folder: "campaign" },
  { prefix: "/agents/content-strategist", folder: "messaging" },
  { prefix: "/agents/researcher", folder: "research" },
  { prefix: "/agents/fundraiser", folder: "fundraising" },
  { prefix: "/agents/compliance-reviewer", folder: "compliance" },
  { prefix: "/settings", folder: null },
  { prefix: "/onboarding", folder: null },
];

/** Resolve the folder hub the graph should travel to for a pathname. */
export function folderForPathname(
  pathname: string,
): CampaignFolderId | null | undefined {
  // Longer prefixes first so `/agents/researcher` wins over a bare `/agents`.
  const sorted = [...ROUTE_GRAPH_FOLDERS].sort(
    (a, b) => b.prefix.length - a.prefix.length,
  );
  for (const entry of sorted) {
    if (
      pathname === entry.prefix ||
      pathname.startsWith(`${entry.prefix}/`)
    ) {
      return entry.folder;
    }
  }
  return undefined;
}

/** True when the route should show a right-side working panel over the graph. */
export function isWorkingPanelRoute(pathname: string): boolean {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return false;
  }
  if (pathname.startsWith("/onboarding")) return false;
  return (
    pathname.startsWith("/assets") ||
    pathname.startsWith("/research") ||
    pathname.startsWith("/fundraising") ||
    pathname.startsWith("/planner") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/compliance") ||
    pathname.startsWith("/brain") ||
    pathname.startsWith("/automations") ||
    pathname.startsWith("/agents") ||
    pathname.startsWith("/settings")
  );
}
