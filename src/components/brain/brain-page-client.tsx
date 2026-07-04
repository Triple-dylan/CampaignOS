"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { CampaignGraphFlow } from "@/lib/graph/to-react-flow";

const CampaignBrainView = dynamic(
  () =>
    import("@/components/brain/campaign-brain-view").then(
      (module) => module.CampaignBrainView,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-[min(70vh,720px)] min-h-[420px] w-full rounded-lg" />
      </div>
    ),
  },
);

type BrainPageClientProps = {
  graph: CampaignGraphFlow;
  edgeCount: number;
};

export function BrainPageClient({ graph, edgeCount }: BrainPageClientProps) {
  return <CampaignBrainView graph={graph} edgeCount={edgeCount} />;
}
