'use client'

import { useRef, useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { ADMIN_TEXT_MAX } from '@/lib/admin/action-input'
import {
  dismissReport,
  hideContent,
  resolveReport,
  suspendReportedUser,
  type ModerationTargetType,
  type ReportActionResult,
} from '../actions'
import { UnhideButton } from './UnhideButton'
import { UnsuspendReportedUserButton } from './UnsuspendReportedUserButton'

type Action = 'hide' | 'suspend' | 'resolve' | 'dismiss'

// The actions' own « a note is required » keys (the server returns the same ones).
const REQUIRED_KEY: Record<Action, string> = {
  hide: 'admin.moderation.hide_reason_required',
  suspend: 'admin.users.suspend_reason_required',
  resolve: 'admin.reports.admin_note_required',
  dismiss: 'admin.reports.dismiss_note_required',
}

// J6 « Décision » (Figma NOV 4 — Admin): ONE note, four decisions — Masquer le contenu (danger),
// Suspendre l'utilisateur (secondary), Résoudre avec la note (primary), Rejeter le signalement (ghost).
// Every button calls the EXISTING server action in ../actions.ts with that note; no new logic. All four
// actions require a note: the buttons keep their frame colours (a disabled Button recolours to grey) and a
// blank note answers with that action's own « required » key before any round-trip. Errors are stored as i18n
// KEYS and translated at render. Already-hidden content / an already-suspended account swap their
// button for the existing restore / reactivate one. Each action revalidates this page on success.
export function DecisionPanel({
  reportId,
  canDecide,
  hide,
  unhide,
  suspend,
  unsuspend,
}: {
  reportId: string
  /** open / under_review — resolve + dismiss are offered. */
  canDecide: boolean
  hide: { targetType: ModerationTargetType; targetId: string } | null
  unhide: { targetType: ModerationTargetType; targetId: string } | null
  suspend: { userId: string } | null
  unsuspend: { userId: string } | null
}) {
  const lang = useLang()
  const [note, setNote] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [running, setRunning] = useState<Action | null>(null)
  const [pending, startTransition] = useTransition()

  const noteRef = useRef<HTMLTextAreaElement>(null)
  const busy = pending || running !== null

  function run(action: Action, call: () => Promise<ReportActionResult>, fallbackKey: string) {
    if (note.trim().length === 0) {
      setErrorKey(REQUIRED_KEY[action])
      noteRef.current?.focus()
      return
    }
    if (action === 'suspend' && !window.confirm(t('admin.users.suspend_confirm', lang))) return
    setErrorKey(null)
    setRunning(action)
    startTransition(async () => {
      const res = await call()
      setRunning(null)
      if (!res.success) setErrorKey(res.error ?? fallbackKey)
    })
  }

  const showNote = canDecide || hide !== null || suspend !== null

  return (
    <div className="flex flex-col gap-4">
      {showNote ? (
        <>
          <label htmlFor="decision-note" className="sr-only">
            {t('admin.reports.decision_note_label', lang)}
          </label>
          <textarea
            ref={noteRef}
            id="decision-note"
            value={note}
            maxLength={ADMIN_TEXT_MAX}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('admin.reports.decision_note_placeholder', lang)}
            aria-describedby={errorKey ? 'decision-error' : undefined}
            aria-invalid={errorKey !== null && Object.values(REQUIRED_KEY).includes(errorKey) ? true : undefined}
            className="h-24 w-full resize-y rounded-lg border border-border-strong bg-surface-base px-3.5 py-3 text-body-sm text-text-primary placeholder:text-text-muted focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600 focus:ring-offset-2"
          />
        </>
      ) : null}

      {hide ? (
        <Button
          variant="danger"
          className="w-full"
          disabled={busy && running !== 'hide'}
          loading={running === 'hide'}
          onClick={() => run('hide', () => hideContent(hide.targetType, hide.targetId, note, reportId), 'common.error_generic')}
        >
          {t('admin.reports.action_hide', lang)}
        </Button>
      ) : null}
      {unhide ? <UnhideButton targetType={unhide.targetType} targetId={unhide.targetId} reportId={reportId} /> : null}

      {suspend ? (
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy && running !== 'suspend'}
          loading={running === 'suspend'}
          onClick={() => run('suspend', () => suspendReportedUser(suspend.userId, note, reportId), 'common.error_generic')}
        >
          {t('admin.reports.action_suspend', lang)}
        </Button>
      ) : null}
      {unsuspend ? <UnsuspendReportedUserButton targetUserId={unsuspend.userId} reportId={reportId} /> : null}

      {canDecide ? (
        <>
          <Button
            variant="primary"
            className="w-full"
            disabled={busy && running !== 'resolve'}
            loading={running === 'resolve'}
            onClick={() => run('resolve', () => resolveReport(reportId, note), 'admin.reports.error_not_actionable')}
          >
            {t('admin.reports.action_resolve_with_note', lang)}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={busy && running !== 'dismiss'}
            loading={running === 'dismiss'}
            onClick={() => run('dismiss', () => dismissReport(reportId, note), 'admin.reports.error_dismiss_no_row')}
          >
            {t('admin.reports.action_dismiss', lang)}
          </Button>
        </>
      ) : null}

      {errorKey ? (
        <p id="decision-error" role="alert" className="text-body-sm text-danger-700">
          {t(errorKey, lang)}
        </p>
      ) : null}

      <p className="text-caption font-medium text-text-muted">{t('admin.reports.decision_logged', lang)}</p>
    </div>
  )
}
