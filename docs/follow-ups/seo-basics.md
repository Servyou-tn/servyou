# SEO basics — follow-ups (`chore/seo-basics`, 2026-11-12)

## 1. The sitemap stops at 1,000 rows per kind

**What:** `src/lib/seo/sitemap-data.ts` reads at most 1,000 freelancers, shops, products, services and categories each
(Supabase's REST API caps a read at 1,000 rows), freshest first. Anything beyond is silently left out.
**Why deferred:** today's counts are far below it (181 URLs in total on 2026-11-12).
**Where it lives:** `SITEMAP_CAP` in `src/lib/seo/sitemap-data.ts`, `src/app/sitemap.ts`.
**Trigger:** any kind passes ~800 rows. Then split it with Next's `generateSitemaps` (one sitemap per kind, paginated
with `.range()`).

## 2. A failed read is cached for an hour

**What:** if one read fails when the sitemap is (re)built, that kind is reported and left out, and the result is cached
for `revalidate = 3600` seconds. A crawler could fetch a sitemap with, say, no products during that hour.
**Why deferred:** a transient blip costs at most one hour of a partial sitemap. Search engines keep URLs they already
know, so nothing is de-indexed.
**Where it lives:** `src/app/sitemap.ts`, `src/lib/seo/sitemap-data.ts`.
**Trigger:** Sentry shows `sitemap …` query errors more than once. Then throw on a failed read instead, so Next serves
the last good sitemap.

## 3. Launch day: switch the site address

**What:** set `NEXT_PUBLIC_SITE_URL=https://servyou.tn` on Vercel Production, then redeploy. The value is inlined at
build time. Canonical links, Open Graph urls, robots.txt and the sitemap all follow.
**Why deferred:** the domain is not live yet.
**Where it lives:** `src/lib/seo/site-url.ts`, `.env.example`.
**Trigger:** the servyou.tn DNS points to Vercel.
