"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const WorkspaceGraphCanvasLazy = dynamic(
  () =>
    import("@/components/workspace/workspace-graph-canvas").then((module) => ({
      default: module.WorkspaceGraphCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2
          className="size-6 animate-spin text-muted-foreground"
          aria-hidden
        />
        <span className="sr-only">Loading knowledge graph…</span>
      </div>
    ),
  },
);
