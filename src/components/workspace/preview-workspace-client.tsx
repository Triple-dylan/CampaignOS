"use client";

import { CampaignProvider } from "@/components/campaign/campaign-context";
import { ChatProvider } from "@/components/chat/chat-provider";
import { AutomationsProvider } from "@/components/automations/automations-provider";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { WorkspaceHome } from "@/components/workspace/workspace-home";
import {
  DEMO_CAMPAIGN,
  DEMO_CONTEXT,
  DEMO_DIGEST,
  DEMO_EDGES,
  DEMO_GRAPH,
  DEMO_GROWTH_STEPS,
  DEMO_METRICS,
  DEMO_NODES,
  DEMO_PROFILE,
} from "@/lib/preview/demo-workspace";

/**
 * Development-only preview of the post-auth workspace shell with static demo
 * content. No real org, user, or Supabase data is used.
 */
export function PreviewWorkspaceClient() {
  return (
    <CampaignProvider value={DEMO_CONTEXT}>
      <AutomationsProvider>
        <ChatProvider initialAiConfigured={false}>
          <WorkspaceShell>
            <WorkspaceHome
              isSetupComplete
              campaign={DEMO_CAMPAIGN}
              profile={DEMO_PROFILE}
              graph={DEMO_GRAPH}
              edgeCount={DEMO_GRAPH.edges.length}
              metrics={DEMO_METRICS}
              digest={DEMO_DIGEST}
              onboardingData={null}
              liveSeed={{ nodes: DEMO_NODES, edges: DEMO_EDGES }}
              growthSteps={DEMO_GROWTH_STEPS}
            />
          </WorkspaceShell>
        </ChatProvider>
      </AutomationsProvider>
    </CampaignProvider>
  );
}
