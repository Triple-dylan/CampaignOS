"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  WorkspaceContextPanelContent,
  type WorkspaceContextPanelProps,
} from "@/components/workspace/workspace-context-panel";

type MobileContextSheetProps = WorkspaceContextPanelProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Full-height preview/context sheet for viewports below the desktop panel
 * breakpoint.
 */
export function MobileContextSheet({
  open,
  onOpenChange,
  ...panelProps
}: MobileContextSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="glass-frost w-full max-w-sm gap-0 p-0 sm:max-w-sm"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Campaign preview</SheetTitle>
          <SheetDescription>
            Campaign overview and selected knowledge graph node details.
          </SheetDescription>
        </SheetHeader>
        <WorkspaceContextPanelContent
          {...panelProps}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
