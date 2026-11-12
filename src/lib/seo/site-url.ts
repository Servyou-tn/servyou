// The site's public address, in ONE place (audit checklist 5): metadataBase (canonical, Open Graph urls), robots.txt
// and sitemap.xml all read it. NEXT_PUBLIC_SITE_URL switches it — https://servyou.tn on launch day. It is inlined at
// build time (NEXT_PUBLIC_*), so changing it on Vercel needs a redeploy.

export const DEFAULT_SITE_URL = 'https://servyou.vercel.app'

/** The site origin, no trailing slash. Unset, blank or not an http(s) URL → the default. */
export function siteUrl(raw: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  const value = raw?.trim()
  if (!value) return DEFAULT_SITE_URL
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : DEFAULT_SITE_URL
  } catch {
    return DEFAULT_SITE_URL
  }
}
