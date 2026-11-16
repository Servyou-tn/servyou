// The opt-in live-DB run (vitest.integration.config.ts) refuses to start without the Supabase values the suites need.
//
// Every live suite is gated by `describe.skipIf(!hasCreds)`. Before this guard, a run without the values skipped every
// test and still exited 0: « green » while nothing ran (a git worktree has no .env.local of its own). Now the config
// throws before any file is collected, so a live run either runs or fails. The default `vitest run` (and CI) never
// loads that config: it excludes the live suites through INTEGRATION_GLOBS.

// What the live suites read from process.env (all of them, and nothing else).
export const LIVE_ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const

// A blank value counts as missing: .env.example ships the three keys empty, so a copy that was never filled in has them.
export function missingLiveEnv(env: Readonly<Record<string, string | undefined>>): string[] {
  return LIVE_ENV_KEYS.filter((key) => !env[key]?.trim())
}

// `env` is the object the config passes to `test.env` (vite's loadEnv: the shell, then .env / .env.local in `dir`).
export function assertLiveEnv(env: Readonly<Record<string, string | undefined>>, dir: string): void {
  const missing = missingLiveEnv(env)
  if (missing.length === 0) return
  throw new Error(
    [
      `Live suites refused to start: ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} missing or blank.`,
      `They are read from the shell, or from .env / .env.local in ${dir}. A git worktree has no .env.local of its own:`,
      'export the three values in the shell that runs vitest, or give the worktree a .env.local.',
      'Without them every live suite would skip and the run would pass without testing anything.',
    ].join('\n'),
  )
}
