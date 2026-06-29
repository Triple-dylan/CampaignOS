import { BriefCard } from "@/components/research/brief-card";
import type { DbResearchBrief } from "@/lib/db/schema";

type ResearchListProps = {
  briefs: DbResearchBrief[];
  graphLinkCountByBrief: Record<string, number>;
  onOpen: (brief: DbResearchBrief) => void;
};

export function ResearchList({
  briefs,
  graphLinkCountByBrief,
  onOpen,
}: ResearchListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {briefs.map((brief) => (
        <BriefCard
          key={brief.id}
          brief={brief}
          graphLinkCount={graphLinkCountByBrief[brief.id] ?? 0}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
