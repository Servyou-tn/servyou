import { describe, it, expect } from 'vitest'
import { FIELD_FAILURES, TERMINAL_FAILURES, mapProposalDbError, type ProposalFailure } from './proposal-errors'

describe('mapProposalDbError — every typed HINT the job_responses triggers raise', () => {
  it.each([
    ['job_full', 'job_full'],
    ['job_filled', 'job_filled'],
    ['job_deleted', 'job_deleted'],
    ['job_expired', 'job_expired'],
    ['job_unavailable', 'job_unavailable'],
    ['job_closed', 'job_unavailable'],
    ['job_not_found', 'job_unavailable'],
    ['cap_active', 'cap_active'],
    ['own_post', 'own_post'],
    ['duplicate', 'duplicate'],
    ['invalid_links', 'invalid_links'],
    ['too_many_skills', 'too_many_skills'],
    ['suspended', 'suspended'],
    ['no_freelancer_profile', 'no_profile'],
    ['not_self', 'not_allowed'],
    ['not_freelancer', 'not_allowed'],
    ['under_18', 'not_allowed'],
    ['profile_hidden', 'not_allowed'],
  ] as const)('hint %s → %s', (hint, expected) => {
    expect(mapProposalDbError({ hint, code: '23514', message: 'whatever French sentence' })).toBe(expected)
  })

  it('maps CODES, never the French message: the same text with a different hint is a different outcome', () => {
    const message = "Cette annonce n'est plus ouverte."
    expect(mapProposalDbError({ hint: 'job_filled', message })).toBe('job_filled')
    expect(mapProposalDbError({ hint: 'job_deleted', message })).toBe('job_deleted')
    expect(mapProposalDbError({ hint: 'job_unavailable', message })).toBe('job_unavailable')
  })

  it('« Ce compte est suspendu. » (42501, no hint) is suspended', () => {
    expect(mapProposalDbError({ code: '42501', hint: null, message: 'Ce compte est suspendu.' })).toBe('suspended')
    expect(mapProposalDbError({ code: '42501', message: 'Un compte suspendu ne peut pas répondre à une annonce.' })).toBe('suspended')
  })

  it('a 42501 with another message is NOT assumed to be a suspension', () => {
    expect(mapProposalDbError({ code: '42501', message: 'permission denied for table job_responses' })).toBe('technical')
  })

  it('CHECK-constraint violations (no hint) land on their field', () => {
    const v = (constraint: string) => ({ code: '23514', message: `new row for relation "job_responses" violates check constraint "${constraint}"` })
    expect(mapProposalDbError(v('job_responses_proposal_message_length'))).toBe('invalid_message')
    expect(mapProposalDbError(v('job_responses_proposed_price_range'))).toBe('invalid_price')
    expect(mapProposalDbError(v('job_responses_proposed_timeframe_length'))).toBe('invalid_timeframe')
    expect(mapProposalDbError(v('job_responses_portfolio_links_shape'))).toBe('invalid_links')
  })

  it('an unknown hint, no hint, or an empty error is « technical » (amber retry, input kept)', () => {
    expect(mapProposalDbError({ hint: 'something_new', code: 'P0001' })).toBe('technical')
    expect(mapProposalDbError({ code: '500', message: 'boom' })).toBe('technical')
    expect(mapProposalDbError({})).toBe('technical')
  })
})

describe('classification sets', () => {
  const all: ProposalFailure[] = [
    'job_full', 'job_filled', 'job_deleted', 'job_expired', 'job_unavailable', 'cap_active', 'own_post', 'suspended', 'no_profile',
    'not_allowed', 'invalid_links', 'too_many_skills', 'invalid_message', 'invalid_price', 'invalid_timeframe', 'technical',
  ]
  it('every failure is exactly one of: field · terminal · technical', () => {
    for (const f of all) {
      const kinds = [FIELD_FAILURES.has(f), TERMINAL_FAILURES.has(f), f === 'technical'].filter(Boolean)
      expect(kinds, f).toHaveLength(1)
    }
  })
  it('technical is retryable (never terminal)', () => {
    expect(TERMINAL_FAILURES.has('technical')).toBe(false)
  })
})
