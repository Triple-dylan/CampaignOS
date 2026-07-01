"use client";

import * as React from "react";
import { ChevronRight, MessageSquare, PanelLeft } from "lucide-react";
import { useCampaign } from "@/components/campaign/campaign-context";
import { useChat } from "@/components/chat/chat-provider";
import { MobileChatSheet } from "@/components/layout/mobile-chat-sheet";
import { useWorkspaceShell } from "@/components/layout/workspace-shell";
import { WorkspaceChatPanel } from "@/components/workspace/workspace-chat-panel";
import { useIsBelowLg } from "@/hooks/use-media-query";
import { campaignDisplayName } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type GlassCommandBarProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

/**
 * The glass command-bar header shared by every module page. Replaces the old
 * flat {@link AppHeader} so module pages match the immersive Work desk chrome.
 */
function GlassCommandBar({ title, description, actions }: GlassCommandBarProps) {
  const { orgName, campaign } = useCampaign();
  const { toggleRailMobile } = useWorkspaceShell();
  const { isChatRailOpen, setChatRailOpen } = useChat();
  const campaignName = campaign ? campaignDisplayName(campaign) : null;

  return (
    <header className="glass-bar flex shrink-0 items-center gap-3 rounded-xl px-3 py-2">
      <button
        type="button"
        onClick={toggleRailMobile}
        aria-label="Open navigation"
        className="-ml-1 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
      >
        <PanelLeft className="size-4" aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        {orgName || campaignName ? (
          <nav
            aria-label="Campaign breadcrumb"
            className="flex min-w-0 items-center gap-1 text-[0.7rem] leading-tight text-muted-foreground"
          >
            <span className="truncate">{orgName ?? "Workspace"}</span>
            {campaignName ? (
              <>
                <ChevronRight className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{campaignName}</span>
              </>
            ) : null}
          </nav>
        ) : null}
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-sm font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="hidden truncate text-xs text-muted-foreground md:block">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}

      <button
        type="button"
        onClick={() => setChatRailOpen(!isChatRailOpen)}
        aria-label={isChatRailOpen ? "Hide chat" : "Show chat"}
        aria-pressed={isChatRailOpen}
        className={cn(
          "flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent lg:hidden",
          isChatRailOpen ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <MessageSquare className="size-4" aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => setChatRailOpen(!isChatRailOpen)}
        aria-label={isChatRailOpen ? "Hide chat" : "Show chat"}
        aria-pressed={isChatRailOpen}
        className={cn(
          "hidden size-8 items-center justify-center rounded-md transition-colors hover:bg-accent lg:flex",
          isChatRailOpen ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <MessageSquare className="size-4" aria-hidden />
      </button>
    </header>
  );
}

type WorkPageFrameProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * The single shared frame for every dedicated module page: a glass command bar,
 * a scrolling content area, and the persistent right-rail chat that follows the
 * user across the app. Adopting this everywhere removes the old AppHeader /
 * module-page-shell split so there is one consistent page system.
 */
export function WorkPageFrame({
  title,
  description,
  actions,
  children,
}: WorkPageFrameProps) {
  const { isChatRailOpen, setChatRailOpen } = useChat();
  const isBelowLg = useIsBelowLg();

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 overflow-hidden p-2.5">
        <GlassCommandBar
          title={title}
          description={description}
          actions={actions}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </div>

      {isChatRailOpen && !isBelowLg ? <WorkspaceChatPanel /> : null}

      {isChatRailOpen && isBelowLg ? (
        <MobileChatSheet open={isChatRailOpen} onOpenChange={setChatRailOpen} />
      ) : null}

      {!isChatRailOpen && !isBelowLg ? (
        <button
          type="button"
          onClick={() => setChatRailOpen(true)}
          aria-label="Show chat"
          className="hidden w-10 shrink-0 items-start justify-center border-l border-border pt-3.5 text-muted-foreground transition-colors hover:text-foreground lg:flex"
        >
          <MessageSquare className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
