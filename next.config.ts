import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Hide the Next.js dev-tools indicator — the floating circle with the Next "N"
  // logo that renders bottom-left under `next dev`. It is dev-only chrome (never
  // present in a production build) and was overlapping the public landing page in
  // localhost review. Disabling it makes localhost match production.
  devIndicators: false,

  // Allow next/image to optimize remote images served from the Supabase Storage
  // public buckets (product/service display images). Scoped to the public object
  // path so only intended display assets pass. next/image gives free WebP + a
  // responsive srcset, which matters for Tunisia's mobile-first, low-bandwidth market.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xggomcitqrkaylqezjjz.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Permanent (308) redirects from the decommissioned legacy auth routes to their
  // branded French equivalents. The old route folders were deleted in the auth
  // route migration; these keep any external/old links (and Supabase email links
  // that predate the whitelist update) working. Intentionally flat — ?role= is not
  // preserved into /inscription/[role] since the /inscription Step 1 page lets users
  // pick their role and no real bookmarks exist pre-launch.
  async redirects() {
    return [
      { source: '/login', destination: '/connexion', permanent: true },
      { source: '/signup', destination: '/inscription', permanent: true },
      { source: '/forgot-password', destination: '/mot-de-passe-oublie', permanent: true },
      { source: '/update-password', destination: '/nouveau-mot-de-passe', permanent: true },
    ]
  },
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
