"use client";

import * as React from "react";
import Link from "next/link";
import { Brain } from "lucide-react";
import { useCampaign } from "@/components/campaign/campaign-context";
import { WorkspaceGraphCanvas } from "@/components/workspace/workspace-graph-canvas";
import { WorkspaceContextPanel } from "@/components/workspace/workspace-context-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CampaignGraphFlow, CampaignGraphNodeData } from "@/lib/graph/to-react-flow";

type CampaignBrainViewProps = {
  graph: CampaignGraphFlow;
  edgeCount: number;
};

export function CampaignBrainView({
  graph,
  edgeCount,
}: CampaignBrainViewProps) {
  const { campaign, profile } = useCampaign();
  const [selectedNode, setSelectedNode] =
    React.useState<CampaignGraphNodeData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = React.useState(true);

  const handleSelectNode = React.useCallback(
    (node: CampaignGraphNodeData | null, id: string | null) => {
      setSelectedNode(node);
      setSelectedNodeId(id);
      if (node) setPanelOpen(true);
    },
    [],
  );

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
    <div className="flex min-h-[min(80vh,820px)] flex-1">
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-muted/10">
        {graph.truncated ? (
          <div
            className="absolute left-3 right-3 top-3 z-20 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
            role="status"
          >
            Displaying the first {graph.nodes.length} of {graph.totalNodeCount}{" "}
            nodes for performance.
          </div>
        ) : null}

        <div className="absolute inset-0">
          <WorkspaceGraphCanvas
            graph={graph}
            edgeCount={edgeCount}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            showViewToggle
          />
        </div>
      </section>

      {panelOpen ? (
        <div className="hidden w-80 shrink-0 md:flex md:flex-col">
          <WorkspaceContextPanel
            campaign={campaign}
            profile={profile}
            metrics={{
              graphNodeCount: graph.totalNodeCount,
              assetCount: 0,
              taskCount: 0,
              upcomingEventCount: 0,
              researchBriefCount: 0,
              prospectCount: 0,
            }}
            graph={graph}
            selectedNode={selectedNode}
            onClose={() => setPanelOpen(false)}
            onClearSelection={() => handleSelectNode(null, null)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label="Open preview panel"
          className="hidden w-10 shrink-0 items-start justify-center border-l border-border pt-3 text-muted-foreground transition-colors hover:text-foreground md:flex"
        >
          <Brain className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
