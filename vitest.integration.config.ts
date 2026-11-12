import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { loadEnv } from 'vite'
import { INTEGRATION_GLOBS } from './vitest.config'

// Opt-in integration run: `npm run test:integration`. Includes ONLY the live-Supabase
// suites (the inverse of the default unit run). Needs NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY (from .env.local). When
// absent, each suite skips cleanly via describe.skipIf rather than throwing.
export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    env: loadEnv(mode, process.cwd(), ''),
    include: INTEGRATION_GLOBS,
    // One live suite at a time (db-guardian rule; was only the --no-file-parallelism flag on the command line).
    // The suites share one production database, and every admin-granting suite ends with assertNoTestAdmin()
    // (audit H6), which another suite's admin fixture mid-run would trip.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
}))
