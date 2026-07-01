"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GraphNodeTypeBadge } from "@/components/brain/graph-node-badge";
import { getSourceObjectLink } from "@/lib/graph/source-links";
import type { CampaignGraphNodeData } from "@/lib/graph/to-react-flow";

type NodeDetailSheetProps = {
  node: CampaignGraphNodeData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NodeDetailSheet({
  node,
  open,
  onOpenChange,
}: NodeDetailSheetProps) {
  const sourceLink = node
    ? getSourceObjectLink({
        sourceObjectType: node.sourceObjectType,
        sourceObjectId: node.sourceObjectId,
      })
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        {node ? (
          <>
            <SheetHeader>
              <SheetTitle>{node.title}</SheetTitle>
              <SheetDescription>
                <GraphNodeTypeBadge nodeType={node.nodeType} className="mt-1" />
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
              {node.summary?.trim() ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Summary
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
                    {node.summary}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No summary for this node.
                </p>
              )}
              {node.sourceObjectType ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Source
                  </p>
                  <p className="mt-1 text-sm capitalize">
                    {node.sourceObjectType.replace(/_/g, " ")}
                  </p>
                </div>
              ) : null}
              {node.folder || node.knowledgePath ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Knowledge
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {node.knowledgePath ?? `${node.folder}/`}
                  </p>
                  {node.knowledgeKind ? (
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      {node.knowledgeKind.replace(/_/g, " ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {sourceLink ? (
              <SheetFooter>
                <Button render={<Link href={sourceLink.href} />}>
                  {sourceLink.label}
                  <ArrowRight data-icon="inline-end" className="size-3.5" />
                </Button>
              </SheetFooter>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
