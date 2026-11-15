import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { loadEnv } from 'vite'
import { INTEGRATION_GLOBS } from './vitest.config'
import { assertLiveEnv } from './vitest.live-env'

// Opt-in integration run: `npm run test:integration`. Includes ONLY the live-Supabase
// suites (the inverse of the default unit run). Needs NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY (the shell, or .env.local).
// When one is missing or blank, the run FAILS here, before any file is collected: the
// suites' describe.skipIf(!hasCreds) would otherwise skip everything and exit 0.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  assertLiveEnv(env, process.cwd())
  return {
    test: {
      globals: true,
      environment: 'node',
      testTimeout: 30000,
      env,
      include: INTEGRATION_GLOBS,
      // One live suite at a time (db-guardian rule; was only the --no-file-parallelism flag on the command line).
      // The suites share one production database, and every admin-granting suite ends with assertNoTestAdmin()
      // (audit H6), which another suite's admin fixture mid-run would trip.
      fileParallelism: false,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        // Same as vitest.config.ts: Next's own no-op for `import 'server-only'` on the server side.
        'server-only': resolve(__dirname, './node_modules/next/dist/compiled/server-only/empty.js'),
      },
    },
  }
})
