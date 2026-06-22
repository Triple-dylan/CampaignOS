import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "CampaignOS API — routes added in later milestones",
  });
}
