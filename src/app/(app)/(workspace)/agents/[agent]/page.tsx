import { notFound } from "next/navigation";
import { getAgentConsoleData } from "@/actions/agents";
import { AgentConsole } from "@/components/agents/agent-console";
import { WorkPageFrame } from "@/components/layout/work-page-frame";
import { getAgentBySlug, isAgentSlug } from "@/lib/agents";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type AgentPageProps = {
  params: Promise<{ agent: string }>;
};

export function generateStaticParams() {
  return [
    { agent: "campaign-manager" },
    { agent: "content-strategist" },
    { agent: "researcher" },
    { agent: "fundraiser" },
    { agent: "compliance-reviewer" },
  ];
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { agent: agentSlug } = await params;

  if (!isAgentSlug(agentSlug)) {
    notFound();
  }

  const agent = getAgentBySlug(agentSlug);
  if (!agent) {
    notFound();
  }

  const result = await getAgentConsoleData(agent.id, agent.defaultSkillId);

  if (!result.ok) {
    return (
      <WorkPageFrame title={agent.label} description={agent.blurb}>
        <div className="flex flex-1 flex-col gap-6 p-3 md:p-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent console unavailable</CardTitle>
              <CardDescription>{result.error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/onboarding" />}>
                Complete onboarding
              </Button>
            </CardContent>
          </Card>
        </div>
      </WorkPageFrame>
    );
  }

  return (
    <WorkPageFrame title={agent.label} description={agent.blurb}>
      <AgentConsole agent={agent} consoleData={result.data} />
    </WorkPageFrame>
  );
}
