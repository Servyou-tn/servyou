/**
 * Search-engine indexing switch (src/lib/seo/indexing.ts, served by next.config.ts). servyou.tn went live on
 * 16 Nov 2026 with test data still in production, so until the public launch every route answers
 * `X-Robots-Tag: noindex, nofollow`. A dropped header would let search engines index test shops and orders, so it
 * fails here, not in production:
 *   • the switch is closed before launch (the launch-day PR flips this pin on purpose);
 *   • closed → exactly one header, `X-Robots-Tag: noindex, nofollow`; open → none;
 *   • next.config.ts serves it on every route, next to the security headers;
 *   • robots.txt keeps letting crawlers in, so they fetch pages and see the header.
 * Run by path.
 */

import { describe, it, expect } from 'vitest'
import { indexingHeaders, NOINDEX_HEADER, SEARCH_INDEXING_OPEN } from '@/lib/seo/indexing'
import robots from '@/app/robots'
import nextConfig from '../../next.config'

describe('indexing switch', () => {
  it('is closed until the public launch', () => {
    expect(SEARCH_INDEXING_OPEN).toBe(false)
  })

  it('closed: one noindex, nofollow header', () => {
    expect(indexingHeaders(false)).toEqual([{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }])
  })

  it('open: no indexing header at all', () => {
    expect(indexingHeaders(true)).toEqual([])
  })

  it('returns a copy, so a caller cannot change the shared constant', () => {
    const [h] = indexingHeaders(false)
    h.value = 'all'
    expect(NOINDEX_HEADER.value).toBe('noindex, nofollow')
  })
})

describe('next.config.ts', () => {
  it('serves X-Robots-Tag: noindex, nofollow on every route', async () => {
    const rules = await nextConfig.headers!()
    const everyRoute = rules.find((r) => r.source === '/:path*')
    expect(everyRoute).toBeDefined()
    const robotsHeaders = everyRoute!.headers.filter((h) => h.key.toLowerCase() === 'x-robots-tag')
    expect(robotsHeaders).toEqual([{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }])
  })

  it('keeps the security headers next to it', async () => {
    const rules = await nextConfig.headers!()
    const keys = rules.find((r) => r.source === '/:path*')!.headers.map((h) => h.key)
    expect(keys).toContain('Content-Security-Policy')
    expect(keys).toContain('Strict-Transport-Security')
  })
})

describe('robots.txt', () => {
  it('still lets crawlers fetch the public pages, so they read the noindex header', () => {
    const rules = robots().rules
    const list = Array.isArray(rules) ? rules : [rules]
    const all = list.find((r) => r.userAgent === '*')
    expect(all?.allow).toBe('/')
    const disallow = ([] as string[]).concat(all?.disallow ?? [])
    expect(disallow).not.toContain('/')
  })
})
