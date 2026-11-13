// zod 4 probes `Function("")` when it builds an object schema, to decide whether it may compile a faster parser. The throw is
// caught, but the enforced CSP (no 'unsafe-eval', src/lib/security/headers.ts) still reports it as a blocked eval on every page
// that builds a schema in the browser (the service wizard…). `jitless` skips the probe — zod's documented switch for strict
// CSPs; parsing stays the same, only the compiled fast path is dropped.
//
// It used to be set with `config({ jitless: true })` imported from 'zod/v4/core', in src/instrumentation-client.ts — which
// put part of zod in every page's JavaScript (speed PR-1). zod keeps that config object on `globalThis.__zod_globalConfig`
// and adopts an existing one when it loads (zod 4.6, v4/core/core.js), so writing the flag there, before any zod module
// runs, has the same effect with no import. zod-jitless.test.ts fails if a zod upgrade stops sharing that object.

type ZodGlobal = { __zod_globalConfig?: { jitless?: boolean } }

export function enableZodJitless(): void {
  const scope = globalThis as ZodGlobal
  scope.__zod_globalConfig ??= {}
  scope.__zod_globalConfig.jitless = true
}
