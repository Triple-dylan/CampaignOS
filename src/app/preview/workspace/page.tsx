import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PreviewWorkspaceClient } from "@/components/workspace/preview-workspace-client";

export const metadata: Metadata = {
  title: "Workspace preview",
  robots: { index: false, follow: false },
};

/**
 * Development-only, auth-free preview of the workspace shell. Returns 404 in
 * production so it never exposes a shell route publicly. Renders only static
 * demo content (no secrets, no user/org/Supabase data).
 *
 * `ALLOW_WORKSPACE_PREVIEW=1` opts in for local production-build profiling
 * (`next start`); it is never set on the deployment.
 */
export default function WorkspacePreviewPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_WORKSPACE_PREVIEW !== "1"
  ) {
    notFound();
  }

  return <PreviewWorkspaceClient />;
}
