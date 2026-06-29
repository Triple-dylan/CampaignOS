"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { useCampaign } from "@/components/campaign/campaign-context";
import { useChat } from "@/components/chat/chat-provider";
import { useWorkspaceShell } from "@/components/layout/workspace-shell";
import { RailButton, RailLink, RailSectionLabel } from "@/components/layout/rail-item";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { clerkAppearance } from "@/lib/clerk/appearance";
import { campaignDisplayName } from "@/lib/db/schema";
import { navGroups } from "@/lib/navigation";

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

export function AppRail() {
  const router = useRouter();
  const { orgName, campaign } = useCampaign();
  const { closeRailMobile } = useWorkspaceShell();
  const { threads, activeThreadId, createThread, selectThread } = useChat();
  const isActive = useIsActive();

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
      <div className="flex items-center gap-2.5 px-3.5 py-3.5">
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

      {/* New chat (primary action) */}
      <div className="px-2.5 pb-2">
        <button
          type="button"
          onClick={handleNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-sm font-medium shadow-[var(--shadow-panel)] outline-hidden transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Plus className="size-4 text-brand-blue" aria-hidden />
          New chat
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2.5 pb-3 pt-1">
        {navGroups.map((group) => (
          <nav
            key={group.ariaLabel}
            aria-label={group.ariaLabel}
            className="flex flex-col gap-0.5"
          >
            {group.label ? (
              <RailSectionLabel>{group.label}</RailSectionLabel>
            ) : null}
            {group.items.map((item) => (
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
        ))}

        {/* Recent chats */}
        {threads.length > 0 ? (
          <section aria-label="Chats" className="flex flex-col gap-0.5">
            <RailSectionLabel>Chats</RailSectionLabel>
            {threads.slice(0, 8).map((thread) => (
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
      </div>

      {/* Org + user controls */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-2.5 py-2.5">
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
