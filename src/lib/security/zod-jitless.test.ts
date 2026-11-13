import { describe, it, expect } from 'vitest'
import { config, globalConfig } from 'zod/v4/core'
import { enableZodJitless } from './zod-jitless'

// Pins the zod contract enableZodJitless relies on. If it fails after a zod upgrade, zod no longer reads its config from
// globalThis.__zod_globalConfig: go back to `config({ jitless: true })` from 'zod/v4/core' in src/instrumentation-client.ts
// (a few KB on every page) rather than lose jitless — without it the enforced CSP reports a blocked eval on schema pages.
describe('enableZodJitless', () => {
  it("zod's own config object is the one on globalThis.__zod_globalConfig", () => {
    expect(globalConfig).toBe((globalThis as { __zod_globalConfig?: object }).__zod_globalConfig)
  })

  it('turns jitless on in the config zod reads', () => {
    enableZodJitless()
    expect(config().jitless).toBe(true)
  })
})
