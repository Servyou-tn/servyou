import type { Lang } from '@/lib/i18n'

/**
 * Direction-aware arrow glyph for back/forward navigation links (Phase 8 Subtask 2b).
 *
 * The glyph flips with the reading direction so the arrow always points the
 * intuitive way:
 *   - "back"    points to the start of the line: ← in LTR (fr), → in RTL (ar)
 *   - "forward" points to the end of the line:   → in LTR (fr), ← in RTL (ar)
 *
 * `lang` is passed as a prop (not read from useLang()) so this works in both
 * client and server components — several call sites are server-rendered.
 *
 * The arrow is purely decorative: the adjacent link text carries the meaning,
 * so it is aria-hidden to avoid a screen reader announcing a bare glyph.
 */
export function DirArrow({
  lang,
  direction,
}: {
  lang: Lang
  direction: 'back' | 'forward'
}) {
  const rtl = lang === 'ar'
  const glyph = direction === 'back' ? (rtl ? '→' : '←') : rtl ? '←' : '→'
  return <span aria-hidden="true">{glyph}</span>
}
