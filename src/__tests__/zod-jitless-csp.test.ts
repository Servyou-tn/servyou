/**
 * The enforced CSP has no 'unsafe-eval' (src/lib/security/headers.ts). zod 4 probes `Function("")` when it builds an
 * object schema; the throw is caught, but the browser still reports a blocked eval on every page that ships a schema.
 * src/instrumentation-client.ts sets zod's `jitless`, which skips the probe — this fails if that line goes.
 */

import { describe, it, expect, vi } from 'vitest'

describe('zod never evaluates a string in the browser bundle', () => {
  it('the client instrumentation sets jitless before a schema is built, and no Function call follows', async () => {
    const fn = vi.spyOn(globalThis, 'Function')
    await import('@/instrumentation-client')
    const { z } = await import('zod')
    expect(z.config().jitless).toBe(true)
    expect(z.object({ kind: z.enum(['shop', 'freelancer']), id: z.string() }).parse({ kind: 'shop', id: 'x' })).toEqual({ kind: 'shop', id: 'x' })
    expect(fn).not.toHaveBeenCalled()
    fn.mockRestore()
  })
})
