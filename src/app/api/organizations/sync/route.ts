import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureOrganizationSynced } from "@/actions/organizations";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await ensureOrganizationSynced();

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
