"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ExternalLink,
  FolderTree,
  MessageSquarePlus,
  Sparkles,
  Zap,
} from "lucide-react";
import { useChat } from "@/components/chat/chat-provider";
import { useCampaign } from "@/components/campaign/campaign-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AgentConsolePayload } from "@/actions/agents";
import type { AgentPersona } from "@/lib/agents";
import { CAMPAIGN_FOLDERS } from "@/lib/campaign-knowledge/folders";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import { campaignDisplayName } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type AgentConsoleProps = {
  agent: AgentPersona;
  consoleData: AgentConsolePayload;
};

function folderLabel(folderId: CampaignFolderId): string {
  return CAMPAIGN_FOLDERS.find((folder) => folder.id === folderId)?.label ?? folderId;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function profileSnippet(
  agent: AgentPersona,
  profile: ReturnType<typeof useCampaign>["profile"],
  campaign: ReturnType<typeof useCampaign>["campaign"],
): Array<{ label: string; value: string }> {
  if (!profile && !campaign) return [];

  const rows: Array<{ label: string; value: string }> = [];

  if (campaign) {
    rows.push({
      label: "Campaign",
      value: campaignDisplayName(campaign),
    });
  }

  for (const field of agent.contextPanel.profileFields) {
    if (field === "summary" && profile?.summary?.trim()) {
      rows.push({ label: "Summary", value: profile.summary.trim() });
    }
    if (field === "top_issues" && profile?.top_issues?.length) {
      rows.push({
        label: "Top issues",
        value: profile.top_issues.join(" · "),
      });
    }
    if (field === "message_framework" && profile?.message_framework) {
      const mf = profile.message_framework;
      const parts = [
        mf.valueProposition,
        ...(mf.keyMessages ?? []),
        mf.toneGuidance,
      ].filter(Boolean);
      if (parts.length) {
        rows.push({ label: "Message framework", value: parts.join(" · ") });
      }
    }
    if (field === "fundraising_goal" && profile?.fundraising_goal != null) {
      rows.push({
        label: "Fundraising goal",
        value: new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(profile.fundraising_goal),
      });
    }
    if (field === "opponent_names" && profile?.opponent_names?.length) {
      rows.push({
        label: "Opponents",
        value: profile.opponent_names.join(", "),
      });
    }
  }

  return rows;
}

export function AgentConsole({ agent, consoleData }: AgentConsoleProps) {
  const { profile, campaign } = useCampaign();
  const { setAgentOverride, setChatRailOpen, sendMessage, createThread } = useChat();

  const contextRows = profileSnippet(agent, profile, campaign);
  const Icon = agent.icon;
  const skill = consoleData.defaultSkill;

  async function startChat(prompt?: string) {
    setAgentOverride(agent.id);
    setChatRailOpen(true);
    createThread();
    if (prompt?.trim()) {
      // Pass the agent explicitly — state set above lands on the next render.
      await sendMessage(prompt.trim(), { agent: agent.id });
    }
  }

  return (
    <div className="flex flex-col gap-4 p-3 md:p-4">
      {/* Identity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-brand-blue [&_svg]:size-5">
                <Icon aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">{agent.label}</CardTitle>
                <CardDescription className="mt-1">{agent.purpose}</CardDescription>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => void startChat()}
              className="w-full shrink-0 sm:w-auto"
            >
              <MessageSquarePlus className="size-3.5" aria-hidden />
              Start chat
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Operating instructions
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {agent.operatingInstructions.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-brand-blue">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Boundaries
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {agent.boundaries.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-muted-foreground/50">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="size-4 text-brand-blue" aria-hidden />
              Quick actions
            </CardTitle>
            <CardDescription>
              Prefilled prompts and shortcuts into modules.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {agent.quickActions.map((action) => (
              <div
                key={action.id}
                className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium">{action.label}</span>
                <div className="flex shrink-0 items-center gap-1">
                  {action.moduleHref ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      render={<Link href={action.moduleHref} />}
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                      Open
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void startChat(action.prompt)}
                  >
                    Run
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Module links */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowRight className="size-4 text-brand-blue" aria-hidden />
              Module links
            </CardTitle>
            <CardDescription>
              Open the real module — consoles do not duplicate module UI.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {agent.moduleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent"
              >
                <span>
                  <span className="font-medium">{link.label}</span>
                  {link.description ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {link.description}
                    </span>
                  ) : null}
                </span>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Context / memory */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FolderTree className="size-4 text-brand-blue" aria-hidden />
              Context & memory
            </CardTitle>
            <CardDescription>
              Read-only campaign profile and graph folder summaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contextRows.length > 0 ? (
              <dl className="space-y-2">
                {contextRows.map((row) => (
                  <div key={row.label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="mt-0.5 text-sm leading-relaxed">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete onboarding to load campaign profile context.
              </p>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Graph folders
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {agent.contextPanel.graphFolders.map((folderId) => (
                  <span
                    key={folderId}
                    className="inline-flex items-center rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {folderLabel(folderId)}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default skill */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="size-4 text-brand-blue" aria-hidden />
              Default skill
            </CardTitle>
            <CardDescription>
              Loaded from harness <code className="text-xs">SKILL.md</code> frontmatter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {skill ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-brand-blue" aria-hidden />
                  <span className="text-sm font-medium">{skill.frontmatter.name}</span>
                  {skill.frontmatter.version ? (
                    <span className="text-xs text-muted-foreground">
                      v{skill.frontmatter.version}
                    </span>
                  ) : null}
                  {skill.frontmatter.mutating != null ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[0.625rem] font-medium uppercase",
                        skill.frontmatter.mutating
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      )}
                    >
                      {skill.frontmatter.mutating ? "mutating" : "read-only"}
                    </span>
                  ) : null}
                </div>
                {skill.frontmatter.description ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {skill.frontmatter.description}
                  </p>
                ) : null}
                {skill.frontmatter.triggers?.length ? (
                  <p className="text-xs text-muted-foreground">
                    Triggers: {skill.frontmatter.triggers.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Skill playbook not found for {agent.defaultSkillId}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Saved runs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="size-4 text-brand-blue" aria-hidden />
              Saved runs
            </CardTitle>
            <CardDescription>
              Scheduled automations for this agent (read-only).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {consoleData.schedules.length > 0 ? (
              <ul className="space-y-2">
                {consoleData.schedules.map((schedule) => (
                  <li
                    key={schedule.id}
                    className="rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{schedule.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {schedule.schedule_type}
                      {schedule.enabled ? " · enabled" : " · paused"}
                      {schedule.last_run_at
                        ? ` · last run ${formatTimestamp(schedule.last_run_at)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No scheduled runs for this agent yet.{" "}
                <Link href="/automations" className="text-brand-blue hover:underline">
                  Create one in Automations
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent outputs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent outputs</CardTitle>
            <CardDescription>
              Generation logs and workflow runs for this agent (read-only).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {consoleData.recentLogs.length > 0 || consoleData.runs.length > 0 ? (
              <ul className="space-y-2">
                {consoleData.runs.map((run) => (
                  <li
                    key={run.id}
                    className="rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">Workflow run · {run.status}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {run.output_text?.trim() ||
                        run.prompt_snapshot?.trim() ||
                        "No output recorded"}
                    </p>
                    {run.created_at ? (
                      <p className="mt-1 text-[0.65rem] text-muted-foreground/80">
                        {formatTimestamp(run.created_at)}
                      </p>
                    ) : null}
                  </li>
                ))}
                {consoleData.recentLogs.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{log.module}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {log.outputText?.trim() || log.prompt?.trim() || "No output"}
                    </p>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground/80">
                      {formatTimestamp(log.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No generation logs yet. Start a chat or run a module action to see
                outputs here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
