"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, MessageSquare, Plus } from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { useCampaign } from "@/components/campaign/campaign-context";
import { useChat } from "@/components/chat/chat-provider";
import { useWorkspaceShell } from "@/components/layout/workspace-shell";
import { RailButton, RailLink, RailSectionLabel } from "@/components/layout/rail-item";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { clerkAppearance } from "@/lib/clerk/appearance";
import { campaignDisplayName } from "@/lib/db/schema";
import { agentsNav, primaryNav, settingsNavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const AGENTS_EXPANDED_KEY = "campaignos.rail.agents-expanded";

function useIsActive() {
  const pathname = usePathname();
  return React.useCallback(
    (href: string) => {
      if (href === "/dashboard") return pathname === "/dashboard";
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  );
}

/**
 * Agents section expand state, collapsed by default and persisted in
 * localStorage. Exposed through useSyncExternalStore so SSR markup stays
 * deterministic (collapsed) and every rail instance stays in sync.
 */
let agentsExpandedListeners: Array<() => void> = [];

function readAgentsExpanded(): boolean {
  return window.localStorage.getItem(AGENTS_EXPANDED_KEY) === "1";
}

function subscribeAgentsExpanded(listener: () => void): () => void {
  agentsExpandedListeners.push(listener);
  return () => {
    agentsExpandedListeners = agentsExpandedListeners.filter(
      (l) => l !== listener,
    );
  };
}

function useAgentsExpanded(): [boolean, () => void] {
  const expanded = React.useSyncExternalStore(
    subscribeAgentsExpanded,
    readAgentsExpanded,
    () => false,
  );

  const toggle = React.useCallback(() => {
    window.localStorage.setItem(
      AGENTS_EXPANDED_KEY,
      readAgentsExpanded() ? "0" : "1",
    );
    agentsExpandedListeners.forEach((listener) => listener());
  }, []);

  return [expanded, toggle];
}

export function AppRail() {
  const router = useRouter();
  const pathname = usePathname();
  const { orgName, campaign } = useCampaign();
  const { closeRailMobile } = useWorkspaceShell();
  const { threads, activeThreadId, createThread, selectThread } = useChat();
  const isActive = useIsActive();
  const [agentsExpandedStored, toggleAgents] = useAgentsExpanded();
  // Always show the section while the user is inside an agent console.
  const agentsExpanded = agentsExpandedStored || pathname.startsWith("/agents/");

  const candidateName = campaign
    ? campaignDisplayName(campaign)
    : "Campaign workspace";

  function goWorkspace() {
    closeRailMobile();
    router.push("/dashboard");
  }

  function handleNewChat() {
    createThread();
    goWorkspace();
  }

  function handleSelectThread(id: string) {
    selectThread(id);
    goWorkspace();
  }

  return (
    <div className="flex h-full w-full flex-col bg-transparent">
      {/* Brand / campaign context */}
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <Link
          href="/dashboard"
          onClick={closeRailMobile}
          className="flex min-w-0 items-center gap-2.5 outline-hidden"
        >
          <span className="brand-mark flex size-7 shrink-0 items-center justify-center rounded-lg text-[0.8rem] font-semibold">
            C
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[0.8rem] font-semibold leading-tight">
              CampaignOS
            </span>
            <span className="truncate text-[0.7rem] leading-tight text-muted-foreground">
              {candidateName}
            </span>
          </span>
        </Link>
      </div>

      {/* New chat (primary action) — slim, Cursor-like */}
      <div className="px-2.5 pb-2">
        <button
          type="button"
          onClick={handleNewChat}
          className="flex h-8 w-full items-center gap-2 rounded-lg border border-border/70 bg-card/80 px-2.5 text-[0.8rem] font-medium outline-hidden transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/25"
        >
          <Plus className="size-3.5 text-brand-blue" aria-hidden />
          New chat
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2.5 pb-2 pt-0.5">
        {/* Primary destinations — one flat list, Workflows folded in. */}
        <nav aria-label="Primary" className="flex flex-col gap-px">
          {primaryNav.map((item) => (
            <RailLink
              key={item.href}
              href={item.href}
              icon={<item.icon aria-hidden />}
              label={item.title}
              active={isActive(item.href)}
              onNavigate={closeRailMobile}
            />
          ))}
        </nav>

        {/* Recent chats */}
        {threads.length > 0 ? (
          <section aria-label="Chats" className="flex flex-col gap-px">
            <RailSectionLabel>Chats</RailSectionLabel>
            {threads.slice(0, 5).map((thread) => (
              <RailButton
                key={thread.id}
                icon={<MessageSquare aria-hidden />}
                label={thread.title}
                active={thread.id === activeThreadId}
                onClick={() => handleSelectThread(thread.id)}
              />
            ))}
          </section>
        ) : null}

        {/* Agents — collapsible, collapsed by default. */}
        <nav aria-label="Agents" className="flex flex-col gap-px">
          <button
            type="button"
            onClick={toggleAgents}
            aria-expanded={agentsExpanded}
            className="flex items-center gap-1 px-2 pb-1 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground/70 outline-hidden hover:text-muted-foreground"
          >
            <ChevronDown
              className={cn(
                "size-3 shrink-0 transition-transform",
                !agentsExpanded && "-rotate-90",
              )}
              aria-hidden
            />
            Agents
          </button>
          {agentsExpanded
            ? agentsNav.map((item) => (
                <RailLink
                  key={item.href}
                  href={item.href}
                  icon={<item.icon aria-hidden />}
                  label={item.title}
                  active={isActive(item.href)}
                  onNavigate={closeRailMobile}
                />
              ))
            : null}
        </nav>
      </div>

      {/* Settings pinned above the org/user footer. */}
      <div className="px-2.5 pb-1.5">
        <RailLink
          href={settingsNavItem.href}
          icon={<settingsNavItem.icon aria-hidden />}
          label={settingsNavItem.title}
          active={isActive(settingsNavItem.href)}
          onNavigate={closeRailMobile}
        />
      </div>

      {/* Org + user controls */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <OrganizationSwitcher
            appearance={clerkAppearance}
            hidePersonal
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
          />
          {orgName ? <span className="sr-only">{orgName}</span> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <UserButton appearance={clerkAppearance} />
        </div>
      </div>
    </div>
  );
}
