import type { Metadata } from 'next'
import { t, type Lang } from '@/lib/i18n'
import { getLang } from '@/lib/i18n/server'

// Search and share metadata (audit checklist 5). The root layout sets metadataBase (siteUrl()), the title template
// « %s · ServYou », the default description and robots NOINDEX — so every page is private unless it opts in here.
//
// A public page returns publicMetadata(): its own title + description in the visitor's language, a canonical path
// (relative — metadataBase resolves it), robots index, and complete Open Graph + Twitter objects. Complete because
// Next.js replaces a parent's `openGraph` / `twitter` object wholesale when a page sets one (no deep merge).
//
// One URL serves every language (the language is a cookie), so there is no hreflang: crawlers and link previews,
// which carry no cookie, read the French version.

export const SITE_NAME = 'ServYou'
export const TITLE_TEMPLATE = `%s · ${SITE_NAME}`

/** Open Graph locale per interface language. */
export const OG_LOCALE: Record<Lang, string> = { fr: 'fr_TN', ar: 'ar_TN', en: 'en_GB' }

const DESCRIPTION_MAX = 160
const TITLE_PART_MAX = 60

/** Cuts user text at a word boundary with « … » so a search snippet stays readable. */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.—–-]+$/, '')}…`
}

export type PublicPageInput = {
  /** The page's own title; the template adds « · ServYou ». */
  title: string
  description: string
  /** Canonical path, e.g. « /faq » or « /services/<id> » — no query string. */
  path: string
  lang: Lang
  /** The home page: a full title that skips the template. */
  absoluteTitle?: boolean
  /** Crawlable but kept out of the index (the search results page). */
  noindex?: boolean
}

/** Pure: the Metadata of a public page. */
export function buildPublicMetadata({ title, description, path, lang, absoluteTitle = false, noindex = false }: PublicPageInput): Metadata {
  const pageTitle = truncate(title, TITLE_PART_MAX * 2)
  const fullTitle = absoluteTitle ? pageTitle : TITLE_TEMPLATE.replace('%s', pageTitle)
  const desc = truncate(description, DESCRIPTION_MAX)
  return {
    title: absoluteTitle ? { absolute: pageTitle } : pageTitle,
    description: desc,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { type: 'website', siteName: SITE_NAME, locale: OG_LOCALE[lang], url: path, title: fullTitle, description: desc },
    twitter: { card: 'summary', title: fullTitle, description: desc },
  }
}

/** A public page whose title and description are i18n keys. */
export async function publicMetadata(
  titleKey: string,
  descriptionKey: string,
  path: string,
  options: { absoluteTitle?: boolean; noindex?: boolean } = {},
): Promise<Metadata> {
  const lang = await getLang()
  return buildPublicMetadata({ title: t(titleKey, lang), description: t(descriptionKey, lang), path, lang, ...options })
}

/** « Name — part » for a detail title, the part cut short; just the name when there is no part. */
export function titleWithPart(name: string, part: string | null | undefined): string {
  const extra = part?.trim()
  return extra ? `${truncate(name, TITLE_PART_MAX)} — ${truncate(extra, TITLE_PART_MAX)}` : truncate(name, TITLE_PART_MAX)
}
