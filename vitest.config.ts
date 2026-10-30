import { defineConfig, configDefaults } from 'vitest/config'
import { resolve } from 'path'
import { loadEnv } from 'vite'

// Live-Supabase integration suites — they hit the Admin API and need real DB
// service_role creds. Excluded from the default `vitest run` so CI (and any
// credential-less run) is a pure unit gate with NO production-database access.
// Run them opt-in with `npm run test:integration` (see vitest.integration.config.ts).
export const INTEGRATION_GLOBS = [
  '**/shop-config-rls.test.ts',
  '**/shop-check-constraints.test.ts',
  '**/buyer-cancellation-history.test.ts',
  '**/order-delivery-fee-snapshot.test.ts',
  '**/orders-insert-integrity.test.ts',
  '**/seller-capability-integrity.test.ts',
  '**/job-responses-integrity.test.ts',
  '**/profiles-rls.test.ts',
  '**/profiles-client-insert-delete-revoked.test.ts',
  '**/public-profiles-read-only.test.ts',
  '**/suspension-enforcement.test.ts',
  '**/job-limits.test.ts',
  '**/progressive-phone.integration.test.ts',
  '**/uploaded-objects-provenance-rls.test.ts',
  '**/category-embeds-unambiguous.test.ts',
  '**/prelaunch-shop-read-rls.test.ts',
  '**/orders-lifecycle-columns.test.ts',
  '**/job-posts-response-count.test.ts',
  '**/prelaunch-acl-hardening.test.ts',
  '**/job-responses-proposal-fields.test.ts',
  '**/job-posts-responder-read.test.ts',
  '**/storage-upload-provenance.test.ts',
  '**/storage-uploads-service-role.test.ts',
  '**/storage-verifications-no-client-insert.test.ts',
  '**/image-count-caps.test.ts',
  '**/moderated-freelancer-read-rls.test.ts',
  '**/job-posts-write-guards.test.ts',
  '**/profiles-email-sync.test.ts',
  '**/security-followups-batch.test.ts',
  '**/security-followups-batch-2.test.ts',
  '**/order-cancel-buyer-service.test.ts',
  '**/notification-prefs-missions.test.ts',
  '**/notification-prefs-favorites.test.ts',
  '**/reports-anti-abuse.test.ts',
  '**/orders-jobposts-caps.test.ts',
  // These nine wrote to production on every default run until 2026-10-26 (missions M-A PR).
  '**/d4-completed-project-count.test.ts',
  '**/d4-freelancer-services-visibility.test.ts',
  '**/freelancer-details-wizard.test.ts',
  '**/freelancer-publish-gate-rls.test.ts',
  '**/h3-links-portfolio-rls.test.ts',
  '**/h5-service-delete-orders-gate.test.ts',
  '**/h5-service-monthly-stats.test.ts',
  '**/h5-service-status-cascade.test.ts',
  '**/h6-service-listings-hardening-rls.test.ts',
]

// Tooling artifacts that must never be scanned for tests: the headless-Chrome VRT profiles (a
// force-installed browser extension ships its own *.spec.js written for jest), the static
// Storybook build, and the VRT capture dirs. All are gitignored, but vitest scans the filesystem.
const ARTIFACT_GLOBS = [
  '**/.vrt-*-profile/**',
  '**/storybook-static/**',
  '**/scripts/vrt/__*__/**',
]

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    env: loadEnv(mode, process.cwd(), ''),
    // Default (unit) run skips the live-DB suites + tooling artifacts.
    exclude: [...configDefaults.exclude, ...INTEGRATION_GLOBS, ...ARTIFACT_GLOBS],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
}))
