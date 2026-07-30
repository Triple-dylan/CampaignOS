"use client";

import * as React from "react";
import { ChevronRight, MessageSquare, PanelLeft } from "lucide-react";
import { useCampaign } from "@/components/campaign/campaign-context";
import { useChat } from "@/components/chat/chat-provider";
import { MobileChatSheet } from "@/components/layout/mobile-chat-sheet";
import { useWorkspaceShell } from "@/components/layout/workspace-shell";
import { WorkspaceChatPanel } from "@/components/workspace/workspace-chat-panel";
import { useOptionalGraphStage } from "@/components/workspace/graph-stage-provider";
import { useIsMobile } from "@/hooks/use-mobile";
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
    <header className="glass-bar glass-chrome-top sticky top-0 z-30 flex shrink-0 items-center gap-3 rounded-none border-x-0 border-t-0 border-b-0 px-3 py-2 md:px-4">
      <button
        type="button"
        onClick={toggleRailMobile}
        aria-label="Open navigation"
        className="-ml-1 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:hidden"
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
          "flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent",
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
  /**
   * When true, the frame locks height and lets the child manage scrolling
   * (e.g. Asset Studio's collection rail + content pane). Default keeps the
   * shared sticky command-bar scroll container used by most module pages.
   */
  fill?: boolean;
  children: React.ReactNode;
};

/**
 * Module working surface: a frosted right panel over the persistent graph stage.
 * The left of the stage stays interactive so camera travel remains visible.
 */
export function WorkPageFrame({
  title,
  description,
  actions,
  fill = false,
  children,
}: WorkPageFrameProps) {
  const { isChatRailOpen, setChatRailOpen } = useChat();
  const isBelowMd = useIsMobile();
  const graphStage = useOptionalGraphStage();
  const overGraph = Boolean(graphStage?.active);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 overflow-hidden",
        overGraph && "pointer-events-none",
      )}
    >
      {/* Transparent stage — graph remains visible / interactive on desktop. */}
      {overGraph ? (
        <div className="relative hidden min-w-0 flex-1 md:block" aria-hidden />
      ) : null}

      {/* Doc / working view */}
      <div
        className={cn(
          "pointer-events-auto relative z-20 flex min-h-0 min-w-0 flex-col",
          overGraph
            ? "glass-frost work-panel w-full md:w-[min(52vw,42rem)] md:border-l md:shadow-[var(--glass-shadow-pop)]"
            : "flex-1",
          fill ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        <GlassCommandBar
          title={title}
          description={description}
          actions={actions}
        />
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col bg-background/40",
            fill && "overflow-hidden",
          )}
        >
          {children}
        </div>
      </div>

      {/* Follow-along chat — sits beside the working panel when open. */}
      {!isBelowMd ? (
        <div className="pointer-events-auto relative z-20">
          <WorkspaceChatPanel open={isChatRailOpen} />
        </div>
      ) : null}

      {isChatRailOpen && isBelowMd ? (
        <MobileChatSheet open={isChatRailOpen} onOpenChange={setChatRailOpen} />
      ) : null}
    </div>
  );
}
