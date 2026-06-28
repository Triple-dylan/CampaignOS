"use client";

import * as React from "react";
import { PanelRight } from "lucide-react";
import { useChat } from "@/components/chat/chat-provider";
import { useWorkspaceShell } from "@/components/layout/workspace-shell";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { ChatDock } from "@/components/workspace/chat-dock";
import { WorkspaceGraphCanvas } from "@/components/workspace/workspace-graph-canvas";
import {
  WorkspaceContextPanel,
  type WorkspaceMetrics,
} from "@/components/workspace/workspace-context-panel";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import type { OnboardingData } from "@/actions/campaigns";
import type {
  CampaignGraphFlow,
  CampaignGraphNodeData,
} from "@/lib/graph/to-react-flow";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";

type WorkspaceHomeProps = {
  isSetupComplete: boolean;
  campaign: DbCampaign | null;
  profile: DbCampaignProfile | null;
  graph: CampaignGraphFlow | null;
  edgeCount: number;
  metrics: WorkspaceMetrics;
  onboardingData: OnboardingData | null;
};

/**
 * While the assistant is working, stage a rotating set of highlighted node ids
 * so the graph visibly "lights up" as the model reads through the campaign —
 * a simulated visualization of its search/thinking, tied to chat activity.
 */
function useGraphActivityHighlights(
  nodeIds: string[],
  active: boolean,
): Set<string> {
  const [highlighted, setHighlighted] = React.useState<Set<string>>(
    () => new Set(),
  );

  React.useEffect(() => {
    if (!active || nodeIds.length === 0) {
      if (highlighted.size === 0) return;
      const timeout = setTimeout(() => setHighlighted(new Set()), 350);
      return () => clearTimeout(timeout);
    }

    let step = 0;
    const tick = () => {
      const picks = new Set<string>();
      const count = Math.min(3, nodeIds.length);
      for (let k = 0; k < count; k += 1) {
        picks.add(nodeIds[(step + k * 2) % nodeIds.length]);
      }
      setHighlighted(picks);
      step = (step + 1) % nodeIds.length;
    };

    tick();
    const interval = setInterval(tick, 460);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, nodeIds]);

  return highlighted;
}

export function WorkspaceHome({
  isSetupComplete,
  campaign,
  profile,
  graph,
  edgeCount,
  metrics,
  onboardingData,
}: WorkspaceHomeProps) {
  const { isSending } = useChat();
  const { toggleRailMobile } = useWorkspaceShell();
  const [selectedNode, setSelectedNode] =
    React.useState<CampaignGraphNodeData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = React.useState(true);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);

  const nodeIds = React.useMemo(
    () => (graph ? graph.nodes.map((n) => n.id) : []),
    [graph],
  );
  const highlightedNodeIds = useGraphActivityHighlights(nodeIds, isSending);

  const handleSelectNode = React.useCallback(
    (node: CampaignGraphNodeData | null, id: string | null) => {
      setSelectedNode(node);
      setSelectedNodeId(id);
      if (node) setPanelOpen(true);
    },
    [],
  );

  const focusComposer = React.useCallback(() => {
    composerRef.current?.focus();
  }, []);

  if (!isSetupComplete) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <WorkspaceTopBar
          onToggleRail={toggleRailMobile}
          onTogglePanel={() => setPanelOpen((v) => !v)}
          panelOpen={panelOpen}
          showPanelToggle={false}
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 md:px-8">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-lg font-semibold tracking-tight">
              Set up your campaign
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Answer a few questions and your campaign map starts building
              itself.
            </p>
            <div className="mt-6">
              {onboardingData ? (
                <OnboardingWizard initialData={onboardingData} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select or create a campaign organization from the rail to
                  begin setup.
                </p>
              )}
            </div>
          </div>
        </div>
        <ChatDock composerRef={composerRef} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* Center: ever-present knowledge graph + docked composer */}
      <section className="flex min-w-0 flex-1 flex-col">
        <WorkspaceTopBar
          onToggleRail={toggleRailMobile}
          onTogglePanel={() => setPanelOpen((v) => !v)}
          panelOpen={panelOpen}
          showPanelToggle
        />
        <div className="relative min-h-0 flex-1">
          <WorkspaceGraphCanvas
            graph={graph}
            edgeCount={edgeCount}
            selectedNodeId={selectedNodeId}
            highlightedNodeIds={highlightedNodeIds}
            searching={isSending}
            onSelectNode={handleSelectNode}
            onFocusComposer={focusComposer}
          />
        </div>
        <ChatDock composerRef={composerRef} />
      </section>

      {/* Right rail: preview + accessibility (collapsible) */}
      {panelOpen ? (
        <WorkspaceContextPanel
          campaign={campaign}
          profile={profile}
          metrics={metrics}
          selectedNode={selectedNode}
          onClose={() => setPanelOpen(false)}
          onClearSelection={() => handleSelectNode(null, null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label="Open preview panel"
          className="hidden w-10 shrink-0 items-start justify-center border-l border-border pt-3 text-muted-foreground transition-colors hover:text-foreground md:flex"
        >
          <PanelRight className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
