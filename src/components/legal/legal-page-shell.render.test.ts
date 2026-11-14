import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { LegalPageShell } from './LegalPageShell'
import { LEGAL_DOCS } from '@/lib/legal/legal-structure'
import { t } from '@/lib/i18n'

// LegalPageShell takes lang as a prop and uses no client hooks / next APIs, so it renders
// straight through renderToString.
function html(slug: keyof typeof LEGAL_DOCS): string {
  return renderToString(createElement(LegalPageShell, { doc: LEGAL_DOCS[slug], lang: 'fr' }))
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

  it('renders the privacy "Vos droits" featured block only on /confidentialite', () => {
    // renderToString HTML-escapes the apostrophe (d'œil → d&#x27;œil), so assert on the
    // apostrophe-free prefix.
    expect(html('confidentialite')).toContain('Vos droits en un coup')
    expect(html('conditions')).not.toContain('Vos droits en un coup')
  })
})
