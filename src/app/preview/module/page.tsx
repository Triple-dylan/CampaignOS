import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PreviewModuleClient } from "@/components/workspace/preview-module-client";

export const metadata: Metadata = {
  title: "Module preview",
  robots: { index: false, follow: false },
};

/**
 * Development-only, auth-free preview of a dedicated module page (WorkPageFrame
 * + right-rail follow-chat). Returns 404 in production.
 */
export default function ModulePreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <PreviewModuleClient />;
}
