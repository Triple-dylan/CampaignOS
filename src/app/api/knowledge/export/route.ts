import JSZip from "jszip";
import { NextResponse } from "next/server";
import { buildCampaignKnowledgeRoot } from "@/lib/campaign-knowledge/paths";
import { getKnowledgeStorage } from "@/lib/campaign-knowledge/storage";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";

export const dynamic = "force-dynamic";

/**
 * Download the whole campaign knowledge tree as a zip so the user can keep a
 * local copy of the file/folder base behind the context graph (or seed a
 * cloud folder like Google Drive with it).
 */
export async function GET() {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const root = buildCampaignKnowledgeRoot({
    organizationId: context.campaign.organization_id,
    campaignId: context.campaign.id,
  });
  const storage = getKnowledgeStorage(root);

  const files = await storage.listMarkdownFiles();
  if (files.length === 0) {
    return NextResponse.json(
      { error: "No campaign knowledge to export yet." },
      { status: 404 },
    );
  }

  const zip = new JSZip();
  for (const relativePath of files) {
    const content = await storage.readFile(relativePath);
    if (content !== null) {
      zip.file(relativePath, content);
    }
  }

  const archive = await zip.generateAsync({ type: "uint8array" });

  return new NextResponse(Buffer.from(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="campaign-knowledge.zip"',
    },
  });
}
