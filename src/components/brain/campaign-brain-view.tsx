"use client";

import * as React from "react";
import Link from "next/link";
import { Brain, PanelRight } from "lucide-react";
import { useCampaign } from "@/components/campaign/campaign-context";
import { MobileContextSheet } from "@/components/layout/mobile-context-sheet";
import { WorkspaceGraphCanvasLazy as WorkspaceGraphCanvas } from "@/components/workspace/workspace-graph-canvas.lazy";
import {
  WorkspaceContextPanel,
  type WorkspaceMetrics,
} from "@/components/workspace/workspace-context-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatGraphHighlights } from "@/hooks/use-chat-graph-highlights";
import type { CampaignGraphFlow, CampaignGraphNodeData } from "@/lib/graph/to-react-flow";

type CampaignBrainViewProps = {
  graph: CampaignGraphFlow;
  edgeCount: number;
  metrics: WorkspaceMetrics;
};

export function CampaignBrainView({
  graph,
  edgeCount,
  metrics,
}: CampaignBrainViewProps) {
  const { campaign, profile } = useCampaign();
  const isMobile = useIsMobile();
  const [selectedNode, setSelectedNode] =
    React.useState<CampaignGraphNodeData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = React.useState(false);

  // Same "agent thought" ripple as the dashboard, driven by the follow chat.
  const { highlightedNodeIds, searching } = useChatGraphHighlights(graph);

  const handleSelectNode = React.useCallback(
    (node: CampaignGraphNodeData | null, id: string | null) => {
      setSelectedNode(node);
      setSelectedNodeId(id);
      if (node) setPanelOpen(true);
    },
    [],
  );

  const handleSelectNodeId = React.useCallback(
    (id: string) => {
      const node = graph.nodes.find((n) => n.id === id);
      if (node) handleSelectNode(node.data, id);
    },
    [graph, handleSelectNode],
  );

  const contextPanelProps = {
    campaign,
    profile,
    metrics,
    graph,
    selectedNode,
    onClose: () => setPanelOpen(false),
    onClearSelection: () => handleSelectNode(null, null),
    onSelectNodeId: handleSelectNodeId,
  };

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
            className="absolute top-3 right-3 left-3 z-20 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
            role="status"
          >
            Displaying the first {graph.nodes.length} of {graph.totalNodeCount}{" "}
            nodes for performance.
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-label={panelOpen ? "Hide preview panel" : "Show preview panel"}
          aria-pressed={panelOpen}
          className="absolute top-3 right-3 z-30 flex size-9 items-center justify-center rounded-lg border border-border bg-card/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-accent hover:text-foreground md:hidden"
        >
          <PanelRight className="size-4" aria-hidden />
        </button>

        <div className="absolute inset-0">
          <WorkspaceGraphCanvas
            graph={graph}
            edgeCount={edgeCount}
            selectedNodeId={selectedNodeId}
            highlightedNodeIds={highlightedNodeIds}
            searching={searching}
            onSelectNode={handleSelectNode}
            showViewToggle
          />
        </div>
      </section>

      {panelOpen && !isMobile ? (
        <div className="hidden w-80 shrink-0 md:flex md:flex-col">
          <WorkspaceContextPanel {...contextPanelProps} />
        </div>
      ) : !panelOpen && !isMobile ? (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label="Open preview panel"
          className="hidden w-10 shrink-0 items-start justify-center border-l border-border pt-3 text-muted-foreground transition-colors hover:text-foreground md:flex"
        >
          <PanelRight className="size-4" aria-hidden />
        </button>
      ) : null}

      <MobileContextSheet
        open={panelOpen && isMobile}
        onOpenChange={setPanelOpen}
        {...contextPanelProps}
      />
    </div>
  );
}
