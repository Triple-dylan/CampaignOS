export type CampaignWorkflowId =
  | "event-research"
  | "content-creation"
  | "content-calendar"
  | "campaign-structure"
  | "incumbent-research";

export type WorkflowEntryPoint = "chat" | "tab";

export type WorkflowOutputType =
  | "research_brief"
  | "asset"
  | "content_calendar"
  | "campaign_timeline";

export type WorkflowDestinationModule =
  | "research"
  | "assets"
  | "planner"
  | "tasks"
  | "brain";

export type WorkflowStep = {
  id: string;
  label: string;
  prompt?: string;
};

export type CampaignWorkflowDefinition = {
  id: CampaignWorkflowId;
  name: string;
  description: string;
  entryPoints: ReadonlyArray<WorkflowEntryPoint>;
  steps: ReadonlyArray<WorkflowStep>;
  outputType: WorkflowOutputType;
  destinationModule: WorkflowDestinationModule;
  harnessSkillId: string;
  requiredIntegrations: ReadonlyArray<string>;
};

export const campaignWorkflows = [
  {
    id: "event-research",
    name: "Event Research",
    description:
      "Turn an event intent or manual event parameters into a sourced research brief.",
    entryPoints: ["chat", "tab"],
    steps: [
      {
        id: "capture-intent",
        label: "Capture event intent",
        prompt: "What event are you preparing for?",
      },
      {
        id: "collect-details",
        label: "Collect date, location, and audience",
        prompt: "When is it, where is it, and who will be in the room?",
      },
      { id: "generate-report", label: "Generate event research report" },
      { id: "store-brief", label: "Store in Research" },
    ],
    outputType: "research_brief",
    destinationModule: "research",
    harnessSkillId: "research-brief",
    requiredIntegrations: ["OpenAI/Claude", "Google Calendar", "Gmail"],
  },
  {
    id: "content-creation",
    name: "Content Creation",
    description:
      "Generate campaign content drafts for review and store approved work in the asset library.",
    entryPoints: ["chat", "tab"],
    steps: [
      {
        id: "capture-need",
        label: "Capture event or content need",
        prompt: "What are we creating and where will it run?",
      },
      {
        id: "select-theme",
        label: "Collect theme and issue focus",
        prompt: "What theme, issue, or audience should shape this draft?",
      },
      { id: "generate-drafts", label: "Generate drafts" },
      { id: "approve-content", label: "Approve or reject content" },
      { id: "store-asset", label: "Store in asset library" },
    ],
    outputType: "asset",
    destinationModule: "assets",
    harnessSkillId: "asset-studio",
    requiredIntegrations: ["OpenAI/Claude", "Canva", "Higgsfield", "Gmail"],
  },
  {
    id: "content-calendar",
    name: "Content Calendar",
    description:
      "Generate a social/content calendar with scheduled content beats linked to the brain graph.",
    entryPoints: ["chat", "tab"],
    steps: [
      {
        id: "capture-period",
        label: "Capture calendar period",
        prompt: "What period should this content calendar cover?",
      },
      {
        id: "collect-channels",
        label: "Collect channels and cadence",
        prompt:
          "Which channels (Instagram, X, Facebook, email) and how often should we post?",
      },
      { id: "generate-slots", label: "Generate content calendar slots" },
      { id: "store-calendar", label: "Store in Planner and graph" },
    ],
    outputType: "content_calendar",
    destinationModule: "planner",
    harnessSkillId: "asset-studio",
    requiredIntegrations: ["OpenAI/Claude"],
  },
  {
    id: "campaign-structure",
    name: "Campaign Structure",
    description:
      "Convert district, segment, and issue strategy into a campaign timeline.",
    entryPoints: ["chat", "tab"],
    steps: [
      {
        id: "capture-district-segments",
        label: "Capture district and voter segments",
        prompt: "Which district and voter segments should this plan target?",
      },
      {
        id: "collect-issues",
        label: "Collect key issues",
        prompt: "Which issues matter most for these segments?",
      },
      { id: "generate-timeline", label: "Generate campaign timeline" },
      { id: "store-plan", label: "Store timeline in Planner and graph" },
    ],
    outputType: "campaign_timeline",
    destinationModule: "planner",
    harnessSkillId: "campaign-manager",
    requiredIntegrations: ["OpenAI/Claude", "Google Calendar"],
  },
  {
    id: "incumbent-research",
    name: "Incumbent Research",
    description:
      "Generate a comparison report for target candidates or incumbents.",
    entryPoints: ["chat", "tab"],
    steps: [
      {
        id: "capture-comparison",
        label: "Capture comparison request",
        prompt: "Which candidates or incumbents should be compared?",
      },
      {
        id: "collect-targets",
        label: "Confirm target candidates",
        prompt: "Confirm names, offices, and jurisdictions.",
      },
      { id: "aggregate-data", label: "Aggregate source data" },
      { id: "generate-comparison", label: "Generate comparison report" },
      { id: "store-brief", label: "Store in Research" },
    ],
    outputType: "research_brief",
    destinationModule: "research",
    harnessSkillId: "research-brief",
    requiredIntegrations: ["OpenAI/Claude", "Gmail"],
  },
] as const satisfies readonly CampaignWorkflowDefinition[];

export function getCampaignWorkflow(
  id: CampaignWorkflowId,
): CampaignWorkflowDefinition {
  const workflow = campaignWorkflows.find((item) => item.id === id);
  if (!workflow) {
    throw new Error(`Unknown campaign workflow: ${id}`);
  }
  return workflow;
}
