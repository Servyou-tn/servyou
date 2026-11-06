import { describe, expect, it } from 'vitest'
import {
  canChooseProposal,
  chooseErrorKey,
  isReopenAfterChoice,
  isSellerPhoneRequired,
  parseJobResponseStatus,
  proposalOutcome,
} from './journey-gates'

describe('journey gates (G1 / G2)', () => {
  it('reads the status column, defaulting to pending', () => {
    expect(parseJobResponseStatus('chosen')).toBe('chosen')
    expect(parseJobResponseStatus('not_chosen')).toBe('not_chosen')
    expect(parseJobResponseStatus(undefined)).toBe('pending')
    expect(parseJobResponseStatus('weird')).toBe('pending')
  })

  it('maps every choose_job_response refusal by hint', () => {
    expect(chooseErrorKey({ code: '23514', hint: 'job_filled' })).toBe('annonces.choose.error_filled')
    expect(chooseErrorKey({ code: '23514', hint: 'job_expired' })).toBe('annonces.choose.error_expired')
    expect(chooseErrorKey({ code: '23514', hint: 'job_unavailable' })).toBe('annonces.choose.error_unavailable')
    expect(chooseErrorKey({ code: '23514', hint: 'job_deleted' })).toBe('annonces.choose.error_unavailable')
    expect(chooseErrorKey({ code: '23514', hint: 'freelancer_unavailable' })).toBe('annonces.choose.error_freelancer')
    expect(chooseErrorKey({ code: 'P0002', hint: 'not_found' })).toBe('annonces.choose.error_not_found')
    expect(chooseErrorKey({ code: '42501', hint: 'suspended' })).toBe('annonces.choose.error_suspended')
    expect(chooseErrorKey({ code: '42501', hint: 'not_signed_in' })).toBe('annonce.error.not_authorized')
    expect(chooseErrorKey({ code: '08006', message: 'network' })).toBe('common.error_generic')
  })

  it('recognises the reopen-after-choice and the phone refusals by code + hint only', () => {
    expect(isReopenAfterChoice({ code: '23514', hint: 'job_response_chosen' })).toBe(true)
    expect(isReopenAfterChoice({ code: '23514', hint: 'job_post_cap_open' })).toBe(false)
    expect(isSellerPhoneRequired({ code: '23514', hint: 'seller_phone_required' })).toBe(true)
    expect(isSellerPhoneRequired({ code: 'P0001', hint: 'seller_phone_required' })).toBe(false)
  })

  it('the freelancer reads the proposal outcome, not the post state', () => {
    expect(proposalOutcome('chosen', 'filled')).toBe('chosen')
    expect(proposalOutcome('not_chosen', 'filled')).toBe('not_chosen')
    expect(proposalOutcome('pending', 'open')).toBe('pending')
    expect(proposalOutcome('pending', 'expired')).toBe('expired')
    // closed by hand before the sync trigger existed
    expect(proposalOutcome('pending', 'filled')).toBe('not_chosen')
    expect(proposalOutcome('pending', 'unavailable')).toBe('unavailable')
    // a chosen proposal stays « Choisie » even once the post is past 30 days
    expect(proposalOutcome('chosen', 'expired')).toBe('chosen')
  })

  it('« Choisir » only on an open, unmoderated post with nobody chosen yet', () => {
    expect(canChooseProposal('open', false, false)).toBe(true)
    expect(canChooseProposal('open', true, false)).toBe(false)
    expect(canChooseProposal('filled', false, false)).toBe(false)
    expect(canChooseProposal('expired', false, false)).toBe(false)
    expect(canChooseProposal('open', false, true)).toBe(false)
  })
})
