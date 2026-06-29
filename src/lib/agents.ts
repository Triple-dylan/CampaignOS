import {
  Megaphone,
  PenLine,
  PiggyBank,
  ScrollText,
  Telescope,
  type LucideIcon,
} from "lucide-react";
import type { AgentMode } from "@/actions/chat";

/**
 * Agent personas are modes of the same chat surface — not top-level pages.
 * They are surfaced through the composer's agent picker so the user can switch
 * who they're talking to without leaving the conversation. Keep this list in
 * sync with the personas defined server-side in {@link AgentMode}.
 */
export type AgentPersona = {
  id: AgentMode;
  label: string;
  blurb: string;
  icon: LucideIcon;
};

export const AGENT_PERSONAS: ReadonlyArray<AgentPersona> = [
  {
    id: "campaign-manager",
    label: "Campaign Manager",
    blurb: "Strategic chief of staff",
    icon: Megaphone,
  },
  {
    id: "content-strategist",
    label: "Content Strategist",
    blurb: "Messaging & copy direction",
    icon: PenLine,
  },
  {
    id: "researcher",
    label: "Researcher",
    blurb: "District intel & briefs",
    icon: Telescope,
  },
  {
    id: "fundraiser",
    label: "Fundraiser",
    blurb: "Donor pipeline & asks",
    icon: PiggyBank,
  },
  {
    id: "compliance-reviewer",
    label: "Compliance Reviewer",
    blurb: "Disclosure & recordkeeping",
    icon: ScrollText,
  },
];

export const AGENT_LABELS: Record<AgentMode, string> = AGENT_PERSONAS.reduce(
  (acc, persona) => {
    acc[persona.id] = persona.label;
    return acc;
  },
  {} as Record<AgentMode, string>,
);

export function agentPersona(mode: AgentMode): AgentPersona {
  return AGENT_PERSONAS.find((p) => p.id === mode) ?? AGENT_PERSONAS[0];
}
