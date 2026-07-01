"use client";

import * as React from "react";
import { executeChatWorkflow } from "@/actions/workflow-chat";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import { WORKFLOW_GRAPH_FOLDERS } from "@/lib/harness/skill-folders";
import {
  detectWorkflowFromMessage,
  isWorkflowCancelMessage,
} from "@/lib/workflows/detect";
import {
  applyFieldAnswer,
  initialWorkflowReply,
  markComplete,
  markError,
  markSaving,
  promptForCurrentStep,
  readyToExecute,
  startWorkflowRun,
  type WorkflowRunState,
} from "@/lib/workflows/chat-machine";
import type { CampaignWorkflowId } from "@/lib/workflows/registry";

export type WorkflowRunHookResult = {
  getRun: (threadId: string) => WorkflowRunState | null;
  clearRun: (threadId: string) => void;
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

  const getRun = React.useCallback((threadId: string) => {
    return runsRef.current[threadId] ?? null;
  }, []);

  const clearRun = React.useCallback((threadId: string) => {
    delete runsRef.current[threadId];
  }, []);

  const setRun = React.useCallback(
    (threadId: string, state: WorkflowRunState | null) => {
      if (state) {
        runsRef.current[threadId] = state;
      } else {
        delete runsRef.current[threadId];
      }
    },
    [],
  );

  const foldersForWorkflow = React.useCallback(
    (workflowId: CampaignWorkflowId): CampaignFolderId[] => {
      return [...WORKFLOW_GRAPH_FOLDERS[workflowId]];
    },
    [],
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
      const existing = runsRef.current[threadId];

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

      if (existing && (existing.phase === "generating" || existing.phase === "saving")) {
        return {
          handled: true,
          reply: "Still working on your workflow — one moment…",
          state: existing,
          graphFolders: foldersForWorkflow(existing.workflowId),
        };
      }

      if (existing && existing.phase !== "complete" && existing.phase !== "error") {
        let state = applyFieldAnswer(existing, text);

        if (readyToExecute(state)) {
          state = markSaving(state);
          setRun(threadId, state);
          onProgress(state);

          const result = await executeChatWorkflow({
            workflowId: state.workflowId,
            fields: state.fields,
          });

          if (!result.ok) {
            const errorReply = markError(state, result.error);
            setRun(threadId, errorReply.state);
            return {
              handled: true,
              reply: errorReply.content,
              state: errorReply.state,
              graphFolders: foldersForWorkflow(state.workflowId),
            };
          }

          const completeReply = markComplete({
            state,
            artifactLink: result.artifactLink,
            artifactLabel: result.artifactLabel,
            summary: result.summary,
          });
          setRun(threadId, completeReply.state);
          return {
            handled: true,
            reply: completeReply.content,
            state: completeReply.state,
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
        const saving = markSaving(state);
        setRun(threadId, saving);
        onProgress(saving);

        const result = await executeChatWorkflow({
          workflowId: saving.workflowId,
          fields: saving.fields,
        });

        if (!result.ok) {
          const errorReply = markError(saving, result.error);
          setRun(threadId, errorReply.state);
          return {
            handled: true,
            reply: errorReply.content,
            state: errorReply.state,
            graphFolders: foldersForWorkflow(saving.workflowId),
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
          graphFolders: foldersForWorkflow(saving.workflowId),
        };
      }

      return {
        handled: true,
        reply: initialWorkflowReply(state),
        state,
        graphFolders: foldersForWorkflow(detected),
      };
    },
    [clearRun, foldersForWorkflow, setRun],
  );

  return { getRun, clearRun, handleMessage };
}
