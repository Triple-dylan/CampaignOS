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
        <section className="border-b bg-linear-to-b from-muted/40 to-background">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
            <div className="space-y-6">
              <p className="text-sm font-medium uppercase tracking-wider text-primary">
                Built for campaign teams
              </p>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Run your campaign like a modern operation
              </h1>
              <p className="text-lg text-muted-foreground">
                CampaignOS brings strategy, field, fundraising, research, and
                compliance into a single workspace — so your team moves faster
                with fewer dropped balls.
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
            <Card className="border-primary/10 shadow-lg">
              <CardHeader>
                <CardTitle>Campaign command center</CardTitle>
                <CardDescription>
                  Your campaign command center — strategy, field, and fundraising
                  in one place.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="font-medium text-foreground">Today&apos;s focus</p>
                  <ul className="mt-2 space-y-1">
                    <li>• 120 doors in Ward 3</li>
                    <li>• Fundraising call block — 2:00 PM</li>
                    <li>• Digital ad creative review</li>
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase text-muted-foreground">
                      Field goal
                    </p>
                    <p className="text-2xl font-semibold text-foreground">68%</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase text-muted-foreground">
                      Raised QTD
                    </p>
                    <p className="text-2xl font-semibold text-foreground">
                      $42k
                    </p>
                  </div>
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
              <Card key={feature.title} className="h-full">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
