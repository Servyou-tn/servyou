import { describe, it, expect } from 'vitest'
import { serviceCategories } from '@/lib/taxonomy/service-categories'
import {
  DEFAULT_RECOMMENDED,
  LINKS_MAX,
  PLATFORM_IDS,
  PLATFORMS,
  RECOMMENDED_BY_SECTOR,
  detectPlatform,
  isLinkUrl,
  normalizeUrl,
  hostOf,
  pickTopSector,
  platformName,
  recommendedFor,
} from './platforms'

describe('detectPlatform — every host of every platform', () => {
  for (const id of PLATFORM_IDS) {
    for (const host of PLATFORMS[id].hosts) {
      it(`${id}: ${host}, www.${host} and a deep link`, () => {
        expect(detectPlatform(`https://${host}/x`)).toBe(id)
        expect(detectPlatform(`https://www.${host}/x`)).toBe(id)
        expect(detectPlatform(`http://sub.${host}/a/b?c=d#e`)).toBe(id)
        expect(detectPlatform(`${host}/x`)).toBe(id) // typed without the scheme
        expect(detectPlatform(`HTTPS://${host.toUpperCase()}/X`)).toBe(id)
      })
    }
  }

  it('recognises the real-world shapes', () => {
    expect(detectPlatform('https://www.linkedin.com/in/aya-ben-ali/')).toBe('linkedin')
    expect(detectPlatform('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube')
    expect(detectPlatform('https://m.facebook.com/profile.php?id=1')).toBe('facebook')
    expect(detectPlatform('https://www.tiktok.com/@servyou')).toBe('tiktok')
    expect(detectPlatform('https://www.malt.fr/profile/aya')).toBe('malt')
    expect(detectPlatform('https://dribbble.com/aya')).toBe('dribbble')
  })
})

describe('detectPlatform — look-alike tricks are NOT the platform', () => {
  it.each([
    'https://evilgithub.com/x',
    'https://github.com.evil.io/x',
    'https://notlinkedin.com',
    'https://linkedin.com.evil.io',
    'https://evil.io/?u=https://github.com',
    'https://evil.io/github.com',
    'https://github-com.evil.io',
    'https://githubcom.io',
    'https://fb.com.evil.io',
    'https://xfb.me',
  ])('%s is a plain website', (url) => {
    expect(detectPlatform(url)).toBe('website')
  })

  it.each(['https://github.com@evil.io/x', 'https://user:pass@evil.io/github.com'])('%s has user:password@ — not an address at all', (url) => {
    expect(detectPlatform(url)).toBeNull()
  })

  it('a dotted trailing host is still the platform, a lookalike with a trailing dot is not', () => {
    expect(detectPlatform('https://github.com./x')).toBe('github')
    expect(detectPlatform('https://evilgithub.com./x')).toBe('website')
  })
})

describe('detectPlatform — what is not (yet) an address', () => {
  it.each(['', '   ', 'github', 'localhost', 'not a url', 'javascript:alert(1)', 'ftp://github.com/x', 'mailto:a@b.tn', 'data:text/html,hi', '://'])('%j → null', (v) => {
    expect(detectPlatform(v)).toBeNull()
  })

  it('any other site is « website »', () => {
    expect(detectPlatform('https://proz.com/aya')).toBe('website')
    expect(detectPlatform('https://soundcloud.com/aya')).toBe('website')
    expect(detectPlatform('https://x.com/aya')).toBe('website')
    expect(detectPlatform('https://mon-site.tn')).toBe('website')
  })
})

describe('hostOf', () => {
  it('lower-cases, strips a trailing dot and the port', () => {
    expect(hostOf('https://GitHub.com:8443/x')).toBe('github.com')
    expect(hostOf('github.com./x')).toBe('github.com')
  })
  it('returns null for text that is not a web address', () => {
    expect(hostOf('abc')).toBeNull()
    expect(hostOf('')).toBeNull()
  })
})

describe('recommended platforms', () => {
  it('every one of the 13 sectors has exactly 5 distinct platforms, all known', () => {
    for (const sector of serviceCategories) {
      const rec = RECOMMENDED_BY_SECTOR[sector.id]
      expect(rec, sector.id).toBeDefined()
      expect(rec).toHaveLength(5)
      expect(new Set(rec).size).toBe(5)
      for (const id of rec) expect(PLATFORM_IDS).toContain(id)
    }
    expect(Object.keys(RECOMMENDED_BY_SECTOR).sort()).toEqual(serviceCategories.map((s) => s.id).sort())
  })

  it('the founder list, spot-checked in order', () => {
    expect(recommendedFor('developpement-web-mobile')).toEqual(['github', 'linkedin', 'website', 'malt', 'upwork'])
    expect(recommendedFor('design-graphique-logo')).toEqual(['behance', 'instagram', 'dribbble', 'facebook', 'linkedin'])
    expect(recommendedFor('coaching-ecommerce')).toEqual(['facebook', 'instagram', 'youtube', 'tiktok', 'website'])
  })

  it('falls back to the default five for no sector or an unknown one', () => {
    expect(DEFAULT_RECOMMENDED).toEqual(['linkedin', 'facebook', 'instagram', 'website', 'upwork'])
    expect(recommendedFor(null)).toEqual(DEFAULT_RECOMMENDED)
    expect(recommendedFor(undefined)).toEqual(DEFAULT_RECOMMENDED)
    expect(recommendedFor('no-such-sector')).toEqual(DEFAULT_RECOMMENDED)
  })

  it('the cap is 5 and there are 12 platforms with an FR and an AR name', () => {
    expect(LINKS_MAX).toBe(5)
    expect(PLATFORM_IDS).toHaveLength(12)
    for (const id of PLATFORM_IDS) {
      expect(platformName(id, 'fr')).toBeTruthy()
      expect(platformName(id, 'ar')).toBeTruthy()
    }
    expect(platformName('website', 'fr')).toBe('Site web')
  })
})

describe('pickTopSector', () => {
  const row = (sector: string | null, createdAt: string) => ({ sector, createdAt })

  it('the sector with the most listings wins', () => {
    expect(pickTopSector([row('a', '2026-01-01'), row('b', '2026-03-01'), row('a', '2026-02-01')])).toBe('a')
  })
  it('a tie goes to the sector of the MOST RECENT listing', () => {
    expect(pickTopSector([row('a', '2026-01-01'), row('b', '2026-03-01'), row('a', '2026-02-01'), row('b', '2026-01-15')])).toBe('b')
    expect(pickTopSector([row('a', '2026-05-01'), row('b', '2026-03-01')])).toBe('a')
  })
  it('a full tie (same count, same newest timestamp) is deterministic', () => {
    expect(pickTopSector([row('b', '2026-01-01'), row('a', '2026-01-01')])).toBe('a')
    expect(pickTopSector([row('a', '2026-01-01'), row('b', '2026-01-01')])).toBe('a')
  })
  it('ignores listings without a sector, and is null with none', () => {
    expect(pickTopSector([row(null, '2026-01-01'), row('a', '2026-01-01')])).toBe('a')
    expect(pickTopSector([row(null, '2026-01-01')])).toBeNull()
    expect(pickTopSector([])).toBeNull()
  })
})

describe('review fixes — userinfo, ports, slashes, isLinkUrl', () => {
  it('an address with user:password@ is not an address (it opens the host after the @)', () => {
    expect(hostOf('https://github.com@evil.io')).toBeNull()
    expect(detectPlatform('https://user:pw@github.com/x')).toBeNull()
    expect(normalizeUrl('name@example.com')).toBe('name@example.com') // an email is not prefixed into a link
    expect(isLinkUrl('https://github.com@evil.io')).toBe(false)
    expect(isLinkUrl('name@example.com')).toBe(false)
  })

  it('a host with a port is a host, not a scheme', () => {
    expect(normalizeUrl('linkedin.com:443/in/aya')).toBe('https://linkedin.com:443/in/aya')
    expect(detectPlatform('linkedin.com:443/in/aya')).toBe('linkedin')
    expect(normalizeUrl('my-site.tn:8080')).toBe('https://my-site.tn:8080')
    expect(isLinkUrl('my-site.tn:8080')).toBe(true)
  })

  it('https:github.com (no //) is not an address — preview and validity agree', () => {
    expect(detectPlatform('https:github.com')).toBeNull()
    expect(isLinkUrl('https:github.com')).toBe(false)
  })

  it('leading slashes are dropped, not stored', () => {
    expect(normalizeUrl('//example.com')).toBe('https://example.com')
    expect(normalizeUrl('\example.com')).toBe('https://example.com')
  })

  it('isLinkUrl: http(s), dotted host, ≤ 500 characters once normalised', () => {
    expect(isLinkUrl('linkedin.com/in/aya')).toBe(true)
    expect(isLinkUrl('https://aya.tn')).toBe(true)
    for (const bad of ['javascript:alert(1)', 'mailto:a@b.tn', 'data:text/html,x', 'ftp://aya.tn', 'https://localhost', 'intranet', '']) {
      expect(isLinkUrl(bad), bad).toBe(false)
    }
    expect(isLinkUrl(`aya.tn/${'a'.repeat(493)}`)).toBe(false) // 8 + 6 + 493 > 500 once https:// is added
    expect(isLinkUrl(`aya.tn/${'a'.repeat(400)}`)).toBe(true)
  })
})
