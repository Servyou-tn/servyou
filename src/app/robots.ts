import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/seo/site-url'
import { DISALLOWED_PREFIXES } from '@/lib/seo/routes'

// /robots.txt (audit checklist 5): crawl the public pages, stay out of every private area, find the sitemap.
// The lists live in src/lib/seo/routes.ts. /_next/ stays crawlable: search engines need its CSS and JS to render pages.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: [...DISALLOWED_PREFIXES] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
