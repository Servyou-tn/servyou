import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Hide the Next.js dev-tools indicator — the floating circle with the Next "N"
  // logo that renders bottom-left under `next dev`. It is dev-only chrome (never
  // present in a production build) and was overlapping the public landing page in
  // localhost review. Disabling it makes localhost match production.
  devIndicators: false,

  // Server Actions default to a 1 MB request body. The avatar upload sends a real photo through an
  // action, so at the default ANY ordinary phone photo exceeded it and Next threw
  // "Body exceeded 1 MB limit" (413) — which surfaced as a 500 through the error boundary, i.e. a
  // crash page rather than a message. Caught by the authenticated gate, not by the unit tests: they
  // call the normalizer directly and never cross the action boundary.
  //
  // 4.4 MB, not higher, because VERCEL CAPS A FUNCTION PAYLOAD AT 4.5 MB as a platform limit
  // (413 FUNCTION_PAYLOAD_TOO_LARGE) that no setting raises. Going above it would make local dev
  // MORE permissive than production and hide the failure until deploy. This sits just under the
  // cap, and `MAX_INPUT_BYTES` (4 MB) sits under THIS, so the app's own friendly rejection is
  // always the thing that fires first.
  experimental: {
    serverActions: { bodySizeLimit: '4.4mb' },
  },

  // Allow next/image to optimize remote images served from the Supabase Storage
  // public buckets (product/service display images). Scoped to the public object
  // path so only intended display assets pass. next/image gives free WebP + a
  // responsive srcset, which matters for Tunisia's mobile-first, low-bandwidth market.
  //
  // EVERYTHING BELOW remotePatterns EXISTS TO PROTECT THE TRANSFORMATION BUDGET.
  // Vercel Hobby includes 5,000 image transformations/month. A transformation is billed on every
  // cache MISS and STALE, and the remote cache key is {projectId, url, w, q, normalized Accept}.
  // So the monthly cost is (distinct cache keys) x (how often each one goes STALE).
  //
  // The second factor is the dangerous one, because it scales with ELAPSED TIME rather than with
  // the number of images. Remote TTL = max(upstream Cache-Control max-age, minimumCacheTTL).
  // Supabase Storage uploads default to max-age=3600 and Next 16's minimumCacheTTL defaults to
  // 14400, so the stock TTL is 4 HOURS -- every cache key re-transforms up to 6x/day, ~180x/month,
  // which supports roughly 27 keys against the 5,000 allowance. Setting both sides long turns that
  // into ~1 transformation per key, ever.
  //
  // See docs/design/image-storage-discovery.md 2b. The upload action sets the matching
  // cacheControl on the object; changing one side without the other silently reverts to max().
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xggomcitqrkaylqezjjz.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],

    // One year. This is the half of max() that Next controls; the other half is the object's own
    // Cache-Control, set at upload. Safe because we never overwrite an object in place -- a
    // replaced avatar is written to a NEW uuid path, so a long TTL can never serve a stale image.
    // That invariant is enforced structurally: the storage policies grant INSERT/DELETE and
    // deliberately no UPDATE.
    minimumCacheTTL: 31536000,

    // Trimmed from the 8 defaults [640,750,828,1080,1200,1920,2048,3840]. Each entry below is one
    // of the project's actual breakpoints (src/styles/tokens.css: sm 640, md 768, lg 1024, xl 1280,
    // 2xl 1536) plus 1920 for large desktop. Dropping 2048 and 3840 removes the two most expensive
    // widths, which no Servyou layout requests -- the widest measured image region is D1's 432px
    // gallery and the widest frame is 1440.
    deviceSizes: [640, 768, 1024, 1280, 1536, 1920],

    // Trimmed from the 7 defaults [32,48,64,96,128,256,384]. These serve FIXED-size images, which
    // on Servyou means avatars (24/32/40/56/80/120 -- ui/avatar.tsx), the 48px G9 order-row thumb,
    // and the 128px shop logo. 256 covers the largest (120 and 128) at 2x. A 1x 48px thumb rounds
    // up to 64, an 8px over-fetch that costs one fewer cache key than keeping 48.
    imageSizes: [32, 64, 96, 128, 256],

    // Both pinned rather than left to the default, because each additional entry MULTIPLIES the
    // cache-key space -- formats via the normalized Accept header, qualities via `q`. Next 16
    // currently defaults to exactly these single values; pinning means a future default that adds
    // AVIF cannot silently double our transformation count.
    formats: ['image/webp'],
    qualities: [75],

    // ⚑ LOCAL DEV ONLY — never true in a production build.
    //
    // Next 16's SSRF guard (`fetchExternalImage`, image-optimizer.js:896) aborts with 400 if ANY
    // address the upstream host resolves to is private. This machine's DNS64 resolver returns two
    // NAT64 addresses (64:ff9b::/96) for xggomcitqrkaylqezjjz.supabase.co alongside its real public
    // Cloudflare IPs, so every Supabase image 400s locally while `remotePatterns` is correct and
    // matching. The flag skips that guard.
    //
    // The NODE_ENV fence is the whole safety story: `next build` sets NODE_ENV=production, so a
    // deployed bundle always carries `false` and keeps the guard. Do NOT hoist this to an
    // unconditional `true` to "make it consistent".
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
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
