"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Play } from "lucide-react";
import { triggerWorkflowRun } from "@/actions/workflows";
import { Button } from "@/components/ui/button";

type RunNowButtonProps = {
  scheduleId: string;
  disabled?: boolean;
};

export function RunNowButton({ scheduleId, disabled }: RunNowButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    setError(null);
    startTransition(async () => {
      const result = await triggerWorkflowRun(scheduleId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || isPending}
        onClick={() => void handleRun()}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Running…
          </>
        ) : (
          <>
            <Play className="size-4" aria-hidden />
            Run now
          </>
        )}
      </Button>
      {error ? (
        <p className="max-w-xs text-right text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
