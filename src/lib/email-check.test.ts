import { describe, it, expect } from 'vitest'
import { isValidEmail, EMAIL_MAX } from './email-check'

// The regex both copies used before audit H3. Kept here ONLY as the reference the new check must agree with on
// every input of a legal length — never call it on long input (64 k characters took ~10 s).
const OLD_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const oldCheck = (email: string) => OLD_EMAIL_RE.test(email.trim())

// The shape that made the old regex backtrack: many dots in the domain, then something that fails the end anchor.
// Exactly 64,000 characters.
const SLOW_FOR_OLD_REGEX = 'a@' + 'a.'.repeat(31_998) + '@x'

describe('isValidEmail — same accept/refuse result as the old regex', () => {
  it.each([
    'a@b.tn',
    '  user@servyou.tn ',
    'vous@exemple.com',
    'first.last+tag@sub.domain.tn',
    'a@b.c.d',
    'a@...',
    'a@.b.c',
    'a@b..c',
    'é@exemple.tn',
    '\ufeffa@b.tn\ufeff',
    'noatsign',
    'no@domain',
    'a@b',
    'a b@c.com',
    'a@b .c',
    'a\u00a0b@c.com',
    'a\u2028b@c.com',
    'a@b.c\td',
    '@b.tn',
    'a@',
    'a@.tn',
    'a@b.',
    'a@@b.tn',
    'a@b@c.tn',
    '',
    '   ',
    '.@..',
  ])('%j', (email) => {
    expect(isValidEmail(email)).toBe(oldCheck(email))
  })

  it('agrees on 20,000 random short strings built from the characters that matter', () => {
    // Seeded (mulberry32) so a failure reproduces.
    let seed = 0x5e7f_0003
    const rand = () => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    const alphabet = ['a', 'b', 'é', '@', '.', '.', ' ', '\t', '\n', '\u00a0', '\u2028', '\ufeff', '+', '-']
    const randomRun = (max: number) => {
      let s = ''
      for (let j = Math.floor(rand() * (max + 1)); j > 0; j--) s += alphabet[Math.floor(rand() * alphabet.length)]
      return s
    }
    const letters = (max: number) => 'ab'.repeat(3).slice(0, Math.floor(rand() * (max + 1)))
    const segment = () => (rand() < 0.6 ? letters(3) : randomRun(3))
    const disagreements: string[] = []
    let accepted = 0
    for (let i = 0; i < 20_000; i++) {
      // Half fully random, half near-valid « x@y.z » shapes, so both the accept and the refuse side get exercised.
      const s =
        i % 2 === 0
          ? randomRun(13)
          : (rand() < 0.2 ? ' ' : '') + segment() + '@' + segment() + '.' + segment() + (rand() < 0.2 ? '\n' : '')
      const expected = oldCheck(s)
      if (expected) accepted++
      if (isValidEmail(s) !== expected) disagreements.push(s)
    }
    expect(disagreements).toEqual([])
    expect(accepted).toBeGreaterThan(1_000) // the sample really exercises the accept side too
  })
})

describe('isValidEmail — the 254-character limit', () => {
  it('accepts exactly EMAIL_MAX characters (after trimming) and refuses one more', () => {
    const atMax = 'a'.repeat(EMAIL_MAX - 12) + '@example.com'
    expect(atMax).toHaveLength(EMAIL_MAX)
    expect(isValidEmail(atMax)).toBe(true)
    expect(isValidEmail(`   ${atMax}   `)).toBe(true)
    expect(isValidEmail('a' + atMax)).toBe(false)
  })

  it('refuses a 64,000-character fake email in under 5 ms', () => {
    expect(SLOW_FOR_OLD_REGEX).toHaveLength(64_000)
    expect(isValidEmail(SLOW_FOR_OLD_REGEX)).toBe(false)
    expect(fastestMs(() => isValidEmail(SLOW_FOR_OLD_REGEX))).toBeLessThan(5)
  })

  it('the shape check itself is fast: the same attack at 254 characters gets past the limit and is still refused quickly', () => {
    const atLimit = 'a@' + 'a.'.repeat(125) + '@x'
    expect(atLimit).toHaveLength(EMAIL_MAX)
    expect(isValidEmail(atLimit)).toBe(false)
    expect(fastestMs(() => isValidEmail(atLimit))).toBeLessThan(5)
  })
})

// Fastest of 3 calls, so one GC pause on a shared CI runner cannot fail the bound. The old regex took ~10 s on
// EVERY call of the 64,000-character input, so this still fails loudly on a regression.
function fastestMs(fn: () => unknown): number {
  let best = Infinity
  for (let i = 0; i < 3; i++) {
    const start = performance.now()
    fn()
    best = Math.min(best, performance.now() - start)
  }
  return best
}
