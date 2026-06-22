import type { CSSProperties, ReactNode } from 'react'

// Premium animated subtitle row for the consumer dashboard shell. Pure CSS — a SERVER
// component with NO client JS: every unit is static markup carrying its own animation-delay,
// and the @keyframes + the prefers-reduced-motion reset live in globals.css
// (.ph-reveal / .ph-word / .ph-underline). Consequences (all free, no useEffect / no key):
//   • zero JS → no bundle bloat, no hydration flash;
//   • the reveal replays on route change (the per-page mount remounts) but does NOT re-fire on a
//     same-route, prop-stable re-render (e.g. /mes-favoris Tous→Produits keeps the same subtitle,
//     so React reuses the DOM and the CSS animation stays put).
//
// LTR (French): each WORD is kept intact (no mid-word wrap) and split into per-character spans
// that cascade in. RTL (Arabic, detected by script): each word animates as ONE block — Arabic is
// cursive, so per-character spans would force isolated, broken letterforms. The emphasisWord
// (first occurrence) renders in brand-accent and keeps the same stagger; an underline draws last.

const INITIAL_MS = 80 // gap before the first unit starts
const STEP_MS = 30 // per-character stagger
const REVEAL_MS = 600 // single-unit reveal duration
const UNDERLINE_GAP_MS = 50 // pause after the text lands before the underline draws

const ARABIC = /[؀-ۿ]/

export function PageHeader({
  subtitle,
  emphasisWord,
}: {
  subtitle: string
  emphasisWord?: string
}) {
  // Emphasis character range (first occurrence only); empty when absent / not found.
  const emStart = emphasisWord ? subtitle.indexOf(emphasisWord) : -1
  const emEnd = emStart >= 0 ? emStart + emphasisWord!.length : -1
  const isEmphasis = (i: number) => emStart >= 0 && i >= emStart && i < emEnd

  const rtl = ARABIC.test(subtitle)

  // Word / whitespace tokens; spaces stay un-animated and are the only wrap points.
  const tokens = subtitle.split(/(\s+)/)
  let offset = 0 // running character index — drives both the cascade delay and the emphasis range
  const nodes: ReactNode[] = []

  for (let ti = 0; ti < tokens.length; ti++) {
    const tok = tokens[ti]
    if (tok === '') continue

    if (/^\s+$/.test(tok)) {
      nodes.push(<span key={`s${ti}`}>{tok}</span>)
      offset += tok.length
      continue
    }

    const wordStart = offset
    const delayFor = (i: number) => `${INITIAL_MS + i * STEP_MS}ms`

    if (rtl) {
      // Whole word as one block (preserves Arabic joining). Emphasis is whole-word here.
      nodes.push(
        <span key={`w${ti}`} className="ph-word">
          <span
            className={`ph-reveal${isEmphasis(wordStart) ? ' text-brand-accent' : ''}`}
            style={{ animationDelay: delayFor(wordStart) } as CSSProperties}
          >
            {tok}
          </span>
        </span>,
      )
    } else {
      // LTR: per-character spans inside an unbreakable word wrapper.
      const chars: ReactNode[] = []
      for (let ci = 0; ci < tok.length; ci++) {
        const gi = wordStart + ci
        chars.push(
          <span
            key={ci}
            className={`ph-reveal${isEmphasis(gi) ? ' text-brand-accent' : ''}`}
            style={{ animationDelay: delayFor(gi) } as CSSProperties}
          >
            {tok[ci]}
          </span>,
        )
      }
      nodes.push(
        <span key={`w${ti}`} className="ph-word">
          {chars}
        </span>,
      )
    }
    offset += tok.length
  }

  const underlineDelay = INITIAL_MS + subtitle.length * STEP_MS + REVEAL_MS + UNDERLINE_GAP_MS

  return (
    <div className="border-b border-border-subtle bg-surface-base pb-8 pt-6 md:pb-10 md:pt-8">
      {/* aria-label carries the whole phrase to a screen reader (read once); the per-unit spans
          are aria-hidden so it never reads letter-by-letter. */}
      <h1
        aria-label={subtitle}
        className="text-[17px] font-medium leading-[1.2] tracking-[-0.01em] text-text-primary md:text-[20px]"
      >
        <span aria-hidden="true" className="relative inline-block">
          {nodes}
          <span
            className="ph-underline"
            style={{ animationDelay: `${underlineDelay}ms` } as CSSProperties}
          />
        </span>
      </h1>
    </div>
  )
}
