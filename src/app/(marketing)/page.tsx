import Link from "next/link";
import { ArrowRight, Flag } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/**
 * Dead-simple landing: logo, one line of copy, a single sign-in button.
 * No marketing hero, no feature grids, no chat bar. The product itself lives
 * behind sign-in.
 */
export default function LandingPage() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center px-6">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <span className="brand-mark flex size-12 items-center justify-center rounded-xl">
          <Flag className="size-6" aria-hidden />
        </span>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          CampaignOS
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your campaign’s knowledge graph and AI assistant, in one quiet
          workspace.
        </p>

        <Link
          href="/sign-in"
          className="mt-8 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          Sign in
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <p className="absolute bottom-5 text-xs text-muted-foreground/70">
        © {new Date().getFullYear()} CampaignOS
      </p>
    </main>
  );
}
