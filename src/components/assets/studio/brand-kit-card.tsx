"use client";

import { Palette } from "lucide-react";
import { useCampaign } from "@/components/campaign/campaign-context";
import { campaignDisplayName } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const BRAND_COLORS = [
  { name: "Primary", className: "bg-[var(--brand-blue)]" },
  { name: "Accent", className: "bg-[var(--brand-red)]" },
  { name: "Ink", className: "bg-foreground" },
  { name: "Paper", className: "bg-background border border-border" },
];

/**
 * Static brand-kit placeholder backed by the campaign profile. Real brand
 * assets (logo uploads, custom palettes, font files) arrive in a later schema
 * phase; for now this surfaces tone + themes the AI already uses so the studio
 * reads like a design workspace.
 */
export function BrandKitCard() {
  const { campaign, profile } = useCampaign();

  const candidate = campaign ? campaignDisplayName(campaign) : "Your campaign";
  const tone =
    (typeof profile?.tone_preferences?.tone === "string"
      ? (profile?.tone_preferences?.tone as string)
      : null) ??
    profile?.message_framework?.toneGuidance ??
    "Confident · Optimistic · Community-first";
  const themes = (profile?.campaign_themes ?? []).slice(0, 3);
  const disclaimer = campaign?.candidate_name
    ? `Paid for by ${candidate}`
    : "Paid for by [committee]";

  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Palette className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">Brand kit</p>
          <p className="truncate text-[0.7rem] text-muted-foreground">
            {candidate}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {BRAND_COLORS.map((color) => (
          <span
            key={color.name}
            title={color.name}
            className={cn("size-6 rounded-md shadow-sm", color.className)}
          />
        ))}
      </div>

      <dl className="mt-3 space-y-2 text-[0.72rem]">
        <div>
          <dt className="text-muted-foreground">Tone</dt>
          <dd className="line-clamp-2 text-foreground">{tone}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Fonts</dt>
          <dd className="text-foreground">Inter · Space Grotesk</dd>
        </div>
        {themes.length > 0 ? (
          <div>
            <dt className="text-muted-foreground">Themes</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {themes.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full bg-muted px-1.5 py-0.5 text-[0.68rem] text-foreground"
                >
                  {theme}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">Disclaimer</dt>
          <dd className="text-foreground">{disclaimer}</dd>
        </div>
      </dl>
    </section>
  );
}
