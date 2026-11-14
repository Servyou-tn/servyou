// Skeleton for the legal pages: each doc's section order (id + i18n key names). The
// strings live in fr.ts/ar.ts (parity-tested); the page resolves keys → ResolvedLegalDoc
// → LegalPageShell. Same pattern as faq-content.ts. Section bodies are single i18n strings
// using a tiny convention (paragraphs split on a blank line; a block whose lines all start
// with "- " becomes a bullet list) — see parseLegalBody. Inside a body paragraph or bullet,
// "[label](href)" is a link and "`text`" is a left-to-right island (names, postal addresses)
// — see parseLegalInline.

export type LegalSectionKeys = { id: string; titleKey: string; openerKey: string; bodyKey: string }

export type LegalDocStructure = {
  slug: string
  titleKey: string
  introKey: string
  summaryKey: string
  rightsKey?: string // privacy only — the "Vos droits en un coup d'œil" featured block
  /** Its own « Mise à jour » date; without one the doc shows the shared `legal.updatedDate`. */
  updatedDateKey?: string
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
    // Its own date since the Umami paragraph (#371, founder D4); the other three docs keep the shared one.
    updatedDateKey: 'legal.privacy.updatedDate',
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
  'mentions-legales': {
    slug: 'mentions-legales',
    titleKey: 'legal.mentions.title',
    introKey: 'legal.mentions.intro',
    summaryKey: 'legal.mentions.summary',
    updatedDateKey: 'legal.mentions.updatedDate',
    // s1 éditeur · s2 directeur de la publication · s3 responsable du traitement · s4 hébergement · s5 propriété intellectuelle
    sections: sections('legal.mentions', 5),
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

export type LegalInline =
  | { type: 'text'; text: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'ltr'; text: string }

const INLINE_TOKEN = /\[([^\]\n]+)\]\(([^)\s]+)\)|`([^`\n]+)`/g

/**
 * The only hrefs a legal string may link to: a same-site path ("/contact", "/conditions#s8") or a
 * mailto: address. Protocol-relative ("//host", "/\host") and every scheme (javascript:, https:, data:…)
 * are refused — the caller then leaves the token as plain text.
 */
export function safeLegalHref(href: string): string | null {
  if (/^\/(?![/\\])[^\s]*$/.test(href)) return href
  if (/^mailto:[^\s@/\\]+@[^\s@/\\]+$/.test(href)) return href
  return null
}

/**
 * Split one paragraph / bullet into text, links and left-to-right islands. "[label](href)" becomes a
 * link when safeLegalHref accepts the href — otherwise the token stays as written, so a bad link shows
 * up in review instead of silently pointing somewhere. "`text`" becomes an LTR island: a Latin name or
 * a postal address such as « 440 N Barranca Ave #4133 » keeps its order inside an Arabic sentence.
 */
export function parseLegalInline(text: string): LegalInline[] {
  const out: LegalInline[] = []
  let plain = ''
  let last = 0
  const push = (part: LegalInline) => {
    if (plain) out.push({ type: 'text', text: plain })
    plain = ''
    out.push(part)
  }
  for (const m of text.matchAll(INLINE_TOKEN)) {
    const start = m.index ?? 0
    plain += text.slice(last, start)
    last = start + m[0].length
    if (m[3] !== undefined) {
      push({ type: 'ltr', text: m[3] })
      continue
    }
    const href = safeLegalHref(m[2])
    if (href === null) plain += m[0]
    else push({ type: 'link', label: m[1], href })
  }
  plain += text.slice(last)
  if (plain) out.push({ type: 'text', text: plain })
  return out
}

/** Split a "\n"-separated bullet block (summary / rights) into its lines. */
export function splitLines(value: string): string[] {
  return value.split('\n').map((l) => l.replace(/^- /, '').trim()).filter(Boolean)
}
