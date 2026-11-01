// A shop's social links: shops.facebook_url, instagram_url, tiktok_url (migration « shop_social_links »). The database
// CHECKs (shops_<platform>_url_valid) and these helpers apply the SAME rule — the patterns below are the CHECKs'
// patterns character for character, and social-links.test.ts fails if the migration and this module drift:
//   * https only; the host is one of the platform's, exactly — Facebook: (www. | m. | web.)facebook.com, (www.)fb.com,
//     fb.me; Instagram: (www.)instagram.com, instagr.am; TikTok: (www. | vm. | m.)tiktok.com;
//   * no userinfo (`https://facebook.com@evil.io` opens evil.io), no port, no trailing dot — the host must be followed by
//     `/`, `?`, `#` or the end;
//   * after the host: no ASCII control character, no space, no backslash;
//   * at most 300 characters, counted in code points like Postgres char_length.
// The same hosts the freelancer links accept (lib/social/platforms.ts), as a closed list: detectPlatform takes ANY
// subdomain, this takes only the listed ones.

import { z } from 'zod'
import { normalizeUrl } from '@/lib/social/platforms'

export const SHOP_SOCIAL_PLATFORMS = ['facebook', 'instagram', 'tiktok'] as const

export type ShopSocialPlatform = (typeof SHOP_SOCIAL_PLATFORMS)[number]

export const SHOP_SOCIAL_COLUMNS = {
  facebook: 'facebook_url',
  instagram: 'instagram_url',
  tiktok: 'tiktok_url',
} as const satisfies Record<ShopSocialPlatform, string>

export const SHOP_SOCIAL_URL_MAX = 300

/** The CHECK patterns (Postgres `~*`, case-insensitive). Same source in JS with the `i` flag. */
export const SHOP_SOCIAL_URL_PATTERNS: Record<ShopSocialPlatform, string> = {
  facebook: String.raw`^https://((www\.|m\.|web\.)?facebook\.com|(www\.)?fb\.com|fb\.me)([/?#][^\x01-\x20\x7f\\]*)?$`,
  instagram: String.raw`^https://((www\.)?instagram\.com|instagr\.am)([/?#][^\x01-\x20\x7f\\]*)?$`,
  tiktok: String.raw`^https://(www\.|vm\.|m\.)?tiktok\.com([/?#][^\x01-\x20\x7f\\]*)?$`,
}

const REGEX: Record<ShopSocialPlatform, RegExp> = {
  facebook: new RegExp(SHOP_SOCIAL_URL_PATTERNS.facebook, 'i'),
  instagram: new RegExp(SHOP_SOCIAL_URL_PATTERNS.instagram, 'i'),
  tiktok: new RegExp(SHOP_SOCIAL_URL_PATTERNS.tiktok, 'i'),
}

/**
 * False for what a Postgres text value cannot hold at all — NUL, or a lone UTF-16 surrogate — which the patterns'
 * `\x01` lower bound lets through: the database would refuse it with an encoding error, not the CHECK's 23514.
 * A loop, not String#isWellFormed, which older mobile browsers lack.
 */
function isStorableText(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code === 0 || (code >= 0xdc00 && code <= 0xdfff)) return false
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false
      i++
    }
  }
  return true
}

/** True when the database would accept this exact value in the platform's column. No trimming, no normalising. */
export function isShopSocialUrl(platform: ShopSocialPlatform, value: string): boolean {
  return isStorableText(value) && [...value].length <= SHOP_SOCIAL_URL_MAX && REGEX[platform].test(value)
}

/**
 * One social-link field: trimmed; '' → null (a cleared field); « instagram.com/x » (no scheme) gets `https://`
 * (normalizeUrl, the links kit's rule); then the database rule. Output: the value to store, or null.
 */
export const shopSocialUrlSchema = (platform: ShopSocialPlatform) =>
  z
    .string()
    .trim()
    .transform((raw, ctx) => {
      if (raw === '') return null
      const url = normalizeUrl(raw)
      if (!isShopSocialUrl(platform, url)) {
        ctx.addIssue({ code: 'custom', message: `invalid_${platform}_url` })
        return z.NEVER
      }
      return url
    })

/** The three fields as one payload, keyed by column name — ready for `.update()` on shops. */
export const ShopSocialLinksSchema = z.object({
  facebook_url: shopSocialUrlSchema('facebook'),
  instagram_url: shopSocialUrlSchema('instagram'),
  tiktok_url: shopSocialUrlSchema('tiktok'),
})

export type ShopSocialLinks = z.output<typeof ShopSocialLinksSchema>
