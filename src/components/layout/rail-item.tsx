"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type RailItemBaseProps = {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  active?: boolean;
  badge?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
};

const railItemClass = (active?: boolean, disabled?: boolean) =>
  cn(
    "glass-hover group/rail-item flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-hidden transition-colors",
    "focus-visible:ring-2 focus-visible:ring-ring/50",
    active
      ? "rail-active font-medium"
      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
    disabled && "cursor-not-allowed opacity-55 hover:bg-transparent hover:text-muted-foreground",
  );

function RailItemContent({
  icon,
  label,
  description,
  badge,
  trailing,
}: Pick<RailItemBaseProps, "icon" | "label" | "description" | "badge" | "trailing">) {
  return (
    <>
      {icon ? (
        <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate leading-tight">{label}</span>
        {description ? (
          <span className="truncate text-xs leading-tight text-muted-foreground/80">
            {description}
          </span>
        ) : null}
      </span>
      {badge ? <span className="shrink-0">{badge}</span> : null}
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </>
  );
}

type RailLinkProps = RailItemBaseProps & {
  href: string;
  onNavigate?: () => void;
};

export function RailLink({
  href,
  onNavigate,
  className,
  active,
  icon,
  label,
  description,
  badge,
  trailing,
}: RailLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(railItemClass(active), className)}
    >
      <RailItemContent
        icon={icon}
        label={label}
        description={description}
        badge={badge}
        trailing={trailing}
      />
    </Link>
  );
}

type RailButtonProps = RailItemBaseProps & {
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
};

export function RailButton({
  className,
  active,
  disabled,
  onClick,
  title,
  icon,
  label,
  description,
  badge,
  trailing,
}: RailButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-disabled={disabled}
      className={cn(railItemClass(active, disabled), className)}
    >
      <RailItemContent
        icon={icon}
        label={label}
        description={description}
        badge={badge}
        trailing={trailing}
      />
    </button>
  );
}

export function RailBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/60 bg-background/50 px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RailSectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-2 pb-1">
      <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground/70">
        {children}
      </span>
      {action ? <span className="shrink-0">{action}</span> : null}
    </div>
  );
}
