import { describe, it, expect } from 'vitest'
import { parseLegalBody, parseLegalInline, safeLegalHref, splitLines, LEGAL_DOCS } from './legal-structure'
import { fr } from '@/lib/i18n/fr'
import { ar } from '@/lib/i18n/ar'
import { en } from '@/lib/i18n/en'

describe('parseLegalBody', () => {
  it('splits paragraphs on a blank line', () => {
    const out = parseLegalBody('Premier paragraphe.\n\nDeuxième paragraphe.')
    expect(out).toEqual([
      { type: 'p', text: 'Premier paragraphe.' },
      { type: 'p', text: 'Deuxième paragraphe.' },
    ])
  })

  it('turns a "- " block into a bullet list', () => {
    const out = parseLegalBody('Vous pouvez :\n\n- A\n- B\n- C')
    expect(out[0]).toEqual({ type: 'p', text: 'Vous pouvez :' })
    expect(out[1]).toEqual({ type: 'ul', items: ['A', 'B', 'C'] })
  })

  it('handles a body mixing paragraphs and lists', () => {
    const out = parseLegalBody('Intro.\n\n- un\n- deux\n\nConclusion.')
    expect(out.map((b) => b.type)).toEqual(['p', 'ul', 'p'])
  })
})

describe('splitLines', () => {
  it('splits a newline-separated block and strips any "- " prefix', () => {
    expect(splitLines('Ligne 1\nLigne 2\n- Ligne 3')).toEqual(['Ligne 1', 'Ligne 2', 'Ligne 3'])
  })
})

describe('LEGAL_DOCS structure', () => {
  it('has the five documents with the expected section counts', () => {
    expect(Object.keys(LEGAL_DOCS)).toHaveLength(5)
    expect(LEGAL_DOCS.conditions.sections).toHaveLength(14)
    expect(LEGAL_DOCS.confidentialite.sections).toHaveLength(13)
    expect(LEGAL_DOCS.confidentialite.rightsKey).toBeTruthy()
    expect(LEGAL_DOCS.cookies.sections).toHaveLength(6)
    expect(LEGAL_DOCS.accessibilite.sections).toHaveLength(6)
    expect(LEGAL_DOCS['mentions-legales'].sections).toHaveLength(5)
    expect(LEGAL_DOCS['mentions-legales'].updatedDateKey).toBe('legal.mentions.updatedDate')
  })

  it('every key a document names exists in French, Arabic and English', () => {
    for (const doc of Object.values(LEGAL_DOCS)) {
      const keys = [doc.titleKey, doc.introKey, doc.summaryKey, doc.rightsKey, doc.updatedDateKey]
        .concat(doc.sections.flatMap((s) => [s.titleKey, s.openerKey, s.bodyKey]))
        .filter((k): k is string => Boolean(k))
      for (const key of keys) {
        expect(fr[key], `${key} (fr)`).toBeTruthy()
        expect(ar[key], `${key} (ar)`).toBeTruthy()
      }
    }
    for (const key of Object.keys(fr).filter((k) => k.startsWith('legal.mentions.'))) {
      expect(en[key], `${key} (en)`).toBeTruthy()
    }
  })
})

describe('safeLegalHref — what a legal string may link to', () => {
  it.each(['/contact', '/confidentialite', '/conditions#s8', 'mailto:bonjour@servyou.tn'])('accepts %s', (href) => {
    expect(safeLegalHref(href)).toBe(href)
  })

  it.each([
    '//evil.example/x', // protocol-relative: leaves the site
    '/\\evil.example', // browsers read "/\" as "//"
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    'https://servyou.tn/contact', // absolute URLs are refused too: same-site paths only
    'data:text/html,hi',
    'mailto:', // no address
    'mailto:a@b.tn?bcc=x@y.tn/', // no smuggled path / query trick with a slash
    'contact', // relative, no leading slash
    '',
  ])('refuses %s', (href) => {
    expect(safeLegalHref(href)).toBeNull()
  })
})

describe('parseLegalInline', () => {
  it('splits text, a same-site link, a mailto link and an LTR island in order', () => {
    expect(parseLegalInline('Écrivez à [nous](mailto:bonjour@servyou.tn), lisez la [Politique](/confidentialite) — `Vercel Inc.`.')).toEqual([
      { type: 'text', text: 'Écrivez à ' },
      { type: 'link', label: 'nous', href: 'mailto:bonjour@servyou.tn' },
      { type: 'text', text: ', lisez la ' },
      { type: 'link', label: 'Politique', href: '/confidentialite' },
      { type: 'text', text: ' — ' },
      { type: 'ltr', text: 'Vercel Inc.' },
      { type: 'text', text: '.' },
    ])
  })

  it('a refused link stays exactly as written, as plain text — never a link', () => {
    const text = 'Voir [ici](javascript:alert(1)) et [là](//evil.example).'
    const parts = parseLegalInline(text)
    expect(parts.some((p) => p.type === 'link')).toBe(false)
    expect(parts.map((p) => (p.type === 'text' ? p.text : '')).join('')).toContain('[là](//evil.example)')
  })

  it('a string without tokens is one text part (the other legal pages render unchanged)', () => {
    expect(parseLegalInline('Pour toute question : bonjour@servyou.tn')).toEqual([
      { type: 'text', text: 'Pour toute question : bonjour@servyou.tn' },
    ])
    expect(parseLegalInline('')).toEqual([])
  })
})

describe('legal strings — links and LTR islands match across languages', () => {
  // The parity test compares {placeholders} only: an Arabic link to the wrong page, or a postal address typed
  // differently in one language, would pass it. Every legal string must carry the same hrefs and the same
  // `islands` (names, legal entity names, postal addresses — never translated) in French, Arabic and English.
  const tokensOf = (s: string) =>
    parseLegalInline(s)
      .filter((p) => p.type !== 'text')
      .map((p) => (p.type === 'link' ? `link:${p.href}` : p.type === 'ltr' ? `ltr:${p.text}` : ''))
      .sort()

  it('same hrefs and islands in fr, ar and en (en falls back to fr)', () => {
    const legalKeys = Object.keys(fr).filter((k) => k.startsWith('legal.'))
    for (const key of legalKeys) {
      const want = tokensOf(fr[key])
      expect(tokensOf(ar[key] ?? ''), `${key} (ar)`).toEqual(want)
      expect(tokensOf(en[key] ?? fr[key]), `${key} (en)`).toEqual(want)
    }
  })

  it('no legal string carries a link the parser would refuse', () => {
    for (const dict of [fr, ar, en]) {
      for (const [key, value] of Object.entries(dict)) {
        if (!key.startsWith('legal.')) continue
        for (const m of value.matchAll(/\[[^\]\n]+\]\(([^)\s]+)\)/g)) {
          expect(safeLegalHref(m[1]), `${key}: ${m[1]}`).not.toBeNull()
        }
      }
    }
  })

  it('the privacy policy names the data controller in all three languages', () => {
    expect(fr['legal.privacy.s1.body']).toContain('Responsable du traitement : `Moatez Sahbeni` (personne physique), Ariana, Tunisie')
    expect(ar['legal.privacy.s1.body']).toContain('المسؤول عن المعالجة: `Moatez Sahbeni`')
    expect(en['legal.privacy.s1.body']).toContain('Data controller: `Moatez Sahbeni` (natural person), Ariana, Tunisia')
  })
})
