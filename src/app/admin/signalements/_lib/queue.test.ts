import { describe, expect, it } from 'vitest'
import { matchesReportQuery, parseTab, severityTone, sortReports, statusesForTab } from './queue'

const r = (reason: string, created_at: string) => ({ reason, created_at })

describe('statusesForTab', () => {
  it('Ouverts is the whole work queue (open + claimed); the others are one status each', () => {
    expect(statusesForTab('open')).toEqual(['open', 'under_review'])
    expect(statusesForTab('under_review')).toEqual(['under_review'])
    expect(statusesForTab('dismissed')).toEqual(['dismissed'])
  })
  it('an unknown tab falls back to Ouverts', () => {
    expect(parseTab('nope')).toBe('open')
    expect(parseTab(undefined)).toBe('open')
  })
})

describe('sortReports', () => {
  const rows = [
    r('other', '2026-11-01T10:00:00Z'),
    r('offensive', '2026-11-03T10:00:00Z'),
    r('fake_scam', '2026-11-04T10:00:00Z'),
    r('offensive', '2026-11-02T10:00:00Z'),
    r('mystery', '2026-10-01T10:00:00Z'),
  ]
  it('severity: fake_scam first, then the oldest within a severity, unknown reasons last', () => {
    expect(sortReports(rows, 'severity').map((x) => `${x.reason}@${x.created_at.slice(8, 10)}`)).toEqual([
      'fake_scam@04', 'offensive@02', 'offensive@03', 'other@01', 'mystery@01',
    ])
  })
  it('newest / oldest ignore the reason', () => {
    expect(sortReports(rows, 'newest')[0].reason).toBe('fake_scam')
    expect(sortReports(rows, 'oldest')[0].reason).toBe('mystery')
  })
  it('does not mutate its input', () => {
    const before = rows.map((x) => x.reason)
    sortReports(rows, 'severity')
    expect(rows.map((x) => x.reason)).toEqual(before)
  })
  it('maps severities to the frame tones', () => {
    expect(['fake_scam', 'offensive', 'wrong_category', 'other'].map(severityTone)).toEqual(['danger', 'warning', 'info', 'info'])
  })
})

describe('matchesReportQuery', () => {
  it('needs every term, ignoring case and accents', () => {
    expect(matchesReportQuery(['iPhone 15 Pro', 'Sami Rekik'], 'iphone sami')).toBe(true)
    expect(matchesReportQuery(['Contenu inapproprié'], 'INAPPROPRIE')).toBe(true)
    expect(matchesReportQuery(['iPhone 15 Pro', null], 'iphone leila')).toBe(false)
  })
  it('a blank query matches everything', () => {
    expect(matchesReportQuery([], '   ')).toBe(true)
  })
})
