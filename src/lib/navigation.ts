import {
  Brain,
  CalendarClock,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  Lightbulb,
  PiggyBank,
  Settings,
  ShieldCheck,
  SquareCheckBig,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  /** Section heading shown in the rail. Empty string renders no label. */
  label: string;
  ariaLabel: string;
  items: ReadonlyArray<NavItem>;
};

/**
 * Flat primary navigation. Every entry is a real destination — no agent
 * personas (those live in the composer picker) and no fake Work/Agents split.
 * Planner, Tasks, Compliance and Automations are grouped together under
 * "Workflows" so the operational tooling lives in one place.
 */
export const primaryNav: ReadonlyArray<NavItem> = [
  { title: "Work desk", href: "/dashboard", icon: LayoutDashboard },
  { title: "Assets", href: "/assets", icon: FolderOpen },
  { title: "Research", href: "/research", icon: Lightbulb },
  { title: "Fundraising", href: "/fundraising", icon: PiggyBank },
  { title: "Knowledge graph", href: "/brain", icon: Brain },
];

export const workflowsNav: ReadonlyArray<NavItem> = [
  { title: "Planner", href: "/planner", icon: ClipboardList },
  { title: "Tasks", href: "/tasks", icon: SquareCheckBig },
  { title: "Compliance", href: "/compliance", icon: ShieldCheck },
  { title: "Automations", href: "/automations", icon: CalendarClock },
];

export const customizeNav: ReadonlyArray<NavItem> = [
  { title: "Settings", href: "/settings", icon: Settings },
];

export const navGroups: ReadonlyArray<NavGroup> = [
  { label: "", ariaLabel: "Primary", items: primaryNav },
  { label: "Workflows", ariaLabel: "Workflows", items: workflowsNav },
  { label: "Customize", ariaLabel: "Customize", items: customizeNav },
];

export const modulePages = {
  dashboard: {
    title: "Work desk",
    description: "Campaign overview, knowledge graph, and your daily chat.",
    phase: 2,
  },
  onboarding: {
    title: "Onboarding",
    description: "Set up your campaign workspace and team.",
    phase: 4,
  },
  assets: {
    title: "Assets",
    description: "Create, review, and approve campaign content with AI.",
    phase: 3,
  },
  planner: {
    title: "Planner",
    description: "Plan field programs, events, and voter contact goals.",
    phase: 4,
  },
  research: {
    title: "Research",
    description: "Opposition research, district intel, and message testing.",
    phase: 5,
  },
  fundraising: {
    title: "Fundraising",
    description: "Donor pipelines, call time, and compliance-ready reporting.",
    phase: 6,
  },
  tasks: {
    title: "Tasks",
    description: "Team task management tied to campaign milestones.",
    phase: 4,
  },
  brain: {
    title: "Knowledge graph",
    description: "Interactive map of your campaign strategy and modules.",
    phase: 8,
  },
  compliance: {
    title: "Compliance",
    description: "Content review queue, flags, and compliance recordkeeping.",
    phase: 7,
  },
  automations: {
    title: "Automations",
    description:
      "Recurring agent workflows — weekly plans, compliance checks, and outreach drafts.",
    phase: 4,
  },
  settings: {
    title: "Settings",
    description: "Organization, team roles, integrations, and billing.",
    phase: 2,
  },
} as const;
