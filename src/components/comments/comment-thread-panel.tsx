"use client";

import * as React from "react";
import {
  getObjectCommentThread,
  postObjectComment,
  resolveObjectCommentThread,
  type CommentThreadDTO,
} from "@/actions/comments";
import { useCampaignFocus } from "@/components/focus/focus-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CommentThreadPanelProps = {
  objectType: string;
  objectId: string;
  objectTitle?: string;
  className?: string;
};

export function CommentThreadPanel({
  objectType,
  objectId,
  objectTitle,
  className,
}: CommentThreadPanelProps) {
  const { openThread, setComposerMode, focus } = useCampaignFocus();
  const [data, setData] = React.useState<CommentThreadDTO | null>(null);
  const [draft, setDraft] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loadToken, setLoadToken] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    void getObjectCommentThread({ objectType, objectId }).then((result) => {
      if (cancelled) return;
      if (result.ok && result.data) {
        setData(result.data);
        openThread(result.data.thread.id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [objectId, objectType, openThread, loadToken]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || pending) return;
    setPending(true);
    setError(null);
    const result = await postObjectComment({
      objectType,
      objectId,
      body: text,
      objectTitle,
    });
    setPending(false);
    if (result.ok && result.data) {
      setData(result.data);
      setDraft("");
    } else {
      setError(result.error ?? "Could not post.");
    }
  };

  const toggleResolved = async () => {
    if (!data) return;
    const resolved = !data.thread.resolved_at;
    const result = await resolveObjectCommentThread({
      objectType,
      objectId,
      resolved,
    });
    if (result.ok) {
      setLoadToken((token) => token + 1);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border bg-background/80 p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Shared thread</p>
          <p className="text-xs text-muted-foreground">
            Team comments — use @AI or @content-strategist for a public agent reply.
            {focus.mode === "thread" ? " Composer audience: On thread." : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setComposerMode(focus.mode === "thread" ? "private" : "thread")}
          >
            {focus.mode === "thread" ? "Private chat" : "On thread"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void toggleResolved()}>
            {data?.thread.resolved_at ? "Reopen" : "Resolve"}
          </Button>
        </div>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {(data?.comments ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No comments yet.</p>
        ) : (
          data?.comments.map((comment) => (
            <div key={comment.id} className="rounded-md bg-muted/40 px-2.5 py-2 text-sm">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {comment.authorKind === "agent"
                  ? comment.agentId ?? "agent"
                  : "teammate"}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))
        )}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Leave a comment… @AI for shared agent help"
          rows={2}
          className="min-h-[2.5rem] flex-1 resize-none rounded-md border bg-background px-2 py-1.5 text-sm"
          disabled={Boolean(data?.thread.resolved_at) || pending}
        />
        <Button
          type="button"
          size="sm"
          disabled={pending || !draft.trim() || Boolean(data?.thread.resolved_at)}
          onClick={() => void submit()}
        >
          Post
        </Button>
      </div>
    </div>
  );
}
