// The social / professional platforms a freelancer can link — ONE source of truth for the profile editor, the public profile, the proposal form and every
// recap that shows a link. Later shops reuse it too.
//
// A platform is recognised from the URL's HOST, never from its text: `detectPlatform` accepts the exact host or a subdomain of it, so
// « github.com », « www.github.com » and « gist.github.com » are GitHub while « evilgithub.com », « github.com.evil.io » and
// « https://github.com@evil.io » (the host there is evil.io) are not. Anything else that parses as a web address is « website » (the globe: any other
// site — ProZ, SoundCloud, Vimeo, X…).

export const PLATFORM_IDS = [
  'linkedin',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'behance',
  'github',
  'dribbble',
  'upwork',
  'fiverr',
  'malt',
  'website',
] as const

export type PlatformId = (typeof PLATFORM_IDS)[number]

type PlatformInfo = {
  id: PlatformId
  labelFr: string
  labelAr: string
  /** Registrable hosts; a subdomain of one of these matches too. Empty for `website`, the fallback. */
  hosts: readonly string[]
  /** What a pre-set row shows in its placeholder — a hint of the address shape, not a value. */
  example: string
}

export const PLATFORMS: Record<PlatformId, PlatformInfo> = {
  linkedin: { id: 'linkedin', labelFr: 'LinkedIn', labelAr: 'LinkedIn', hosts: ['linkedin.com', 'lnkd.in'], example: 'https://linkedin.com/in/votre-nom' },
  facebook: { id: 'facebook', labelFr: 'Facebook', labelAr: 'Facebook', hosts: ['facebook.com', 'fb.com', 'fb.me'], example: 'https://facebook.com/votre-page' },
  instagram: { id: 'instagram', labelFr: 'Instagram', labelAr: 'Instagram', hosts: ['instagram.com', 'instagr.am'], example: 'https://instagram.com/votre-compte' },
  tiktok: { id: 'tiktok', labelFr: 'TikTok', labelAr: 'TikTok', hosts: ['tiktok.com'], example: 'https://tiktok.com/@votre-compte' },
  youtube: { id: 'youtube', labelFr: 'YouTube', labelAr: 'YouTube', hosts: ['youtube.com', 'youtu.be'], example: 'https://youtube.com/@votre-chaine' },
  behance: { id: 'behance', labelFr: 'Behance', labelAr: 'Behance', hosts: ['behance.net'], example: 'https://behance.net/votre-nom' },
  github: { id: 'github', labelFr: 'GitHub', labelAr: 'GitHub', hosts: ['github.com'], example: 'https://github.com/votre-nom' },
  dribbble: { id: 'dribbble', labelFr: 'Dribbble', labelAr: 'Dribbble', hosts: ['dribbble.com'], example: 'https://dribbble.com/votre-nom' },
  upwork: { id: 'upwork', labelFr: 'Upwork', labelAr: 'Upwork', hosts: ['upwork.com'], example: 'https://upwork.com/freelancers/votre-profil' },
  fiverr: { id: 'fiverr', labelFr: 'Fiverr', labelAr: 'Fiverr', hosts: ['fiverr.com'], example: 'https://fiverr.com/votre-nom' },
  malt: { id: 'malt', labelFr: 'Malt', labelAr: 'Malt', hosts: ['malt.fr', 'malt.com', 'malt.es', 'malt.de', 'malt.be'], example: 'https://malt.fr/profile/votre-nom' },
  website: { id: 'website', labelFr: 'Site web', labelAr: 'موقع إلكتروني', hosts: [], example: 'https://votre-site.tn' },
}

export const platformName = (id: PlatformId, lang: 'fr' | 'ar'): string => (lang === 'ar' ? PLATFORMS[id].labelAr : PLATFORMS[id].labelFr)

// « scheme:// » or one of the schemes people paste by mistake. NOT any « word: »: « linkedin.com:443/in/x » and « localhost:3000 » are hosts with a port,
// and « https:github.com » (no //) is not a web address — it gets prefixed, finds no dotted host and is refused.
const HAS_SCHEME = /^(?:[a-z][a-z0-9+.-]*:\/\/|(?:javascript|data|vbscript|mailto|tel|file|blob|about):)/i

/** Text typed without a scheme, minus leading slashes / backslashes (« //example.com »). */
const bare = (text: string): string => text.replace(/^[\\/]+/, '')

/** An address as it is stored: trimmed, and « linkedin.com/in/x » (no scheme) gets `https://`. Anything that is not a web address is returned trimmed, untouched — the http(s) check then refuses it. */
export function normalizeUrl(raw: string): string {
  const text = raw.trim()
  if (text === '' || HAS_SCHEME.test(text)) return text
  return hostOf(text) === null ? text : `https://${bare(text)}`
}

/**
 * A link a freelancer may save: http(s), a dotted host, NO user:password@ (« https://github.com@evil.io » opens evil.io but reads as GitHub), at most 500
 * characters once normalised. Client check and server schema both use it.
 */
export function isLinkUrl(raw: string): boolean {
  const url = normalizeUrl(raw)
  return url.length <= 500 && /^https?:\/\//i.test(url) && hostOf(url) !== null
}

/** The lower-cased host of a web address, or null. Tolerates a missing scheme (« github.com/x »); refuses anything that is not http(s). */
export function hostOf(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null
  const withScheme = HAS_SCHEME.test(text) ? text : `https://${bare(text)}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  // A real host has a dot (« localhost », a bare word typed halfway, are not addresses yet).
  return host.includes('.') ? host : null
}

/** `github.com` matches « github.com » and « *.github.com » — never « evilgithub.com ». */
const matchesHost = (host: string, registrable: string): boolean => host === registrable || host.endsWith(`.${registrable}`)

/** The platform of a URL, `website` for any other web address, null when the text is not (yet) an address. */
export function detectPlatform(raw: string): PlatformId | null {
  const host = hostOf(raw)
  if (host === null) return null
  for (const id of PLATFORM_IDS) {
    if (PLATFORMS[id].hosts.some((h) => matchesHost(host, h))) return id
  }
  return 'website'
}

/** The 5 platforms offered first, per service sector (founder, Oct 31). Keys are the stable sector slugs of lib/taxonomy/service-categories. */
export const RECOMMENDED_BY_SECTOR: Record<string, readonly PlatformId[]> = {
  'developpement-web-mobile': ['github', 'linkedin', 'website', 'malt', 'upwork'],
  'design-ui-ux': ['dribbble', 'behance', 'linkedin', 'website', 'malt'],
  'design-graphique-logo': ['behance', 'instagram', 'dribbble', 'facebook', 'linkedin'],
  'marketing-digital': ['linkedin', 'website', 'facebook', 'malt', 'upwork'],
  'community-management': ['instagram', 'facebook', 'tiktok', 'linkedin', 'website'],
  'redaction-contenu': ['linkedin', 'website', 'malt', 'upwork', 'fiverr'],
  traduction: ['linkedin', 'upwork', 'malt', 'fiverr', 'website'],
  'montage-video-motion': ['youtube', 'instagram', 'tiktok', 'behance', 'linkedin'],
  'voix-off-doublage': ['youtube', 'fiverr', 'upwork', 'linkedin', 'website'],
  'consulting-assistanat': ['linkedin', 'upwork', 'malt', 'fiverr', 'facebook'],
  'personal-branding': ['linkedin', 'instagram', 'tiktok', 'youtube', 'facebook'],
  'coaching-meta-ads': ['facebook', 'instagram', 'youtube', 'linkedin', 'tiktok'],
  'coaching-ecommerce': ['facebook', 'instagram', 'youtube', 'tiktok', 'website'],
}

/** No service yet (or a sector this table does not know). */
export const DEFAULT_RECOMMENDED: readonly PlatformId[] = ['linkedin', 'facebook', 'instagram', 'website', 'upwork']

export const recommendedFor = (sectorSlug: string | null | undefined): readonly PlatformId[] =>
  (sectorSlug ? RECOMMENDED_BY_SECTOR[sectorSlug] : undefined) ?? DEFAULT_RECOMMENDED

/** A freelancer holds at most this many links (DB cap `freelancer_links_cap`, error hint). */
export const LINKS_MAX = 5

/**
 * The sector that holds the most of a freelancer's service listings; a tie goes to the sector of the most recent listing. `null` when there is none.
 * Pure: the loader hands it `{ sector, createdAt }` rows (ISO timestamps).
 */
export function pickTopSector(listings: readonly { sector: string | null; createdAt: string }[]): string | null {
  const stats = new Map<string, { count: number; latest: string }>()
  for (const { sector, createdAt } of listings) {
    if (!sector) continue
    const s = stats.get(sector)
    if (!s) stats.set(sector, { count: 1, latest: createdAt })
    else {
      s.count += 1
      if (createdAt > s.latest) s.latest = createdAt
    }
  }
  let best: string | null = null
  for (const [sector, s] of stats) {
    const b = best === null ? null : stats.get(best)!
    if (b === null || s.count > b.count || (s.count === b.count && (s.latest > b.latest || (s.latest === b.latest && sector < (best as string))))) best = sector
  }
  return best
}
