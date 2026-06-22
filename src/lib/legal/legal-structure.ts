// Skeleton for the legal pages: each doc's section order (id + i18n key names). The
// strings live in fr.ts/ar.ts (parity-tested); the page resolves keys → ResolvedLegalDoc
// → LegalPageShell. Same pattern as faq-content.ts. Section bodies are single i18n strings
// using a tiny convention (paragraphs split on a blank line; a block whose lines all start
// with "- " becomes a bullet list) — see parseLegalBody.

export type LegalSectionKeys = { id: string; titleKey: string; openerKey: string; bodyKey: string }

export type LegalDocStructure = {
  slug: string
  titleKey: string
  introKey: string
  summaryKey: string
  rightsKey?: string // privacy only — the "Vos droits en un coup d'œil" featured block
  sections: LegalSectionKeys[]
}

function sections(prefix: string, n: number): LegalSectionKeys[] {
  return Array.from({ length: n }, (_, i) => {
    const s = `s${i + 1}`
    return { id: s, titleKey: `${prefix}.${s}.title`, openerKey: `${prefix}.${s}.opener`, bodyKey: `${prefix}.${s}.body` }
  })
}

export const LEGAL_DOCS: Record<string, LegalDocStructure> = {
  conditions: {
    slug: 'conditions',
    titleKey: 'legal.terms.title',
    introKey: 'legal.terms.intro',
    summaryKey: 'legal.terms.summary',
    sections: sections('legal.terms', 14),
  },
  confidentialite: {
    slug: 'confidentialite',
    titleKey: 'legal.privacy.title',
    introKey: 'legal.privacy.intro',
    summaryKey: 'legal.privacy.summary',
    rightsKey: 'legal.privacy.rights',
    sections: sections('legal.privacy', 13),
  },
  cookies: {
    slug: 'cookies',
    titleKey: 'legal.cookies.title',
    introKey: 'legal.cookies.intro',
    summaryKey: 'legal.cookies.summary',
    sections: sections('legal.cookies', 6),
  },
  accessibilite: {
    slug: 'accessibilite',
    titleKey: 'legal.accessibility.title',
    introKey: 'legal.accessibility.intro',
    summaryKey: 'legal.accessibility.summary',
    sections: sections('legal.accessibility', 6),
  },
}

export type LegalBlock = { type: 'p'; text: string } | { type: 'ul'; items: string[] }

/**
 * Parse a section body string into renderable blocks. Blocks are separated by a blank
 * line ("\n\n"); a block whose every non-empty line starts with "- " becomes a bullet
 * list, otherwise it is a paragraph. Likewise splits a "\n"-bulleted summary/rights list.
 */
export function parseLegalBody(body: string): LegalBlock[] {
  return body
    .split('\n\n')
    .map((block): LegalBlock => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length > 0 && lines.every((l) => l.startsWith('- '))) {
        return { type: 'ul', items: lines.map((l) => l.slice(2).trim()) }
      }
      return { type: 'p', text: block.trim() }
    })
    .filter((b) => (b.type === 'p' ? b.text.length > 0 : b.items.length > 0))
}

/** Split a "\n"-separated bullet block (summary / rights) into its lines. */
export function splitLines(value: string): string[] {
  return value.split('\n').map((l) => l.replace(/^- /, '').trim()).filter(Boolean)
}
