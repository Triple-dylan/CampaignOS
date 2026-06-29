"use client";

import Link from "next/link";
import { CampaignProvider } from "@/components/campaign/campaign-context";
import { ChatProvider, type ChatThread } from "@/components/chat/chat-provider";
import { AutomationsProvider } from "@/components/automations/automations-provider";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { WorkPageFrame } from "@/components/layout/work-page-frame";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEMO_CONTEXT } from "@/lib/preview/demo-workspace";

const DEMO_THREADS: ChatThread[] = [
  {
    id: "thread_demo",
    title: "Weekly priorities",
    createdAt: Date.now() - 60_000,
    messages: [
      {
        id: "m1",
        role: "user",
        content: "What should we prioritize on assets this week?",
        createdAt: Date.now() - 50_000,
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "Focus on three things:\n\n• Finalize the healthcare mailer (in review).\n• Draft two GOTV social posts for the weekend.\n• Approve the volunteer recruitment graphic so Field can deploy it.",
        createdAt: Date.now() - 48_000,
      },
    ],
  },
];

/**
 * Dev-only preview of a dedicated module page rendered through the shared
 * {@link WorkPageFrame}, so the glass command bar and the persistent right-rail
 * follow-chat can be screenshotted without auth.
 */
export function PreviewModuleClient() {
  return (
    <CampaignProvider value={DEMO_CONTEXT}>
      <AutomationsProvider>
        <ChatProvider initialAiConfigured={false} initialThreads={DEMO_THREADS}>
          <WorkspaceShell>
            <WorkPageFrame
              title="Assets"
              description="Create, review, and approve campaign content with AI."
              actions={
                <Button size="sm" variant="outline" render={<Link href="#" />}>
                  New asset
                </Button>
              }
            >
              <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {DEMO_ASSETS.map((asset) => (
                    <Card key={asset.title}>
                      <CardHeader>
                        <CardTitle className="text-base">
                          {asset.title}
                        </CardTitle>
                        <CardDescription>{asset.kind}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">{asset.body}</p>
                        <span
                          className={
                            asset.status === "Approved"
                              ? "badge-blue inline-flex rounded-full border px-2.5 py-0.5 text-xs"
                              : "badge-red inline-flex rounded-full border px-2.5 py-0.5 text-xs"
                          }
                        >
                          {asset.status}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </WorkPageFrame>
          </WorkspaceShell>
        </ChatProvider>
      </AutomationsProvider>
    </CampaignProvider>
  );
}

const DEMO_ASSETS = [
  {
    title: "Healthcare mailer",
    kind: "Direct mail",
    status: "In review",
    body: "Two-sided 8.5×11 mailer focused on lowering prescription costs.",
  },
  {
    title: "GOTV weekend post",
    kind: "Social — Instagram",
    status: "Approved",
    body: "Square graphic reminding supporters of early-vote locations.",
  },
  {
    title: "Volunteer recruitment",
    kind: "Social — Facebook",
    status: "In review",
    body: "Call for canvass volunteers ahead of the final field push.",
  },
  {
    title: "Endorsement announcement",
    kind: "Press",
    status: "Approved",
    body: "Statement template for the firefighters' union endorsement.",
  },
];
