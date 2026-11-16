/**
 * Badge and danger-action contrast (journey walk S2, WCAG 2.2 AA 1.4.3): every StatusPill tone's text, and the danger
 * Button's label, must reach 4.5:1 against its own fill. Reads the REAL token values from src/styles/tokens.css (generated
 * from the Figma tokens), so a palette or tone-map change that drops under AA fails here. Run by path.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { TONE } from './status-pill'
import { VARIANT_BASE } from './button'

const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8')

/** `--color-<name>` → the hex behind it (`--color-x: var(--y)` then `--y: #hex`). */
function hexOf(utilityColor: string): string {
  const alias = css.match(new RegExp(`--color-${utilityColor}:\\s*var\\((--[\\w-]+)\\)`))
  const name = alias ? alias[1] : `--${utilityColor}`
  const value = css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))
  if (!value) throw new Error(`no token value for ${utilityColor}`)
  return value[1]
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** The `bg-*` and `text-*` colour of a class recipe, as token names. */
function pair(classes: string): { bg: string; text: string } {
  const bg = classes.match(/(?:^|\s)bg-([a-z0-9-]+)/)?.[1]
  const text = classes.match(/(?:^|\s)text-([a-z]+-[a-z0-9-]+)/)?.[1]
  if (!bg || !text) throw new Error(`no bg/text pair in « ${classes} »`)
  return { bg, text }
}

describe('StatusPill — every tone is ≥ 4.5:1 (S2)', () => {
  it.each(Object.entries(TONE))('%s: %s', (_tone, classes) => {
    const { bg, text } = pair(classes)
    expect(contrast(hexOf(text), hexOf(bg))).toBeGreaterThanOrEqual(4.5)
  })

  it('the walk\'s numbers are gone: « En attente » was 1.93, « Actif » 3.00, « Masqué » 4.34, « Préparée » 4.44', () => {
    const ratio = (tone: keyof typeof TONE) => {
      const { bg, text } = pair(TONE[tone])
      return Math.round(contrast(hexOf(text), hexOf(bg)) * 100) / 100
    }
    expect(ratio('warning')).toBe(6.37)
    expect(ratio('success')).toBe(6.49)
    expect(ratio('muted')).toBe(6.92)
    expect(ratio('info')).toBe(6.29)
  })
})

describe('Button danger — the label is ≥ 4.5:1 on its fill (« Annuler la commande » was 3.91)', () => {
  it('white on the danger fill', () => {
    const { bg, text } = pair(VARIANT_BASE.danger)
    expect(contrast(hexOf(text), hexOf(bg))).toBeGreaterThanOrEqual(4.5)
  })
})
