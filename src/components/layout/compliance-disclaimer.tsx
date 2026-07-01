/**
 * Thin status-bar style compliance notice pinned to the bottom of the app,
 * like a desktop app's footer. Quiet and out of the way, but always present.
 */
export function ComplianceDisclaimer() {
  return (
    <footer
      className="flex h-7 shrink-0 items-center gap-1.5 border-t border-border px-3 pb-safe text-[0.7rem] text-muted-foreground"
      role="note"
      aria-label="Compliance disclaimer"
    >
      <span className="size-1.5 shrink-0 rounded-full bg-brand-red/70" aria-hidden />
      <p className="truncate">
        CampaignOS supports campaign workflow and recordkeeping only — it does
        not provide legal advice. Consult qualified counsel for compliance
        decisions.
      </p>
    </footer>
  );
}
