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

const PROVIDER_STYLES: Record<SocialAssetTemplate["provider"], string> = {
  canva: "badge-blue border",
  higgsfield: "badge-red border",
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
 * Canva-style template gallery. Large visual cards drive the generation flow;
 * "Use template" hands the selected template up to the studio which opens the
 * generation dialog prefilled.
 */
export function TemplateGallery({ onUseTemplate }: TemplateGalleryProps) {
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <WandSparkles className="size-3.5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Start from a template</h2>
            <p className="text-xs text-muted-foreground">
              Brand-ready formats for social, print, and email.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={open ? "Collapse templates" : "Expand templates"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown
            className={cn("size-4 transition-transform", open ? "" : "-rotate-90")}
          />
        </Button>
      </header>

      {open ? (
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {SOCIAL_ASSET_TEMPLATES.map((template) => (
            <article
              key={template.id}
              className="group/template flex flex-col overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-md"
            >
              <div className="relative flex items-center justify-center bg-muted/40 p-3">
                <div
                  className={cn(
                    "w-full max-w-[8rem] rounded-md bg-gradient-to-br shadow-sm",
                    previewAspect(template),
                    TEMPLATE_GRADIENTS[template.id] ??
                      "from-slate-400/80 to-slate-600/80",
                  )}
                />
                <span
                  className={cn(
                    "absolute top-2 right-2 rounded-full px-1.5 py-0.5 text-[0.62rem] font-medium capitalize",
                    PROVIDER_STYLES[template.provider],
                  )}
                >
                  {template.provider}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium">
                    {template.label}
                  </h3>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
                    {template.platform}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
                    {template.dimensions}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-auto w-full"
                  onClick={() => onUseTemplate(template)}
                >
                  <Sparkles data-icon="inline-start" className="size-3.5" />
                  Use template
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
