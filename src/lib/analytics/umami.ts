// Umami Cloud — cookieless, anonymous visit statistics (EU region; founder setup: website « ServYou », timezone Africa/Tunis,
// no public share link). The website ID is public by design: it ships in every page's HTML.
//
// Four locks, each one tested in umami.test.tsx:
//   1. PRODUCTION ONLY — the root layout renders <UmamiScript /> only when `umamiEnabled(process.env.VERCEL_ENV)`. It is read on the
//      server: VERCEL_ENV is not a NEXT_PUBLIC_ variable, so a client file would see `undefined`. Never on localhost or a preview.
//   2. AUDIENCE CONSENT — the A7 banner's optional « Mesure d'audience » category (lib/consent/consent.ts): no script until the visitor
//      says yes there, and `filterUmamiPayload` drops every event once they withdraw (a loaded script stays loaded until a reload).
//   3. NEVER ON ADMIN PAGES — the script is not rendered on an excluded path AND `filterUmamiPayload` drops any event for one: once
//      loaded on a public page, the tracker follows client-side navigation (it wraps history.pushState) into /admin on its own.
//   4. NO QUERY STRING OR HASH LEAVES THE SITE — reset / confirm codes and tokens ride in query strings. With data-exclude-search and
//      data-exclude-hash the tracker strips both from the page URL AND from the referrer before it builds the payload; the filter
//      strips them again, and blanks the page title (a public profile's title is a person's name).
// data-domains is a second net against preview noise: the tracker sends nothing at all from a hostname not in the list.
//
// The CSP hosts (script origin + the host events are POSTed to) live in lib/security/headers.ts with the other origins.

import { consentFromCookieString, hasConsent } from '../consent/consent'

export const UMAMI_WEBSITE_ID = '65413837-a167-435c-8ac9-460c5e66de05'
export const UMAMI_SCRIPT_URL = 'https://cloud.umami.is/script.js'

/** Hostnames the tracker may send from — production's vercel.app address and the future own domain. */
export const UMAMI_DOMAINS = ['servyou.vercel.app', 'servyou.tn', 'www.servyou.tn'] as const

/** Name of the global the tracker calls before each send (`data-before-send`). */
export const UMAMI_BEFORE_SEND = 'servyouUmamiBeforeSend'

/** Never tracked: the admin back office and its (planned) sign-in verification step. Matched by whole path segment. */
export const UMAMI_EXCLUDED_PATH_PREFIXES = ['/admin', '/verification-admin'] as const

export function umamiEnabled(vercelEnv: string | undefined): boolean {
  return vercelEnv === 'production'
}

/** Percent-decoded, lower-cased, repeated slashes collapsed — so `/%61dmin`, `//admin` or `/ADMIN` cannot slip past the prefix check. */
function normalizePath(pathname: string): string {
  let decoded = pathname
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    // A malformed escape: match on the raw text.
  }
  return decoded.replace(/\/{2,}/g, '/').toLowerCase()
}

/** `/admin` and everything under `/admin/`, same for `/verification-admin` — but not a look-alike such as `/administrateur`. */
export function isExcludedPath(pathname: string): boolean {
  const path = normalizePath(pathname)
  return UMAMI_EXCLUDED_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function umamiScriptAttributes() {
  return {
    'data-website-id': UMAMI_WEBSITE_ID,
    'data-domains': UMAMI_DOMAINS.join(','),
    'data-exclude-search': 'true',
    'data-exclude-hash': 'true',
    'data-before-send': UMAMI_BEFORE_SEND,
  } as const
}

/** What the tracker hands to before-send: `url` is the full page URL, `referrer` a path for same-site referrers. */
export type UmamiPayload = Record<string, unknown> & { url?: unknown; referrer?: unknown }

const RELATIVE_BASE = 'https://servyou.invalid'

function parse(value: string): URL | null {
  try {
    return new URL(value, RELATIVE_BASE)
  } catch {
    return null
  }
}

/** The value without its query string and hash, in the same form it came in (a path stays a path, a full URL stays a full URL). */
function withoutSearchAndHash(value: string, url: URL): string {
  return url.origin === RELATIVE_BASE ? url.pathname : `${url.origin}${url.pathname}`
}

/** Same site: a path, or a full URL on one of the production hostnames (www.servyou.tn → servyou.tn arrives as a full URL). */
function isSameSite(url: URL): boolean {
  return url.origin === RELATIVE_BASE || (UMAMI_DOMAINS as readonly string[]).includes(url.hostname)
}

/**
 * The before-send filter. Returns the payload to send, or null to send nothing:
 *   • null without a valid « yes » to audience measurement in `cookies` (the live `document.cookie`);
 *   • null for an excluded (admin) page, or a payload whose URL cannot be read (fail closed);
 *   • an admin page as the same-site referrer is blanked, so leaving the back office leaves no trace either;
 *   • the query string and hash are cut from `url` and `referrer` HERE too. data-exclude-search / data-exclude-hash already make
 *     the tracker do it, but the tracker is Umami's live CDN script, not a pinned copy — the guarantee must not rest on it alone;
 *   • the page title is blanked: the tracker sends document.title as-is, and a public freelancer profile is titled with the
 *     person's full name. The privacy policy says « aucune donnée personnelle » — founder ruling D3 on #371 (pages are still
 *     told apart by their URL).
 */
export function filterUmamiPayload<P extends UmamiPayload>(payload: P, cookies: string): P | null {
  if (!hasConsent(consentFromCookieString(cookies), 'audience')) return null
  const page = typeof payload.url === 'string' ? parse(payload.url) : null
  if (page === null || isExcludedPath(page.pathname)) return null
  const cleaned: P = { ...payload, url: withoutSearchAndHash(payload.url as string, page), title: '' }
  if (typeof payload.referrer === 'string' && payload.referrer !== '') {
    const referrer = parse(payload.referrer)
    if (referrer === null || (isSameSite(referrer) && isExcludedPath(referrer.pathname))) return { ...cleaned, referrer: '' }
    return { ...cleaned, referrer: withoutSearchAndHash(payload.referrer, referrer) }
  }
  return cleaned
}
