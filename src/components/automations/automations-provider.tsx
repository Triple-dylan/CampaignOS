"use client";

import * as React from "react";
import type { AgentMode } from "@/actions/chat";

export type AutomationDialogPrefill = {
  name?: string;
  prompt?: string;
  agentMode?: AgentMode;
};

type AutomationsContextValue = {
  isCreateOpen: boolean;
  prefill: AutomationDialogPrefill;
  openCreateDialog: (prefill?: AutomationDialogPrefill) => void;
  closeCreateDialog: () => void;
};

const AutomationsContext = React.createContext<AutomationsContextValue | null>(
  null,
);

export function useAutomations(): AutomationsContextValue {
  const context = React.useContext(AutomationsContext);
  if (!context) {
    throw new Error("useAutomations must be used within AutomationsProvider.");
  }
  return context;
}

export function AutomationsProvider({ children }: { children: React.ReactNode }) {
  const [isCreateOpen, setCreateOpen] = React.useState(false);
  const [prefill, setPrefill] = React.useState<AutomationDialogPrefill>({});

  const openCreateDialog = React.useCallback(
    (nextPrefill?: AutomationDialogPrefill) => {
      setPrefill(nextPrefill ?? {});
      setCreateOpen(true);
    },
    [],
  );

  const closeCreateDialog = React.useCallback(() => {
    setCreateOpen(false);
    setPrefill({});
  }, []);

  const value = React.useMemo(
    () => ({
      isCreateOpen,
      prefill,
      openCreateDialog,
      closeCreateDialog,
    }),
    [isCreateOpen, prefill, openCreateDialog, closeCreateDialog],
  );

  return (
    <AutomationsContext.Provider value={value}>
      {children}
    </AutomationsContext.Provider>
  );
}
