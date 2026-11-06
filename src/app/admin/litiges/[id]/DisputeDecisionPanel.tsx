'use client'

import { useRef, useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { ADMIN_TEXT_MAX } from '@/lib/admin/action-input'
import { dismissDispute, resolveDispute, type DisputeActionResult } from '../actions'

type Action = 'sided_buyer' | 'sided_seller' | 'compromise' | 'dismiss'

// J7 « Décision » (Figma NOV 4 — Admin): ONE note, four decisions — Donner raison à l'acheteur (primary),
// Donner raison au vendeur / Proposer un accord (secondary), Rejeter le litige (ghost). Each button calls the
// EXISTING resolveDispute(id, outcome, note) / dismissDispute(id, note) in ../actions.ts — no new logic. Both
// require a note: the buttons keep their frame colours and a blank note answers with the action's own
// « required » key before any round-trip. Errors are stored as i18n keys. Each action revalidates on success.
export function DisputeDecisionPanel({ disputeId }: { disputeId: string }) {
  const lang = useLang()
  const [note, setNote] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [running, setRunning] = useState<Action | null>(null)
  const [pending, startTransition] = useTransition()
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const busy = pending || running !== null

  function run(action: Action) {
    if (note.trim().length === 0) {
      setErrorKey(action === 'dismiss' ? 'admin.disputes.dismiss_note_required' : 'admin.disputes.note_required')
      noteRef.current?.focus()
      return
    }
    setErrorKey(null)
    setRunning(action)
    startTransition(async () => {
      // A thrown action (network drop, 500) must not leave every button locked.
      try {
        const res: DisputeActionResult =
          action === 'dismiss' ? await dismissDispute(disputeId, note) : await resolveDispute(disputeId, action, note)
        if (!res.success) setErrorKey(res.error ?? 'common.error_generic')
      } catch {
        setErrorKey('common.error_generic')
      } finally {
        setRunning(null)
      }
    })
  }

  const button = (action: Action, variant: 'primary' | 'secondary' | 'ghost', key: string) => (
    <Button variant={variant} className="w-full" disabled={busy && running !== action} loading={running === action} onClick={() => run(action)}>
      {t(key, lang)}
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="dispute-note" className="sr-only">{t('admin.disputes.decision_note_label', lang)}</label>
      <textarea
        ref={noteRef}
        id="dispute-note"
        value={note}
        maxLength={ADMIN_TEXT_MAX}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('admin.disputes.decision_note_placeholder', lang)}
        aria-describedby={errorKey ? 'dispute-error' : undefined}
        className="h-24 w-full resize-y rounded-lg border border-border-strong bg-surface-base px-3.5 py-3 text-body-sm text-text-primary placeholder:text-text-muted focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600 focus:ring-offset-2"
      />
      {button('sided_buyer', 'primary', 'admin.disputes.action_side_buyer')}
      {button('sided_seller', 'secondary', 'admin.disputes.action_side_seller')}
      {button('compromise', 'secondary', 'admin.disputes.action_compromise')}
      {button('dismiss', 'ghost', 'admin.disputes.action_dismiss')}
      {errorKey ? <p id="dispute-error" role="alert" className="text-body-sm text-danger-700">{t(errorKey, lang)}</p> : null}
      <p className="text-caption font-medium text-text-muted">{t('admin.disputes.decision_disclaimer', lang)}</p>
    </div>
  )
}
