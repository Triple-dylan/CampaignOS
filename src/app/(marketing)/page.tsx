import Link from "next/link";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Brain,
  ClipboardCheck,
  Flag,
  PiggyBank,
  Shield,
  Users,
} from "lucide-react";

const features = [
  {
    title: "Unified campaign workspace",
    description:
      "Replace scattered spreadsheets and group chats with one source of truth for your team.",
    icon: Flag,
  },
  {
    title: "Field & voter contact",
    description:
      "Plan canvasses, phone banks, and events with clear ownership and measurable goals.",
    icon: Users,
  },
  {
    title: "Fundraising pipeline",
    description:
      "Track donors, call time, and goals with compliance-ready workflows built in.",
    icon: PiggyBank,
  },
  {
    title: "Research & messaging",
    description:
      "Centralize opposition research, district intel, and approved talking points.",
    icon: Brain,
  },
  {
    title: "Task coordination",
    description:
      "Assign work across departments with visibility into what ships before election day.",
    icon: ClipboardCheck,
  },
  {
    title: "Compliance guardrails",
    description:
      "Keep disclaimers, filings, and audit trails close to the work — not buried in email.",
    icon: Shield,
  },
];

export default function MarketingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
            <div className="space-y-6">
              <p className="badge-red inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider backdrop-blur-sm">
                The AI operating system for campaigns
              </p>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Run your campaign like a modern operation
              </h1>
              <p className="text-lg text-muted-foreground">
                Chat with your campaign and watch a living knowledge graph grow —
                strategy, field, fundraising, research, and compliance in one
                workspace, with AI agents in the center.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/sign-up">
                  <Button size="lg">Start your workspace</Button>
                </Link>
                <Link href="/sign-in">
                  <Button size="lg" variant="outline">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>
            <Card className="glass-card glass-hover">
              <CardHeader>
                <CardTitle>Campaign command center</CardTitle>
                <CardDescription>
                  A central canvas where chat and your knowledge graph live
                  together.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="relative overflow-hidden rounded-lg border bg-muted/20 p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border border-violet-400/60 bg-violet-100/60 px-2 py-1 text-xs font-medium text-violet-900 dark:bg-violet-950/50 dark:text-violet-200">
                      Candidate
                    </span>
                    <span className="rounded-md border border-blue-400/60 bg-blue-100/60 px-2 py-1 text-xs font-medium text-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
                      Housing
                    </span>
                    <span className="rounded-md border border-cyan-400/60 bg-cyan-100/60 px-2 py-1 text-xs font-medium text-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-200">
                      Young families
                    </span>
                    <span className="rounded-md border border-emerald-400/60 bg-emerald-100/60 px-2 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                      Launch email
                    </span>
                    <span className="rounded-md border border-amber-400/60 bg-amber-100/60 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                      Town hall
                    </span>
                  </div>
                  <p className="mt-3 text-xs">
                    Every asset, event, and brief becomes a connected node.
                  </p>
                </div>
                <div className="glass-card flex items-center gap-2 rounded-2xl p-2">
                  <span className="flex-1 px-2 py-1.5 text-sm">
                    What should we prioritize this week?
                  </span>
                  <span className="brand-mark flex size-7 items-center justify-center rounded-xl text-white">
                    <Flag className="size-3.5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything your team needs on the trail
            </h2>
            <p className="mt-3 text-muted-foreground">
              CampaignOS is designed around how real campaigns operate — fast
              cycles, tight budgets, and zero margin for miscommunication.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="glass-hover h-full">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                    <feature.icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Ready to organize your campaign?
              </h2>
              <p className="mt-2 text-muted-foreground">
                Create your workspace, invite your team, and start organizing
                your campaign today.
              </p>
            </div>
            <Link href="/sign-up">
              <Button size="lg">Create your workspace</Button>
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CampaignOS. All rights reserved.
      </footer>
    </div>
  );
}
