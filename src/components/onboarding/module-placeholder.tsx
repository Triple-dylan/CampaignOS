import Link from "next/link";
import { ArrowRight, Construction } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  phase: number;
  ctaHref?: string;
  ctaLabel?: string;
};

export function ModulePlaceholder({
  title,
  description,
  phase,
  ctaHref,
  ctaLabel = "View module",
}: ModulePlaceholderProps) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
          <Construction className="size-5 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Phase {phase}
          </span>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This module is on the Phase {phase} roadmap. Core campaign
          infrastructure, auth, and onboarding are in place — module workflows
          will connect here in a later release.
        </p>
        {ctaHref ? (
          <Button variant="outline" size="sm" render={<Link href={ctaHref} />}>
            {ctaLabel}
            <ArrowRight data-icon="inline-end" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
