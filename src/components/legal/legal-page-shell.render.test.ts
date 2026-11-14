import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { LegalPageShell } from './LegalPageShell'
import { LEGAL_DOCS } from '@/lib/legal/legal-structure'
import { t } from '@/lib/i18n'

// LegalPageShell takes lang as a prop and uses no client hooks / next APIs, so it renders
// straight through renderToString.
function html(slug: keyof typeof LEGAL_DOCS, lang: 'fr' | 'ar' | 'en' = 'fr'): string {
  return renderToString(createElement(LegalPageShell, { doc: LEGAL_DOCS[slug], lang }))
}

describe('LegalPageShell render smoke', () => {
  it('renders the draft banner, intro, summary, TOC, sections and contact close', () => {
    const out = html('conditions')
    expect(out).toContain('Document en cours de finalisation') // draft banner
    expect(out).toContain('Pourquoi cette page existe') // intro heading
    expect(out).toContain('Résumé en une minute') // summary heading
    expect(out).toContain('Table des matières') // TOC
    expect(out).toContain('Acceptation') // first section title
    expect(out).toContain('Droit applicable') // a later section title
    expect(out).toContain('Parlez-nous') // closing contact heading
  })

  it('the privacy policy shows its own « Mise à jour » date; the other three docs keep the shared one', () => {
    const own = t('legal.privacy.updatedDate', 'fr')
    const shared = t('legal.updatedDate', 'fr')
    expect(own).not.toBe(shared)
    expect(html('confidentialite')).toContain(own)
    expect(html('confidentialite')).not.toContain(shared)
    for (const slug of ['conditions', 'cookies', 'accessibilite'] as const) {
      expect(html(slug)).toContain(shared)
      expect(html(slug)).not.toContain(own)
    }
  })

  it('/mentions-legales: its own date, the editor, the links and the hosts kept left-to-right — in every language', () => {
    expect(html('mentions-legales')).toContain(t('legal.mentions.updatedDate', 'fr'))
    for (const lang of ['fr', 'ar', 'en'] as const) {
      const out = html('mentions-legales', lang)
      expect(out, lang).toContain('href="/contact"')
      expect(out, lang).toContain('href="/confidentialite"')
      expect(out, lang).toContain('href="/conditions#s8"')
      expect(out, lang).toContain('href="mailto:bonjour@servyou.tn"')
      expect(out, lang).toContain('<bdi dir="ltr">Moatez Sahbeni</bdi>')
      expect(out, lang).toContain('<bdi dir="ltr">Vercel Inc.</bdi>')
      expect(out, lang).toContain('<bdi dir="ltr">440 N Barranca Ave #4133, Covina, CA 91723</bdi>')
      expect(out, lang).toContain('<bdi dir="ltr">Supabase Pte. Ltd.</bdi>')
      expect(out, lang).toContain('<bdi dir="ltr">65 Chulia Street #38-02/03, OCBC Centre, Singapore 049513</bdi>')
      // no raw markup reaches the page
      expect(out, lang).not.toContain('`')
      expect(out, lang).not.toContain('](')
    }
  })

  it('the privacy policy shows the controller line as text plus a mailto link', () => {
    const out = html('confidentialite')
    expect(out).toContain('Responsable du traitement : <bdi dir="ltr">Moatez Sahbeni</bdi> (personne physique), Ariana, Tunisie')
    expect(out).toContain('href="mailto:bonjour@servyou.tn"')
  })

  it('no legal page shows raw markup (a backtick or "](") in any language — summaries included', () => {
    for (const slug of Object.keys(LEGAL_DOCS) as (keyof typeof LEGAL_DOCS)[]) {
      for (const lang of ['fr', 'ar', 'en'] as const) {
        const out = html(slug, lang)
        expect(out, `${slug} ${lang}`).not.toContain('`')
        expect(out, `${slug} ${lang}`).not.toContain('](')
      }
    }
    // the legal notice's summary links render as links too
    expect(html('mentions-legales')).toMatch(/Pour nous écrire : <a [^>]*href="mailto:bonjour@servyou.tn"/)
  })

  it('renders the privacy "Vos droits" featured block only on /confidentialite', () => {
    // renderToString HTML-escapes the apostrophe (d'œil → d&#x27;œil), so assert on the
    // apostrophe-free prefix.
    expect(html('confidentialite')).toContain('Vos droits en un coup')
    expect(html('conditions')).not.toContain('Vos droits en un coup')
  })
})
