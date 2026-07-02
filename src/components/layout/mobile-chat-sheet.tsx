"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WorkspaceChatContent } from "@/components/workspace/workspace-chat-content";

type MobileChatSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Full-height chat sheet for viewports below the desktop chat rail breakpoint.
 */
export function MobileChatSheet({ open, onOpenChange }: MobileChatSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="glass-frost w-full max-w-md gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Campaign chat</SheetTitle>
          <SheetDescription>
            Ask the campaign copilot about this page or anything across the
            campaign.
          </SheetDescription>
        </SheetHeader>
        <WorkspaceChatContent onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
