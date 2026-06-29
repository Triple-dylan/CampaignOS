import { ExternalLink, FileText, Link2 } from "lucide-react";
import {
  isValidUrl,
  type NormalizedSource,
} from "@/components/research/research-stages";

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * A single source rendered as a Notion-style reference card. Handles both rich
 * `{ url, title, snippet }` objects and degraded plain-string sources via the
 * upstream {@link NormalizedSource} normalizer.
 */
export function SourceCard({ source }: { source: NormalizedSource }) {
  const linkable = isValidUrl(source.url);
  const host = linkable ? hostFromUrl(source.url) : null;

  return (
    <div className="group/source rounded-lg border border-border bg-card/60 p-3 transition-colors hover:bg-accent/40">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background/70 text-muted-foreground">
          {linkable ? (
            <Link2 className="size-3.5" aria-hidden />
          ) : (
            <FileText className="size-3.5" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {linkable ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              <span className="truncate">{source.title}</span>
              <ExternalLink className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            </a>
          ) : (
            <p className="text-sm font-medium text-foreground">{source.title}</p>
          )}

          {source.snippet ? (
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {source.snippet}
            </p>
          ) : null}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            {source.type ? (
              <span className="rounded-full border border-border px-1.5 py-0.5 font-medium uppercase tracking-wide">
                {source.type}
              </span>
            ) : null}
            {host ? <span className="truncate">{host}</span> : null}
            {!host && source.url ? (
              <span className="truncate">{source.url}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SourceCardList({ sources }: { sources: NormalizedSource[] }) {
  if (sources.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
        No sources attached yet. Add references so findings can be verified.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sources.map((source, index) => (
        <SourceCard key={`${source.url}-${source.title}-${index}`} source={source} />
      ))}
    </div>
  );
}
