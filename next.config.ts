import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Serverless bundles only trace imported JS; the harness (RESOLVER.md,
  // skills) and the campaign-knowledge template tree are read from disk at
  // runtime, so they must be included explicitly for Vercel deploys.
  outputFileTracingIncludes: {
    "/*": [
      "src/lib/harness/**/*.md",
      "src/lib/campaign-knowledge/templates/**/*",
    ],
  },
};

const sentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : nextConfig;
