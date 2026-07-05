"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CampaignGraphPreferences } from "@/lib/graph/graph-preferences";

type GraphSettingsPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: CampaignGraphPreferences;
  onChange: (patch: Partial<CampaignGraphPreferences>) => void;
  onRestoreDefaults: () => void;
  className?: string;
};

type SliderRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
};

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format = (v) => String(Math.round(v * 100) / 100),
  onChange,
}: SliderRowProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between text-[0.7rem]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-foreground"
      />
    </label>
  );
}

function patchForces(
  preferences: CampaignGraphPreferences,
  key: keyof CampaignGraphPreferences["forces"],
  value: number,
): Partial<CampaignGraphPreferences> {
  return {
    forces: { ...preferences.forces, [key]: value },
  };
}

function patchDisplay(
  preferences: CampaignGraphPreferences,
  key: keyof CampaignGraphPreferences["display"],
  value: number | boolean,
): Partial<CampaignGraphPreferences> {
  return {
    display: { ...preferences.display, [key]: value },
  };
}

/**
 * Compact Obsidian-style graph gear panel — forces + display sliders with live
 * preview. Anchored top-right on the canvas beside the stats pill.
 */
export function GraphSettingsPanel({
  open,
  onOpenChange,
  preferences,
  onChange,
  onRestoreDefaults,
  className,
}: GraphSettingsPanelProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (
        (target as Element).closest?.("[data-graph-settings-trigger]")
      ) {
        return;
      }
      onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const { forces, display } = preferences;

  return (
    <div
      ref={panelRef}
      className={cn(
        "glass-chrome-pill pointer-events-auto w-[min(17rem,calc(100vw-1.5rem))] rounded-2xl border border-border/60 p-3 shadow-lg",
        className,
      )}
      role="dialog"
      aria-label="Graph settings"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[0.75rem] font-semibold tracking-tight">
          Graph settings
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-6 gap-1 px-1.5 text-[0.65rem] text-muted-foreground"
          onClick={onRestoreDefaults}
        >
          <RotateCcw className="size-3" aria-hidden />
          Restore defaults
        </Button>
      </div>

      <div className="space-y-3">
        <section>
          <p className="mb-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Forces
          </p>
          <div className="space-y-2">
            <SliderRow
              label="Center"
              value={forces.centerStrength}
              min={0}
              max={2}
              step={0.05}
              onChange={(value) => onChange(patchForces(preferences, "centerStrength", value))}
            />
            <SliderRow
              label="Repel"
              value={forces.repelStrength}
              min={0}
              max={20}
              step={0.5}
              onChange={(value) => onChange(patchForces(preferences, "repelStrength", value))}
            />
            <SliderRow
              label="Link force"
              value={forces.linkStrength}
              min={0}
              max={2}
              step={0.05}
              onChange={(value) => onChange(patchForces(preferences, "linkStrength", value))}
            />
            <SliderRow
              label="Link distance"
              value={forces.linkDistance}
              min={20}
              max={300}
              step={5}
              format={(v) => String(Math.round(v))}
              onChange={(value) => onChange(patchForces(preferences, "linkDistance", value))}
            />
          </div>
        </section>

        <section>
          <p className="mb-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Display
          </p>
          <div className="space-y-2">
            <SliderRow
              label="Node size"
              value={display.nodeSizeMultiplier}
              min={0.25}
              max={3}
              step={0.05}
              format={(v) => `${Math.round(v * 100) / 100}×`}
              onChange={(value) =>
                onChange(patchDisplay(preferences, "nodeSizeMultiplier", value))
              }
            />
            <SliderRow
              label="Link thickness"
              value={display.lineSizeMultiplier}
              min={0.25}
              max={3}
              step={0.05}
              format={(v) => `${Math.round(v * 100) / 100}×`}
              onChange={(value) =>
                onChange(patchDisplay(preferences, "lineSizeMultiplier", value))
              }
            />
            <SliderRow
              label="Text fade"
              value={display.textFadeMultiplier}
              min={-3}
              max={3}
              step={0.25}
              format={(v) => (v > 0 ? `+${v}` : String(v))}
              onChange={(value) =>
                onChange(patchDisplay(preferences, "textFadeMultiplier", value))
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}
