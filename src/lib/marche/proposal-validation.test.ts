import { describe, it, expect } from 'vitest'
import { validateProposal, type ProposalValue } from './proposal-validation'

const ok = (over: Partial<Parameters<typeof validateProposal>[0]> = {}) =>
  validateProposal({ message: 'a'.repeat(20), links: [], price: '', timeframe: '', skills: [], ...over })

const value = (over: Partial<Parameters<typeof validateProposal>[0]> = {}): ProposalValue => {
  const r = ok(over)
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.errors)}`)
  return r.value
}
const errors = (over: Partial<Parameters<typeof validateProposal>[0]> = {}) => {
  const r = ok(over)
  if (r.ok) throw new Error('expected errors')
  return r.errors
}

describe('message (20–1000 after trim)', () => {
  it('19 characters is short, 20 passes, 1000 passes, 1001 is long', () => {
    expect(errors({ message: 'a'.repeat(19) }).message).toBe('proposal.error.message_short')
    expect(value({ message: 'a'.repeat(20) }).message).toHaveLength(20)
    expect(value({ message: 'a'.repeat(1000) }).message).toHaveLength(1000)
    expect(errors({ message: 'a'.repeat(1001) }).message).toBe('proposal.error.message_long')
  })
  it('counts AFTER trimming — padding cannot reach the floor (the DB CHECK trims too)', () => {
    expect(errors({ message: `   ${'a'.repeat(19)}   ` }).message).toBe('proposal.error.message_short')
    expect(value({ message: `  ${'a'.repeat(20)}  ` }).message).toBe('a'.repeat(20))
  })
  it('empty / whitespace-only is « required », not « short »', () => {
    expect(errors({ message: '' }).message).toBe('proposal.error.message_required')
    expect(errors({ message: '    ' }).message).toBe('proposal.error.message_required')
  })
})

describe('links (≤ 3, http(s) only, de-duplicated)', () => {
  it('empty rows are skipped; label is optional and omitted when blank', () => {
    expect(value({ links: [{ label: '', url: '' }, { label: '  ', url: 'https://a.tn/x' }, { label: 'Site', url: 'http://b.tn' }] }).links).toEqual([
      { url: 'https://a.tn/x' },
      { url: 'http://b.tn', label: 'Site' },
    ])
  })
  it.each(['javascript:alert(1)', 'data:text/html,x', 'ftp://x.tn', 'example.com', 'https://', '//x.tn'])('refuses %s', (url) => {
    expect(errors({ links: [{ label: '', url }] }).links?.[0]).toBe('proposal.error.link_url')
  })
  it('a label with no URL is an error on that row', () => {
    expect(errors({ links: [{ label: 'Mon site', url: '' }] }).links?.[0]).toBe('proposal.error.link_url')
  })
  it('refuses a duplicate URL, case-insensitively, but keeps the first', () => {
    const e = errors({ links: [{ label: '', url: 'https://A.tn/X' }, { label: '', url: 'https://a.tn/x' }] })
    expect(e.links).toEqual([undefined, 'proposal.error.link_duplicate'])
  })
  it('caps label at 60 and URL at 500 characters', () => {
    expect(errors({ links: [{ label: 'a'.repeat(61), url: 'https://a.tn' }] }).links?.[0]).toBe('proposal.error.link_label_long')
    expect(value({ links: [{ label: 'a'.repeat(60), url: 'https://a.tn' }] }).links).toHaveLength(1)
    expect(errors({ links: [{ label: '', url: `https://a.tn/${'x'.repeat(500)}` }] }).links?.[0]).toBe('proposal.error.link_url_long')
  })
  it('three is fine, a fourth is not', () => {
    const row = (n: number) => ({ label: '', url: `https://a.tn/${n}` })
    expect(value({ links: [row(1), row(2), row(3)] }).links).toHaveLength(3)
    expect(errors({ links: [row(1), row(2), row(3), row(4)] }).links).toContain('proposal.error.links_max')
  })
})

describe('price (numeric(10,2), ≥ 0, < 1 000 000)', () => {
  it.each([
    ['', null],
    ['0', 0],
    ['800', 800],
    ['800.5', 800.5],
    ['800,50', 800.5],
    ['999999.99', 999999.99],
    [' 12 ', 12],
  ])('%j → %j', (raw, expected) => {
    expect(value({ price: raw }).price).toBe(expected)
  })
  it.each(['-1', '1e3', '12.345', 'abc', '1000000', '1 000', '0x10', '.5', '5.'])('refuses %j', (raw) => {
    expect(errors({ price: raw }).price).toBe('proposal.error.price_invalid')
  })
})

describe('timeframe (≤ 60)', () => {
  it('blank → null, 60 ok, 61 refused', () => {
    expect(value({ timeframe: '   ' }).timeframe).toBeNull()
    expect(value({ timeframe: 'a'.repeat(60) }).timeframe).toHaveLength(60)
    expect(errors({ timeframe: 'a'.repeat(61) }).timeframe).toBe('proposal.error.timeframe_long')
  })
})

describe('skills (≤ 8, de-duplicated accent- and case-insensitively)', () => {
  it('drops blanks and duplicates, keeping the first spelling', () => {
    expect(value({ skills: ['Rédaction', 'redaction', ' ', 'React', 'REACT'] }).skills).toEqual(['Rédaction', 'React'])
  })
  it('refuses a skill over 60 characters and more than 8 skills', () => {
    expect(errors({ skills: ['a'.repeat(61)] }).skills).toBe('proposal.error.skills_invalid')
    expect(errors({ skills: Array.from({ length: 9 }, (_, i) => `skill${i}`) }).skills).toBe('proposal.error.skills_max')
    expect(value({ skills: Array.from({ length: 8 }, (_, i) => `skill${i}`) }).skills).toHaveLength(8)
  })
})

it('reports every failing field at once, so the form can mark them together', () => {
  const e = errors({ message: 'x', price: '-3', timeframe: 'a'.repeat(61) })
  expect(Object.keys(e).sort()).toEqual(['message', 'price', 'timeframe'])
})
