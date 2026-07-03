"use client";

import { useChat } from "@/components/chat/chat-provider";
import { WorkspaceChatContent } from "@/components/workspace/workspace-chat-content";

/**
 * The persistent right-rail chat. It renders the SAME chat state as the Work
 * desk composer (via {@link useChat}), so the conversation follows the user as
 * they move onto dedicated module pages. Collapsible; its open state is held in
 * the chat provider so it persists across navigation.
 */
export function WorkspaceChatPanel() {
  const { setChatRailOpen } = useChat();

  return (
    <aside className="glass-frost hidden w-[19rem] shrink-0 flex-col md:flex lg:w-[22rem]">
      <WorkspaceChatContent onClose={() => setChatRailOpen(false)} />
    </aside>
  );
}
