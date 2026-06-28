import Link from "next/link";
import { Flag } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <div className="absolute left-5 top-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold outline-hidden"
        >
          <span className="brand-mark flex size-7 items-center justify-center rounded-lg">
            <Flag className="size-3.5" aria-hidden />
          </span>
          CampaignOS
        </Link>
      </div>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
