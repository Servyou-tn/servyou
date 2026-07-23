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
  '**/freelancer-config-rls.test.ts',
  '**/buyer-cancellation-history.test.ts',
  '**/profiles-rls.test.ts',
  '**/job-limits.test.ts',
  '**/progressive-phone.integration.test.ts',
]

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    env: loadEnv(mode, process.cwd(), ''),
    // Default (unit) run skips the live-DB suites.
    exclude: [...configDefaults.exclude, ...INTEGRATION_GLOBS],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
}))
