"use client";

import * as React from "react";
import type { AppModule } from "@/lib/auth/permissions";

export type FocusObjectType =
  | "asset"
  | "task"
  | "wiki_page"
  | "graph_node"
  | "research"
  | "compliance"
  | "prospect"
  | "event";

export type FocusComposerMode = "private" | "thread";

export type CampaignFocus = {
  campaignId: string | null;
  module: AppModule | null;
  objectType: FocusObjectType | null;
  objectId: string | null;
  objectTitle: string | null;
  threadId: string | null;
  mode: FocusComposerMode;
};

export type CampaignFocusPatch = Partial<CampaignFocus>;

type FocusContextValue = {
  focus: CampaignFocus;
  setFocus: (patch: CampaignFocusPatch) => void;
  clearFocus: () => void;
  focusObject: (input: {
    objectType: FocusObjectType;
    objectId: string;
    objectTitle?: string | null;
    module?: AppModule | null;
    threadId?: string | null;
    mode?: FocusComposerMode;
  }) => void;
  openThread: (threadId: string) => void;
  setComposerMode: (mode: FocusComposerMode) => void;
};

const EMPTY_FOCUS: CampaignFocus = {
  campaignId: null,
  module: null,
  objectType: null,
  objectId: null,
  objectTitle: null,
  threadId: null,
  mode: "private",
};

const FocusContext = React.createContext<FocusContextValue | null>(null);

export function FocusProvider({
  children,
  campaignId = null,
}: {
  children: React.ReactNode;
  campaignId?: string | null;
}) {
  const [focus, setFocusState] = React.useState<CampaignFocus>(() => ({
    ...EMPTY_FOCUS,
    campaignId,
  }));

  // Keep campaignId in sync without an effect by writing through setFocusState
  // only when the provider is keyed/remounted from the parent, or on patch.
  const setFocus = React.useCallback((patch: CampaignFocusPatch) => {
    setFocusState((prev) => ({
      ...prev,
      campaignId: patch.campaignId ?? prev.campaignId ?? campaignId,
      ...patch,
    }));
  }, [campaignId]);

  const clearFocus = React.useCallback(() => {
    setFocusState({
      ...EMPTY_FOCUS,
      campaignId,
      mode: "private",
    });
  }, [campaignId]);

  const focusObject = React.useCallback(
    (input: {
      objectType: FocusObjectType;
      objectId: string;
      objectTitle?: string | null;
      module?: AppModule | null;
      threadId?: string | null;
      mode?: FocusComposerMode;
    }) => {
      setFocusState((prev) => ({
        ...prev,
        campaignId: prev.campaignId ?? campaignId,
        objectType: input.objectType,
        objectId: input.objectId,
        objectTitle: input.objectTitle ?? prev.objectTitle,
        module: input.module ?? prev.module,
        threadId: input.threadId ?? null,
        mode: input.mode ?? (input.threadId ? "thread" : prev.mode),
      }));
    },
    [campaignId],
  );

  const openThread = React.useCallback((threadId: string) => {
    setFocusState((prev) => ({
      ...prev,
      threadId,
      mode: "thread",
    }));
  }, []);

  const setComposerMode = React.useCallback((mode: FocusComposerMode) => {
    setFocusState((prev) => ({ ...prev, mode }));
  }, []);

  const value: FocusContextValue = {
    focus: { ...focus, campaignId: focus.campaignId ?? campaignId },
    setFocus,
    clearFocus,
    focusObject,
    openThread,
    setComposerMode,
  };

  return (
    <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
  );
}

export function useCampaignFocus(): FocusContextValue {
  const ctx = React.useContext(FocusContext);
  if (!ctx) {
    throw new Error("useCampaignFocus must be used within FocusProvider");
  }
  return ctx;
}

/** Safe hook for surfaces that may render outside the app shell. */
export function useOptionalCampaignFocus(): FocusContextValue | null {
  return React.useContext(FocusContext);
}
