export function ComplianceDisclaimer() {
  return (
    <footer
      className="border-t bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground md:px-6"
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
