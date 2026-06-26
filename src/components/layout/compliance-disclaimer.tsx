export function ComplianceDisclaimer() {
  return (
    <footer
      className="glass-floating shrink-0 rounded-2xl px-4 py-2.5 text-xs leading-relaxed text-muted-foreground"
      role="note"
      aria-label="Compliance disclaimer"
    >
      <p>
        <strong className="font-medium text-foreground">Compliance notice:</strong>{" "}
        CampaignOS supports campaign workflow and recordkeeping only. It does not
        provide legal advice, and nothing in this product should be treated as
        guidance on election law, filing requirements, or regulatory compliance.
        Consult qualified counsel for legal and compliance decisions.
      </p>
    </footer>
  );
}
