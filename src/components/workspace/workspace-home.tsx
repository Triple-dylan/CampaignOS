"use client";

import * as React from "react";
import { AppHeader } from "@/components/layout/app-header";
import { ChatDock } from "@/components/workspace/chat-dock";
import { WorkspaceGraphCanvas } from "@/components/workspace/workspace-graph-canvas";
import {
  WorkspaceContextPanel,
  type WorkspaceMetrics,
} from "@/components/workspace/workspace-context-panel";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import type { OnboardingData } from "@/actions/campaigns";
import type { CampaignGraphFlow, CampaignGraphNodeData } from "@/lib/graph/to-react-flow";
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

export function WorkspaceHome({
  isSetupComplete,
  campaign,
  profile,
  graph,
  edgeCount,
  metrics,
  onboardingData,
}: WorkspaceHomeProps) {
  const [selectedNode, setSelectedNode] =
    React.useState<CampaignGraphNodeData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null,
  );
  const [panelCollapsed, setPanelCollapsed] = React.useState(false);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSelectNode = React.useCallback(
    (node: CampaignGraphNodeData | null, id: string | null) => {
      setSelectedNode(node);
      setSelectedNodeId(id);
      if (node) setPanelCollapsed(false);
    },
    [],
  );

  const focusComposer = React.useCallback(() => {
    composerRef.current?.focus();
  }, []);

  if (!isSetupComplete) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <AppHeader
          title="Set up your campaign"
          description="Answer a few questions and your campaign map starts building itself."
        />
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
            {onboardingData ? (
              <OnboardingWizard initialData={onboardingData} />
            ) : (
              <p className="mx-auto max-w-lg text-sm text-muted-foreground">
                Select or create a campaign organization from the workspace
                rail to begin setup.
              </p>
            )}
          </div>
          <ChatDock composerRef={composerRef} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <AppHeader
        title="Workspace"
        description="Your live campaign map and command center."
      />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <WorkspaceGraphCanvas
              graph={graph}
              edgeCount={edgeCount}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              onFocusComposer={focusComposer}
            />
          </div>
          <ChatDock composerRef={composerRef} />
        </div>
        <WorkspaceContextPanel
          campaign={campaign}
          profile={profile}
          metrics={metrics}
          selectedNode={selectedNode}
          collapsed={panelCollapsed}
          onToggleCollapsed={() => setPanelCollapsed((v) => !v)}
          onClearSelection={() => handleSelectNode(null, null)}
        />
      </div>
    </div>
  );
}
