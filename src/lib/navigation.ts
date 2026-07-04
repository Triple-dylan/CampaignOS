import {
  Brain,
  CalendarClock,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  PenLine,
  PiggyBank,
  ScrollText,
  Settings,
  ShieldCheck,
  SquareCheckBig,
  Telescope,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Flat primary navigation — one Cursor-like list of every real destination.
 * The former "Workflows" group (Planner, Tasks, Compliance, Command center)
 * is folded in so the rail carries a single scannable hierarchy: primary nav,
 * recent chats, a collapsible Agents section, and Settings pinned at bottom.
 */
export const primaryNav: ReadonlyArray<NavItem> = [
  { title: "Work desk", href: "/dashboard", icon: LayoutDashboard },
  { title: "Assets", href: "/assets", icon: FolderOpen },
  { title: "Research", href: "/research", icon: Lightbulb },
  { title: "Fundraising", href: "/fundraising", icon: PiggyBank },
  { title: "Knowledge graph", href: "/brain", icon: Brain },
  { title: "Planner", href: "/planner", icon: ClipboardList },
  { title: "Tasks", href: "/tasks", icon: SquareCheckBig },
  { title: "Compliance", href: "/compliance", icon: ShieldCheck },
  { title: "Command center", href: "/automations", icon: CalendarClock },
];

export const settingsNavItem: NavItem = {
  title: "Settings",
  href: "/settings",
  icon: Settings,
};

/** Agent consoles — each links to `/agents/[slug]`. */
export const agentsNav: ReadonlyArray<NavItem> = [
  { title: "Campaign Manager", href: "/agents/campaign-manager", icon: Megaphone },
  {
    title: "Content Strategist",
    href: "/agents/content-strategist",
    icon: PenLine,
  },
  { title: "Researcher", href: "/agents/researcher", icon: Telescope },
  { title: "Fundraiser", href: "/agents/fundraiser", icon: PiggyBank },
  {
    title: "Compliance Reviewer",
    href: "/agents/compliance-reviewer",
    icon: ScrollText,
  },
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
    title: "Command center",
    description:
      "Scheduled agent runs, planner summaries, compliance queue, and run history.",
    phase: 4,
  },
  settings: {
    title: "Settings",
    description: "Organization, team roles, integrations, and billing.",
    phase: 2,
  },
  agents: {
    title: "Agent consoles",
    description: "Dedicated surfaces for each campaign agent persona.",
    phase: 3,
  },
} as const;
