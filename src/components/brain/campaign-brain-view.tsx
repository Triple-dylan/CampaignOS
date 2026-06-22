"use client";

import Link from "next/link";
import { Brain } from "lucide-react";
import { CampaignBrainGraph } from "@/components/brain/campaign-brain-graph";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CampaignGraphFlow } from "@/lib/graph/to-react-flow";

type CampaignBrainViewProps = {
  graph: CampaignGraphFlow;
  edgeCount: number;
};

export function CampaignBrainView({ graph, edgeCount }: CampaignBrainViewProps) {
  if (graph.totalNodeCount === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-muted-foreground" />
              <CardTitle>No campaign graph yet</CardTitle>
            </div>
            <CardDescription>
              Complete onboarding and generate Campaign Brain to see your graph.
              Nodes are added automatically as you create assets, events, tasks,
              research briefs, and prospects.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button render={<Link href="/onboarding" />} variant="outline">
              Review onboarding
            </Button>
            <Button render={<Link href="/dashboard" />}>Go to dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <CampaignBrainGraph graph={graph} edgeCount={edgeCount} />
    </div>
  );
}
