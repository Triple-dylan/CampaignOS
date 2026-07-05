import { NextResponse } from "next/server";
import { runDueWorkflowSchedules } from "@/actions/workflows";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDueWorkflowSchedules();

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
