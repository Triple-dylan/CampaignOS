import {
  Brain,
  CalendarClock,
  ClipboardCheck,
  FolderOpen,
  LayoutDashboard,
  Lightbulb,
  PiggyBank,
  Settings,
  ShieldCheck,
  SquareCheckBig,
} from "lucide-react";

/**
 * Left-rail grouping, modeled on the Cursor desktop app: work folders
 * (the "Repositories" analog), agents, automations, and customize.
 */
export const workFolders = [
  { title: "Workspace", href: "/dashboard", icon: LayoutDashboard },
  { title: "Knowledge graph", href: "/brain", icon: Brain },
  { title: "Assets", href: "/assets", icon: FolderOpen },
  { title: "Research", href: "/research", icon: Lightbulb },
  { title: "Fundraising", href: "/fundraising", icon: PiggyBank },
] as const;

export const automationItems = [
  { title: "Scheduled runs", href: "/automations", icon: CalendarClock },
  { title: "Planner", href: "/planner", icon: ClipboardCheck },
  { title: "Tasks", href: "/tasks", icon: SquareCheckBig },
  { title: "Compliance", href: "/compliance", icon: ShieldCheck },
] as const;

export const customizeItems = [
  { title: "Settings", href: "/settings", icon: Settings },
] as const;

export const appNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Assets",
    href: "/assets",
    icon: FolderOpen,
  },
  {
    title: "Planner",
    href: "/planner",
    icon: ClipboardCheck,
  },
  {
    title: "Research",
    href: "/research",
    icon: Lightbulb,
  },
  {
    title: "Fundraising",
    href: "/fundraising",
    icon: PiggyBank,
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: SquareCheckBig,
  },
  {
    title: "Brain",
    href: "/brain",
    icon: Brain,
  },
  {
    title: "Compliance",
    href: "/compliance",
    icon: ShieldCheck,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;

export const modulePages = {
  dashboard: {
    title: "Dashboard",
    description: "Campaign overview, key metrics, and daily priorities.",
    phase: 2,
  },
  onboarding: {
    title: "Onboarding",
    description: "Set up your campaign workspace and team.",
    phase: 4,
  },
  assets: {
    title: "Asset Studio",
    description: "Create, review, and approve campaign content with AI assistance.",
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
    title: "Brain",
    description: "Interactive knowledge graph of your campaign strategy and modules.",
    phase: 8,
  },
  compliance: {
    title: "Compliance",
    description: "Content review queue, flags, and compliance recordkeeping.",
    phase: 7,
  },
  automations: {
    title: "Scheduled runs",
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
