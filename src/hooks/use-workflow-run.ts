"use client";

import * as React from "react";
import { executeChatWorkflow, previewChatWorkflow } from "@/actions/workflow-chat";
import {
  clearWorkflowChatSession,
  loadWorkflowChatSession,
  saveWorkflowChatSession,
} from "@/actions/workflow-chat-sessions";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import { WORKFLOW_GRAPH_FOLDERS } from "@/lib/harness/skill-folders";
import {
  detectWorkflowFromMessage,
  isWorkflowCancelMessage,
} from "@/lib/workflows/detect";
import {
  applyFieldAnswer,
  initialWorkflowReply,
  isPreviewConfirmMessage,
  markComplete,
  markError,
  markPreviewing,
  markSaving,
  parseDraftSelection,
  promptForCurrentStep,
  readyToExecute,
  readyToPreview,
  startWorkflowRun,
  type WorkflowRunState,
} from "@/lib/workflows/chat-machine";
import type { CampaignWorkflowId } from "@/lib/workflows/registry";

export type WorkflowRunHookResult = {
  getRun: (threadId: string) => WorkflowRunState | null;
  clearRun: (threadId: string) => void;
  hydrateThread: (threadId: string) => Promise<void>;
  handleMessage: (input: {
    threadId: string;
    text: string;
    onProgress: (state: WorkflowRunState) => void;
  }) => Promise<
    | { handled: false }
    | {
        handled: true;
        reply: string;
        state: WorkflowRunState | null;
        graphFolders: CampaignFolderId[];
      }
  >;
};

export function useWorkflowRun(): WorkflowRunHookResult {
  const runsRef = React.useRef<Record<string, WorkflowRunState>>({});

  const persistRun = React.useCallback(
    async (threadId: string, state: WorkflowRunState | null) => {
      if (!state || state.phase === "complete") {
        await clearWorkflowChatSession({ threadId });
        return;
      }
      await saveWorkflowChatSession({ threadId, state });
    },
    [],
  );

  const getRun = React.useCallback((threadId: string) => {
    return runsRef.current[threadId] ?? null;
  }, []);

  const clearRun = React.useCallback(
    (threadId: string) => {
      delete runsRef.current[threadId];
      void clearWorkflowChatSession({ threadId });
    },
    [],
  );

  const setRun = React.useCallback(
    (threadId: string, state: WorkflowRunState | null) => {
      if (state) {
        runsRef.current[threadId] = state;
        void persistRun(threadId, state);
      } else {
        delete runsRef.current[threadId];
        void clearWorkflowChatSession({ threadId });
      }
    },
    [persistRun],
  );

  const hydrateThread = React.useCallback(async (threadId: string) => {
    const result = await loadWorkflowChatSession({ threadId });
    if (result.ok && result.state) {
      runsRef.current[threadId] = result.state;
    }
  }, []);

  const foldersForWorkflow = React.useCallback(
    (workflowId: CampaignWorkflowId): CampaignFolderId[] => {
      return [...WORKFLOW_GRAPH_FOLDERS[workflowId]];
    },
    [],
  );

  const runWorkflowExecution = React.useCallback(
    async (threadId: string, state: WorkflowRunState) => {
      if (readyToPreview(state)) {
        const preview = await previewChatWorkflow({
          workflowId: state.workflowId,
          fields: state.fields,
        });
        if (!preview.ok) {
          return markError(state, preview.error);
        }
        return markPreviewing({ state, drafts: preview.drafts });
      }

      const saving = markSaving(state);
      setRun(threadId, saving);

      const result = await executeChatWorkflow({
        workflowId: state.workflowId,
        fields: state.fields,
      });

      if (!result.ok) {
        return markError(saving, result.error);
      }

      return markComplete({
        state: saving,
        artifactLink: result.artifactLink,
        artifactLabel: result.artifactLabel,
        summary: result.summary,
      });
    },
    [setRun],
  );

  const handleMessage = React.useCallback(
    async (input: {
      threadId: string;
      text: string;
      onProgress: (state: WorkflowRunState) => void;
    }): Promise<
      | { handled: false }
      | {
          handled: true;
          reply: string;
          state: WorkflowRunState | null;
          graphFolders: CampaignFolderId[];
        }
    > => {
      const { threadId, text, onProgress } = input;
      let existing = runsRef.current[threadId];
      if (!existing) {
        const loaded = await loadWorkflowChatSession({ threadId });
        if (loaded.ok && loaded.state) {
          existing = loaded.state;
          runsRef.current[threadId] = existing;
        }
      }

      if (isWorkflowCancelMessage(text)) {
        if (existing && existing.phase !== "complete") {
          clearRun(threadId);
          return {
            handled: true,
            reply: "Workflow canceled. Ask anything else when you're ready.",
            state: null,
            graphFolders: [],
          };
        }
        return { handled: false };
      }

      if (
        existing &&
        existing.phase === "previewing" &&
        isPreviewConfirmMessage(text)
      ) {
        const draftIndex = parseDraftSelection(text) ?? 0;
        const saving = markSaving(existing);
        setRun(threadId, saving);
        onProgress(saving);

        const result = await executeChatWorkflow({
          workflowId: existing.workflowId,
          fields: existing.fields,
          draftIndex,
          drafts: existing.drafts,
        });

        if (!result.ok) {
          const errorReply = markError(saving, result.error);
          setRun(threadId, errorReply.state);
          return {
            handled: true,
            reply: errorReply.content,
            state: errorReply.state,
            graphFolders: foldersForWorkflow(existing.workflowId),
          };
        }

        const completeReply = markComplete({
          state: saving,
          artifactLink: result.artifactLink,
          artifactLabel: result.artifactLabel,
          summary: result.summary,
        });
        setRun(threadId, completeReply.state);
        return {
          handled: true,
          reply: completeReply.content,
          state: completeReply.state,
          graphFolders: foldersForWorkflow(existing.workflowId),
        };
      }

      if (existing && (existing.phase === "generating" || existing.phase === "saving")) {
        return {
          handled: true,
          reply: "Still working on your workflow — one moment…",
          state: existing,
          graphFolders: foldersForWorkflow(existing.workflowId),
        };
      }

      if (existing && existing.phase !== "complete" && existing.phase !== "error") {
        const state = applyFieldAnswer(existing, text);

        if (readyToExecute(state)) {
          onProgress(state);
          const outcome = await runWorkflowExecution(threadId, state);
          setRun(threadId, outcome.state);
          return {
            handled: true,
            reply: outcome.content,
            state: outcome.state,
            graphFolders: foldersForWorkflow(state.workflowId),
          };
        }

        setRun(threadId, state);
        return {
          handled: true,
          reply: promptForCurrentStep(state),
          state,
          graphFolders: foldersForWorkflow(state.workflowId),
        };
      }

      const detected = detectWorkflowFromMessage(text);
      if (!detected) {
        return { handled: false };
      }

      const state = startWorkflowRun(detected, text);
      setRun(threadId, state);

      if (readyToExecute(state)) {
        onProgress(state);
        const outcome = await runWorkflowExecution(threadId, state);
        setRun(threadId, outcome.state);
        return {
          handled: true,
          reply: outcome.content,
          state: outcome.state,
          graphFolders: foldersForWorkflow(state.workflowId),
        };
      }

      return {
        handled: true,
        reply: initialWorkflowReply(state),
        state,
        graphFolders: foldersForWorkflow(detected),
      };
    },
    [clearRun, foldersForWorkflow, runWorkflowExecution, setRun],
  );

  return { getRun, clearRun, hydrateThread, handleMessage };
}
