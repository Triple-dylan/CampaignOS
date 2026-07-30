"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppRail } from "@/components/layout/app-rail";
import { ComplianceDisclaimer } from "@/components/layout/compliance-disclaimer";
import { GraphStageProvider } from "@/components/workspace/graph-stage-provider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { isWorkingPanelRoute } from "@/lib/navigation/route-graph-folders";
import { cn } from "@/lib/utils";

type WorkspaceShellContextValue = {
  isRailOpenMobile: boolean;
  setRailOpenMobile: (open: boolean) => void;
  toggleRailMobile: () => void;
  closeRailMobile: () => void;
};

const WorkspaceShellContext =
  React.createContext<WorkspaceShellContextValue | null>(null);

export function useWorkspaceShell(): WorkspaceShellContextValue {
  const context = React.useContext(WorkspaceShellContext);

  if (!context) {
    throw new Error("useWorkspaceShell must be used within a WorkspaceShell.");
  }

  return context;
}

/**
 * App chrome: persistent graph stage + floating feature controls.
 *
 * The knowledge graph is the world. Navigation features float over it; module
 * pages render as a right working panel. Mobile keeps a Sheet for features.
 */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isRailOpenMobile, setRailOpenMobile] = React.useState(false);
  const [lastPathname, setLastPathname] = React.useState(pathname);
  const workingPanel = isWorkingPanelRoute(pathname);

  // Close the mobile drawer on route change (during render to avoid cascades).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setRailOpenMobile(false);
  }

  const value = React.useMemo<WorkspaceShellContextValue>(
    () => ({
      isRailOpenMobile,
      setRailOpenMobile,
      toggleRailMobile: () => setRailOpenMobile((open) => !open),
      closeRailMobile: () => setRailOpenMobile(false),
    }),
    [isRailOpenMobile],
  );

  return (
    <WorkspaceShellContext.Provider value={value}>
      <div className="workspace-stage relative isolate flex h-svh w-full overflow-hidden">
        {/* Stage-wide aurora so frosted panes (features, bars, panels) have
            the drifting red/white/blue field refracting behind their blur. */}
        <div className="graph-aurora -z-10" aria-hidden />

        <GraphStageProvider>
          {/* Floating features — former left rail, now a glass card over the graph. */}
          <aside
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 z-40 hidden sm:block",
              workingPanel && "max-lg:opacity-90",
            )}
          >
            <div className="pointer-events-auto absolute bottom-3 left-3 top-3 flex w-[13.5rem]">
              <div className="glass-rail glass-features flex h-full w-full flex-col overflow-hidden rounded-2xl">
                <AppRail />
              </div>
            </div>
          </aside>

          <Sheet open={isRailOpenMobile} onOpenChange={setRailOpenMobile}>
            <SheetContent
              side="left"
              showCloseButton={false}
              className="w-[18rem] gap-0 border-r border-border p-0"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Workspace navigation</SheetTitle>
                <SheetDescription>
                  Primary navigation, workflows, and settings.
                </SheetDescription>
              </SheetHeader>
              <AppRail />
            </SheetContent>
          </Sheet>

          {/* Foreground: route content (desk overlays or right working panel).
              pointer-events-none so the graph stays interactive; panels opt in. */}
          <div className="pointer-events-none relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
            <div className="pointer-events-auto">
              <ComplianceDisclaimer />
            </div>
          </div>
        </GraphStageProvider>
      </div>
    </WorkspaceShellContext.Provider>
  );
}
