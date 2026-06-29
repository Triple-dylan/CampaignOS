import { FileText, Link as LinkIcon, Sparkles } from "lucide-react";
import { ResearchTypeBadge } from "@/components/research/brief-badges";
import {
  formatDate,
  keyFindings,
  sourceCount,
} from "@/components/research/research-stages";
import { cn } from "@/lib/utils";
import type { DbResearchBrief } from "@/lib/db/schema";
import { RESEARCH_TYPE_LABELS, type ResearchType } from "@/lib/validators/research-briefs";

type BriefCardProps = {
  brief: DbResearchBrief;
  graphLinkCount?: number;
  onOpen: (brief: DbResearchBrief) => void;
  /** Compact variant used inside board lanes. */
  dense?: boolean;
};

/**
 * The shared brief card used in both the board lanes and the list view. Pure
 * presentational — selection state and editing live in the hub.
 */
export function BriefCard({
  brief,
  graphLinkCount = 0,
  onOpen,
  dense = false,
}: BriefCardProps) {
  const findings = keyFindings(brief);
  const sources = sourceCount(brief);
  const subtitle =
    brief.topic?.trim() ||
    RESEARCH_TYPE_LABELS[brief.research_type as ResearchType] ||
    brief.research_type;

  return (
    <button
      type="button"
      onClick={() => onOpen(brief)}
      className={cn(
        "glass-card group/brief w-full rounded-xl border border-border bg-card/70 p-3.5 text-left transition-all hover:-translate-y-px hover:border-foreground/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        dense ? "gap-2" : "gap-3",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={cn(
            "font-heading font-medium leading-snug text-foreground",
            dense ? "line-clamp-2 text-sm" : "text-base",
          )}
        >
          {brief.title}
        </h3>
        <ResearchTypeBadge type={brief.research_type} />
      </div>

      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{subtitle}</p>

      {brief.summary?.trim() ? (
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed text-muted-foreground",
            dense ? "line-clamp-2" : "line-clamp-3",
          )}
        >
          {brief.summary.trim()}
        </p>
      ) : findings[0] ? (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {findings[0]}
        </p>
      ) : (
        <p className="mt-2 text-sm italic text-muted-foreground/70">
          No summary captured yet.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground">
        {findings.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <FileText className="size-3" aria-hidden />
            {findings.length} finding{findings.length === 1 ? "" : "s"}
          </span>
        ) : null}
        {sources > 0 ? (
          <span className="inline-flex items-center gap-1">
            <LinkIcon className="size-3" aria-hidden />
            {sources} source{sources === 1 ? "" : "s"}
          </span>
        ) : null}
        {graphLinkCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <LinkIcon className="size-3" aria-hidden />
            {graphLinkCount} graph link{graphLinkCount === 1 ? "" : "s"}
          </span>
        ) : null}
        {brief.ai_generated ? (
          <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-300">
            <Sparkles className="size-3" aria-hidden />
            AI
          </span>
        ) : null}
        <span className="ml-auto">{formatDate(brief.updated_at)}</span>
      </div>
    </button>
  );
}
