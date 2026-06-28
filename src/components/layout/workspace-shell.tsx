"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppRail } from "@/components/layout/app-rail";
import { ComplianceDisclaimer } from "@/components/layout/compliance-disclaimer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isRailOpenMobile, setRailOpenMobile] = React.useState(false);
  const [lastPathname, setLastPathname] = React.useState(pathname);

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
      <div className="workspace-stage flex h-svh w-full overflow-hidden">
        <aside className="hidden w-[264px] shrink-0 border-r border-border md:flex">
          <AppRail />
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
                Work folders, agents, automations, and customize options.
              </SheetDescription>
            </SheetHeader>
            <AppRail />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
          <ComplianceDisclaimer />
        </div>
      </div>
    </WorkspaceShellContext.Provider>
  );
}
