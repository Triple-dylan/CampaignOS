"use client";

import { usePathname } from "next/navigation";
import { RailLink, RailSectionLabel } from "@/components/layout/rail-item";
import { appNavItems } from "@/lib/navigation";

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ModuleRailNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Modules" className="flex flex-col gap-0.5">
      <RailSectionLabel>Modules</RailSectionLabel>
      {appNavItems.map((item) => (
        <RailLink
          key={item.href}
          href={item.href}
          icon={<item.icon aria-hidden />}
          label={item.title}
          active={isNavItemActive(pathname, item.href)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
