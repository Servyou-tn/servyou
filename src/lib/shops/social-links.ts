// A shop's social links: shops.facebook_url, instagram_url, tiktok_url (migration « shop_social_links »). The database
// CHECKs (shops_<platform>_url_valid) and these helpers apply the SAME rule — the patterns below are the CHECKs'
// patterns character for character, and social-links.test.ts fails if the migration and this module drift:
//   * https only; the host is the platform's exactly (www. allowed; Facebook also m.facebook.com and fb.com);
//   * no userinfo (`https://facebook.com@evil.io` opens evil.io), no port, no trailing dot — the host must be followed by
//     `/`, `?`, `#` or the end;
//   * after the host: no ASCII control character, no space, no backslash;
//   * at most 300 characters, counted in code points like Postgres char_length.
// Deliberately narrower than detectPlatform (lib/social/platforms.ts), which accepts any subdomain plus fb.me / instagr.am.

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
  facebook: String.raw`^https://((www\.|m\.)?facebook\.com|(www\.)?fb\.com)([/?#][^\x01-\x20\x7f\\]*)?$`,
  instagram: String.raw`^https://(www\.)?instagram\.com([/?#][^\x01-\x20\x7f\\]*)?$`,
  tiktok: String.raw`^https://(www\.)?tiktok\.com([/?#][^\x01-\x20\x7f\\]*)?$`,
}

const REGEX: Record<ShopSocialPlatform, RegExp> = {
  facebook: new RegExp(SHOP_SOCIAL_URL_PATTERNS.facebook, 'i'),
  instagram: new RegExp(SHOP_SOCIAL_URL_PATTERNS.instagram, 'i'),
  tiktok: new RegExp(SHOP_SOCIAL_URL_PATTERNS.tiktok, 'i'),
}

/** True when the database would accept this exact value in the platform's column. No trimming, no normalising. */
export function isShopSocialUrl(platform: ShopSocialPlatform, value: string): boolean {
  return [...value].length <= SHOP_SOCIAL_URL_MAX && REGEX[platform].test(value)
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
