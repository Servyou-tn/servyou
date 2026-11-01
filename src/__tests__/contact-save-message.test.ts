/**
 * saveContactMessage (src/lib/contact/save-message.ts): a refused insert is logged WITHOUT error.details — for a
 * CHECK / NOT NULL refusal PostgREST puts the failing row (the sender's name, email and message) there — and NUL
 * characters are stripped before the insert (Postgres text cannot hold them). The service-role client is mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => ({ insert: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: () => ({ insert: db.insert }) }) }))

import { saveContactMessage } from '@/lib/contact/save-message'

const ROW = { name: 'Sami Trabelsi', email: 'sami@example.com', subject: null, message: 'Bonjour', userId: null }

beforeEach(() => {
  db.insert.mockReset().mockResolvedValue({ error: null })
})

describe('saveContactMessage', () => {
  it('a refused insert logs message + code only, never the failing row', async () => {
    const lines: string[] = []
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(' '))
    })
    db.insert.mockResolvedValue({
      error: { message: 'new row violates check constraint', code: '23514', details: 'Failing row contains (Sami Trabelsi, sami@example.com, Bonjour)' },
    })
    expect(await saveContactMessage(ROW)).toEqual({ ok: false })
    const logged = lines.join('\n')
    expect(logged).toContain('23514')
    expect(logged).not.toContain('Sami')
    expect(logged).not.toContain('sami@example.com')
    expect(logged).not.toContain('Bonjour')
  })

  it('strips NUL characters before the insert', async () => {
    await saveContactMessage({ ...ROW, name: 'Sa\u0000mi', message: 'Bon\u0000jour' })
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sami', message: 'Bonjour' }))
  })
})
