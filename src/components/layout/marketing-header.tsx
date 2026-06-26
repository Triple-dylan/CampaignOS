import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Flag } from "lucide-react";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="brand-mark flex size-8 items-center justify-center rounded-lg text-white">
            <Flag className="size-4" />
          </div>
          CampaignOS
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Show when="signed-out">
            <Link href="/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get started</Button>
            </Link>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard">
              <Button>Go to dashboard</Button>
            </Link>
          </Show>
        </nav>
      </div>
    </header>
  );
}
