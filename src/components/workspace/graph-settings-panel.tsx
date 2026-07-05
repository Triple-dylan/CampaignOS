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
  /** True when an entity/folder focus is active — enables depth slider. */
  focusActive?: boolean;
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
  disabled?: boolean;
};

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format = (v) => String(Math.round(v * 100) / 100),
  onChange,
  disabled,
}: SliderRowProps) {
  return (
    <label className={cn("flex flex-col gap-1", disabled && "opacity-50")}>
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
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-foreground disabled:cursor-not-allowed"
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

function patchFilters(
  preferences: CampaignGraphPreferences,
  patch: Partial<CampaignGraphPreferences["filters"]>,
): Partial<CampaignGraphPreferences> {
  return {
    filters: { ...preferences.filters, ...patch },
  };
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-[0.7rem]">
      <span className="font-medium text-foreground">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 cursor-pointer accent-foreground"
      />
    </label>
  );
}

/**
 * Compact Obsidian-style graph gear panel — filters, groups, display, forces.
 */
export function GraphSettingsPanel({
  open,
  onOpenChange,
  preferences,
  onChange,
  onRestoreDefaults,
  focusActive = false,
  className,
}: GraphSettingsPanelProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [searchDraft, setSearchDraft] = React.useState(preferences.filters.search);
  const [prevExternalSearch, setPrevExternalSearch] = React.useState(
    preferences.filters.search,
  );

  if (preferences.filters.search !== prevExternalSearch) {
    setPrevExternalSearch(preferences.filters.search);
    setSearchDraft(preferences.filters.search);
  }

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

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft !== preferences.filters.search) {
        onChange(patchFilters(preferences, { search: searchDraft }));
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchDraft, preferences, onChange]);

  if (!open) return null;

  const { forces, display, filters, view, positions } = preferences;

  return (
    <div
      ref={panelRef}
      className={cn(
        "glass-chrome-pill pointer-events-auto max-h-[min(70vh,32rem)] w-[min(17rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-border/60 p-3 shadow-lg",
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
            Filters
          </p>
          <div className="space-y-2">
            <label className="flex flex-col gap-1">
              <span className="text-[0.7rem] font-medium text-foreground">
                Search nodes
              </span>
              <input
                type="search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="folder:messaging or title…"
                className="h-7 rounded-md border border-border bg-background px-2 text-[0.7rem] outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
            <ToggleRow
              label="Show orphan nodes"
              checked={filters.showOrphans}
              onChange={(showOrphans) =>
                onChange(patchFilters(preferences, { showOrphans }))
              }
            />
            <SliderRow
              label="Local graph depth"
              value={filters.localGraphDepth}
              min={1}
              max={3}
              step={1}
              format={(v) => String(Math.round(v))}
              disabled={!focusActive}
              onChange={(localGraphDepth) =>
                onChange(patchFilters(preferences, { localGraphDepth }))
              }
            />
            {!focusActive ? (
              <p className="text-[0.62rem] text-muted-foreground">
                Select a node to tune hop depth.
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <p className="mb-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            View
          </p>
          <div className="inline-flex w-full rounded-full bg-accent/60 p-0.5">
            {(
              [
                ["2d", "2D orbit"],
                ["3d", "3D explore"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  onChange({
                    view: { renderer: mode },
                  })
                }
                className={cn(
                  "flex-1 rounded-full px-2 py-1 text-[0.65rem] font-medium transition-colors",
                  view.renderer === mode
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Display
          </p>
          <div className="space-y-2">
            <ToggleRow
              label="Show link arrows"
              checked={display.showArrows}
              onChange={(showArrows) =>
                onChange(patchDisplay(preferences, "showArrows", showArrows))
              }
            />
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

        <section>
          <p className="mb-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Positions
          </p>
          <div className="space-y-2">
            <ToggleRow
              label="Pin layout on drag"
              checked={positions.pinLayout}
              onChange={(pinLayout) =>
                onChange({
                  positions: { ...positions, pinLayout },
                })
              }
            />
            <p className="text-[0.62rem] text-muted-foreground">
              {Object.keys(positions.pinned).length > 0
                ? `${Object.keys(positions.pinned).length} pinned node(s) saved.`
                : "Drag nodes while pinned to save positions across sessions."}{" "}
              The campaign center node always stays fixed.
            </p>
          </div>
        </section>

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
      </div>
    </div>
  );
}
