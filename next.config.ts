import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Hide the Next.js dev-tools indicator — the floating circle with the Next "N"
  // logo that renders bottom-left under `next dev`. It is dev-only chrome (never
  // present in a production build) and was overlapping the public landing page in
  // localhost review. Disabling it makes localhost match production.
  devIndicators: false,
};

// Sentry build-time options. Source-map upload runs only when SENTRY_AUTH_TOKEN is set
// (the founder adds it in Vercel); otherwise these are inert and the build is unchanged.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  // Proxy Sentry events through the app to dodge ad blockers. /monitoring is NOT in
  // src/middleware.ts's closed-allowlist matcher, so the tunnel is unobstructed.
  tunnelRoute: "/monitoring",
  // Tree-shakes Sentry's internal debug logging from bundles. Emits a deprecation
  // notice under Turbopack (the webpack.* replacement isn't Turbopack-compatible yet);
  // benign and the only way to get this behavior today. automaticVercelMonitors is left
  // at its default (false) — no auto Vercel cron monitors.
  disableLogger: true,
});
