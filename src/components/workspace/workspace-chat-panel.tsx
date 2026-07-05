"use client";

import { useChat } from "@/components/chat/chat-provider";
import { WorkspaceChatContent } from "@/components/workspace/workspace-chat-content";
import { cn } from "@/lib/utils";

/**
 * The persistent right-rail chat. It renders the SAME chat state as the Work
 * desk composer (via {@link useChat}), so the conversation follows the user as
 * they move onto dedicated module pages. Collapsible; its open state is held in
 * the chat provider so it persists across navigation.
 */
export function WorkspaceChatPanel({ open = true }: { open?: boolean }) {
  const { setChatRailOpen } = useChat();

  return (
    <aside
      inert={!open}
      aria-hidden={!open}
      className={cn(
        "glass-frost motion-panel hidden shrink-0 flex-col overflow-hidden md:flex",
        open
          ? "w-[19rem] lg:w-[22rem]"
          : "w-0 border-transparent opacity-0 shadow-none",
      )}
    >
      {/* Fixed-width inner column so content doesn't squish while animating. */}
      <div className="flex h-full w-[19rem] min-h-0 flex-col lg:w-[22rem]">
        <WorkspaceChatContent onClose={() => setChatRailOpen(false)} />
      </div>
    </aside>
  );
}
