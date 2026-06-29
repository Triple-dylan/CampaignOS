import { useMemo } from "react";
import { BriefCard } from "@/components/research/brief-card";
import {
  deriveStage,
  RESEARCH_STAGES,
  RESEARCH_STAGE_META,
  type ResearchStage,
} from "@/components/research/research-stages";
import { cn } from "@/lib/utils";
import type { DbResearchBrief } from "@/lib/db/schema";

type ResearchBoardProps = {
  briefs: DbResearchBrief[];
  graphLinkCountByBrief: Record<string, number>;
  onOpen: (brief: DbResearchBrief) => void;
};

/**
 * Notion-style board: existing briefs grouped into four client-derived stage
 * lanes. The grouping is purely a function of fields already on the row (see
 * {@link deriveStage}); nothing here is persisted.
 */
export function ResearchBoard({
  briefs,
  graphLinkCountByBrief,
  onOpen,
}: ResearchBoardProps) {
  const lanes = useMemo(() => {
    const grouped = new Map<ResearchStage, DbResearchBrief[]>();
    for (const stage of RESEARCH_STAGES) {
      grouped.set(stage, []);
    }
    for (const brief of briefs) {
      grouped.get(deriveStage(brief))?.push(brief);
    }
    return grouped;
  }, [briefs]);

  return (
    <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {RESEARCH_STAGES.map((stage) => {
        const meta = RESEARCH_STAGE_META[stage];
        const laneBriefs = lanes.get(stage) ?? [];
        return (
          <section
            key={stage}
            className="flex min-h-48 flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3"
          >
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", meta.dot)} aria-hidden />
                <h2 className="text-sm font-medium text-foreground">{meta.label}</h2>
              </div>
              <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {laneBriefs.length}
              </span>
            </header>

            {laneBriefs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-2 py-6 text-center text-xs text-muted-foreground/80">
                {meta.hint}
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {laneBriefs.map((brief) => (
                  <BriefCard
                    key={brief.id}
                    brief={brief}
                    graphLinkCount={graphLinkCountByBrief[brief.id] ?? 0}
                    onOpen={onOpen}
                    dense
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
