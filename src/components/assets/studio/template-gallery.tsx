"use client";

import { useState } from "react";
import { ChevronDown, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SOCIAL_ASSET_TEMPLATES,
  type SocialAssetTemplate,
} from "@/lib/assets/social-templates";
import { cn } from "@/lib/utils";

type TemplateGalleryProps = {
  onUseTemplate: (template: SocialAssetTemplate) => void;
};

const TEMPLATE_GRADIENTS: Record<string, string> = {
  "instagram-square-post":
    "from-rose-400/80 via-fuchsia-500/70 to-indigo-500/80",
  "instagram-story": "from-amber-400/80 via-orange-500/70 to-rose-500/80",
  "facebook-cover": "from-sky-400/80 via-blue-500/70 to-indigo-600/80",
  "x-post-card": "from-slate-500/80 via-slate-700/70 to-slate-900/80",
  "event-flyer": "from-emerald-400/80 via-teal-500/70 to-cyan-600/80",
};

function previewAspect(template: SocialAssetTemplate): string {
  switch (template.id) {
    case "instagram-story":
      return "aspect-[9/16]";
    case "facebook-cover":
      return "aspect-[16/6]";
    case "x-post-card":
      return "aspect-[16/9]";
    case "event-flyer":
      return "aspect-[3/4]";
    default:
      return "aspect-square";
  }
}

/**
 * Compact template starter strip. Collapsed by default so the collection page
 * stays the primary surface; expand when starting a new asset format.
 */
export function TemplateGallery({ onUseTemplate }: TemplateGalleryProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="border-b border-border/70 pb-1">
      <header className="flex items-center justify-between gap-2 py-1">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-accent/60"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <WandSparkles className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Templates</h2>
            <p className="truncate text-xs text-muted-foreground">
              Brand-ready formats for social, print, and email
            </p>
          </div>
          <ChevronDown
            className={cn(
              "ml-1 size-4 shrink-0 text-muted-foreground transition-transform",
              open ? "" : "-rotate-90",
            )}
            aria-hidden
          />
        </button>
        {!open ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(true)}
          >
            Browse
          </Button>
        ) : null}
      </header>

      {open ? (
        <div className="motion-fade grid gap-2 py-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {SOCIAL_ASSET_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onUseTemplate(template)}
              className="group/template flex flex-col overflow-hidden rounded-lg border border-border/80 bg-background text-left transition-colors hover:border-border hover:bg-accent/40"
            >
              <div className="relative flex items-center justify-center bg-muted/30 p-3">
                <div
                  className={cn(
                    "w-full max-w-[7rem] rounded-md bg-gradient-to-br shadow-sm",
                    previewAspect(template),
                    TEMPLATE_GRADIENTS[template.id] ??
                      "from-slate-400/80 to-slate-600/80",
                  )}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <h3 className="truncate text-sm font-medium">
                  {template.label}
                </h3>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {template.description}
                </p>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary">
                  <Sparkles className="size-3" aria-hidden />
                  Use template
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
