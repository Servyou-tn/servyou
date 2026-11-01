import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  isShopSocialUrl,
  SHOP_SOCIAL_PLATFORMS,
  SHOP_SOCIAL_COLUMNS,
  SHOP_SOCIAL_URL_PATTERNS,
  ShopSocialLinksSchema,
  shopSocialUrlSchema,
  type ShopSocialPlatform,
} from './social-links'

// Every row was run through the live database's `~*` with the migration's patterns on 2026-11-01 (a SELECT, no write);
// `ok` is what Postgres answered. The JS twin must answer the same on every row.
const CASES: [ShopSocialPlatform, string, boolean][] = [
  ['facebook', 'https://facebook.com/servyou', true],
  ['facebook', 'https://www.facebook.com/servyou', true],
  ['facebook', 'https://m.facebook.com/profile.php?id=1', true],
  ['facebook', 'https://fb.com/servyou', true],
  ['facebook', 'https://www.fb.com/x', true],
  ['facebook', 'HTTPS://WWW.FACEBOOK.COM/X', true],
  ['facebook', 'https://FB.com/x', true],
  ['facebook', 'https://facebook.com', true],
  ['facebook', 'https://facebook.com?x=1', true],
  ['facebook', 'https://facebook.com#x', true],
  ['facebook', 'https://facebook.com/صفحة', true],
  ['facebook', 'https://facebook.com/x y', true],
  ['facebook', 'http://facebook.com/x', false],
  ['facebook', '', false],
  ['facebook', 'https://facebook.com@evil.io', false],
  ['facebook', 'https://user@facebook.com/x', false],
  ['facebook', 'https://facebook.com.evil.io/x', false],
  ['facebook', 'https://evilfacebook.com/x', false],
  ['facebook', 'https://facebook.com:443/x', false],
  ['facebook', 'https://facebook.com./x', false],
  ['facebook', 'https://facebook.com%2e/x', false],
  ['facebook', 'https://facebook.com\\@evil.io', false],
  ['facebook', 'https://facebook.com/x\ty', false],
  ['facebook', 'https://facebook.com/x\n', false],
  ['facebook', 'https://facebook.com/x\u007f', false],
  ['facebook', 'https://facebook.com/x y', false],
  ['facebook', 'https://facebook.com/x\\y', false],
  ['facebook', ' https://facebook.com/x', false],
  ['facebook', 'javascript:alert(1)//facebook.com', false],
  ['facebook', 'https://m.fb.com/x', false],
  ['facebook', 'https://fb.me/x', false],
  ['facebook', 'https://web.facebook.com/x', false],
  ['facebook', 'https://www.m.facebook.com/x', false],
  ['instagram', 'https://instagram.com/servyou', true],
  ['instagram', 'https://www.instagram.com/servyou/', true],
  ['instagram', 'https://instagr.am/x', false],
  ['instagram', 'https://m.instagram.com/x', false],
  ['instagram', 'https://instagram.com.evil.io', false],
  ['instagram', 'https://facebook.com/x', false],
  ['instagram', 'http://instagram.com/x', false],
  ['tiktok', 'https://tiktok.com/@servyou', true],
  ['tiktok', 'https://www.tiktok.com/@servyou/video/123', true],
  ['tiktok', 'https://vm.tiktok.com/ZM123/', false],
  ['tiktok', 'https://m.tiktok.com/@x', false],
  ['tiktok', 'https://tiktok.com@evil.io', false],
  ['tiktok', 'https://instagram.com/x', false],
]

describe('isShopSocialUrl — same answers as the database CHECKs', () => {
  it.each(CASES)('%s %j → %s', (platform, value, ok) => {
    expect(isShopSocialUrl(platform, value)).toBe(ok)
  })

  it.each(SHOP_SOCIAL_PLATFORMS)('%s: 300 characters pass, 301 are refused (code points, like char_length)', (platform) => {
    const base = { facebook: 'https://facebook.com/', instagram: 'https://instagram.com/', tiktok: 'https://tiktok.com/' }[platform]
    expect(isShopSocialUrl(platform, base + 'a'.repeat(300 - base.length))).toBe(true)
    expect(isShopSocialUrl(platform, base + 'a'.repeat(301 - base.length))).toBe(false)
    // One emoji is 2 UTF-16 units but 1 code point: 300 code points still pass.
    expect(isShopSocialUrl(platform, base + '😀' + 'a'.repeat(299 - base.length))).toBe(true)
  })
})

describe('isShopSocialUrl — text Postgres cannot store', () => {
  // Not in the database table above: a NUL or a lone surrogate never reaches the CHECK (encoding error instead).
  it.each([
    ['NUL', 'https://tiktok.com/a\u0000b'],
    ['lone high surrogate', 'https://tiktok.com/a\ud83db'],
    ['lone low surrogate', 'https://tiktok.com/a\ude00b'],
    ['high surrogate at the end', 'https://tiktok.com/a\ud83d'],
  ])('refuses a %s', (_label, value) => {
    expect(isShopSocialUrl('tiktok', value)).toBe(false)
    expect(shopSocialUrlSchema('tiktok').safeParse(value).success).toBe(false)
  })

  it('a well-formed surrogate pair (emoji) still passes', () => {
    expect(isShopSocialUrl('tiktok', 'https://tiktok.com/@s😀')).toBe(true)
  })
})

describe('shopSocialUrlSchema', () => {
  it("'' and whitespace become null (a cleared field)", () => {
    expect(shopSocialUrlSchema('facebook').parse('')).toBeNull()
    expect(shopSocialUrlSchema('facebook').parse('   ')).toBeNull()
  })

  it('trims, and adds https:// to an address typed without a scheme', () => {
    expect(shopSocialUrlSchema('instagram').parse('  instagram.com/servyou ')).toBe('https://instagram.com/servyou')
    expect(shopSocialUrlSchema('tiktok').parse('www.tiktok.com/@servyou')).toBe('https://www.tiktok.com/@servyou')
  })

  it('refuses http, another platform, userinfo and a look-alike host', () => {
    for (const [platform, value] of [
      ['facebook', 'http://facebook.com/x'],
      ['facebook', 'instagram.com/x'],
      ['instagram', 'https://instagram.com@evil.io'],
      ['tiktok', 'tiktok.com.evil.io/@x'],
      ['facebook', 'javascript:alert(1)'],
    ] as const) {
      const r = shopSocialUrlSchema(platform).safeParse(value)
      expect(r.success).toBe(false)
      expect(r.error?.issues[0]?.message).toBe(`invalid_${platform}_url`)
    }
  })

  it('every value it outputs passes the database rule', () => {
    for (const [platform, value, ok] of CASES) {
      const r = shopSocialUrlSchema(platform).safeParse(value)
      if (r.success && r.data !== null) expect(isShopSocialUrl(platform, r.data)).toBe(true)
      if (ok) expect(r.success).toBe(true)
    }
  })

  it('ShopSocialLinksSchema keys the three fields by column', () => {
    expect(ShopSocialLinksSchema.parse({ facebook_url: 'fb.com/servyou', instagram_url: '', tiktok_url: 'https://tiktok.com/@s' })).toEqual({
      facebook_url: 'https://fb.com/servyou',
      instagram_url: null,
      tiktok_url: 'https://tiktok.com/@s',
    })
  })
})

describe('the migration and this module do not drift', () => {
  const dir = join(process.cwd(), 'db', 'migrations')
  const files = readdirSync(dir).filter((f) => f.endsWith('shop_social_links.sql'))

  it('exactly one shop_social_links migration', () => {
    expect(files).toHaveLength(1)
  })

  it.each(SHOP_SOCIAL_PLATFORMS)('%s: the CHECK uses the same pattern, the same column and the same 300 limit', (platform) => {
    const sql = readFileSync(join(dir, files[0]), 'utf8')
    const column = SHOP_SOCIAL_COLUMNS[platform]
    expect(sql).toContain(`constraint shops_${column}_valid`)
    expect(sql).toContain(`char_length(${column}) <= 300`)
    expect(sql).toContain(`${column} ~* '${SHOP_SOCIAL_URL_PATTERNS[platform]}'`)
  })
})
