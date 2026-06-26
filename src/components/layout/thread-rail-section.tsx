"use client";

import { useRouter } from "next/navigation";
import { MessageSquareText, Plus } from "lucide-react";
import { RailButton, RailSectionLabel } from "@/components/layout/rail-item";
import { useChat } from "@/components/chat/chat-provider";
import { useWorkspaceShell } from "@/components/layout/workspace-shell";

export function ThreadRailSection() {
  const router = useRouter();
  const { threads, activeThreadId, createThread, selectThread } = useChat();
  const { closeRailMobile } = useWorkspaceShell();

  function goToWorkspace() {
    closeRailMobile();
    router.push("/dashboard");
  }

  function handleNewThread() {
    createThread();
    goToWorkspace();
  }

  function handleSelect(id: string) {
    selectThread(id);
    goToWorkspace();
  }

  return (
    <section className="flex flex-col gap-0.5">
      <RailSectionLabel
        action={
          <button
            type="button"
            onClick={handleNewThread}
            title="Start a new chat thread"
            className="glass-hover flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-primary outline-hidden transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Plus className="size-3" aria-hidden />
            New
          </button>
        }
      >
        Threads
      </RailSectionLabel>
      {threads.length === 0 ? (
        <button
          type="button"
          onClick={handleNewThread}
          className="glass-hover mx-1 rounded-md border border-dashed border-border/70 px-2.5 py-2 text-left text-xs text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Start a chat to build your campaign map.
        </button>
      ) : (
        threads.map((thread) => (
          <RailButton
            key={thread.id}
            icon={<MessageSquareText aria-hidden />}
            label={thread.title}
            active={thread.id === activeThreadId}
            onClick={() => handleSelect(thread.id)}
          />
        ))
      )}
    </section>
  );
}
