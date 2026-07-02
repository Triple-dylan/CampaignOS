"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type ResponsiveActionGroupProps = {
  primary: React.ReactNode;
  overflow?: React.ReactNode;
  overflowLabel?: string;
  className?: string;
};

/**
 * Keeps primary actions visible on mobile and tucks secondary actions into a
 * bottom sheet overflow menu.
 */
export function ResponsiveActionGroup({
  primary,
  overflow,
  overflowLabel = "More actions",
  className,
}: ResponsiveActionGroupProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {primary}
      {overflow ? (
        isMobile ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={overflowLabel}
              onClick={() => setOpen(true)}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetContent side="bottom" className="gap-4 pb-safe">
                <SheetHeader>
                  <SheetTitle>{overflowLabel}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 [&_button]:justify-start">
                  {overflow}
                </div>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          overflow
        )
      ) : null}
    </div>
  );
}
