"use client";

import { useRouter } from "next/navigation";
import {
  Megaphone,
  PenLine,
  PiggyBank,
  ScrollText,
  Telescope,
  type LucideIcon,
} from "lucide-react";
import { RailButton, RailSectionLabel } from "@/components/layout/rail-item";
import { useChat } from "@/components/chat/chat-provider";
import { useWorkspaceShell } from "@/components/layout/workspace-shell";
import type { AgentMode } from "@/actions/chat";

const AGENT_MODES: ReadonlyArray<{
  id: AgentMode;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "campaign-manager", label: "Campaign Manager", icon: Megaphone },
  { id: "content-strategist", label: "Content Strategist", icon: PenLine },
  { id: "researcher", label: "Researcher", icon: Telescope },
  { id: "fundraiser", label: "Fundraiser", icon: PiggyBank },
  { id: "compliance-reviewer", label: "Compliance Reviewer", icon: ScrollText },
];

export function AgentRailSection() {
  const router = useRouter();
  const { agentMode, setAgentMode } = useChat();
  const { closeRailMobile } = useWorkspaceShell();

  function handleSelect(id: AgentMode) {
    setAgentMode(id);
    closeRailMobile();
    router.push("/dashboard");
  }

  return (
    <section className="flex flex-col gap-0.5">
      <RailSectionLabel>Agents</RailSectionLabel>
      {AGENT_MODES.map((agent) => (
        <RailButton
          key={agent.id}
          icon={<agent.icon aria-hidden />}
          label={agent.label}
          active={agent.id === agentMode}
          title={`Chat as the ${agent.label}`}
          onClick={() => handleSelect(agent.id)}
        />
      ))}
    </section>
  );
}
