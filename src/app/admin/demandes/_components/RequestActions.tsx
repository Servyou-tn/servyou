'use client'

import { useId, useRef, useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import type { RequestActionResult } from '@/lib/admin/requests'
import {
  approveDeletionRequest,
  completeDataExport,
  markContactMessageHandled,
  rejectDataExport,
  rejectDeletionRequest,
} from '../actions'

// J10 « Demandes » buttons. Every decision calls Agent A's EXISTING actions in ../actions.ts (no new logic) through a
// native modal <dialog>: the irreversible deletion states it plainly; refusals require the note the actions require
// (RefusalInput); approvals take an optional note. Errors are i18n keys (REQUEST_ERROR → admin.requests.error_*).
// An approval that comes back `approved: true` + error_erasure_incomplete IS approved: the page re-renders with
// « Terminer la suppression » on that request.

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

function ActionDialog({
  triggerKey,
  triggerVariant,
  titleKey,
  bodyKey,
  confirmKey,
  confirmVariant,
  noteRequired,
  noteLabelKey,
  run,
  subject,
}: {
  triggerKey: string
  triggerVariant: Variant
  titleKey: string
  bodyKey?: string
  confirmKey: string
  confirmVariant: Variant
  noteRequired: boolean
  noteLabelKey: string
  run: (note: string) => Promise<RequestActionResult>
  subject: string
}) {
  const lang = useLang()
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [note, setNote] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <Button variant={triggerVariant} onClick={() => dialogRef.current?.showModal()} aria-haspopup="dialog">
        {t(triggerKey, lang)}
        <span className="sr-only"> — {subject}</span>
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onCancel={(e) => { if (pending) e.preventDefault() }}
        onClose={() => { setNote(''); setErrorKey(null) }}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-border-subtle bg-surface-base p-6 text-start text-text-primary shadow-lg backdrop:bg-text-primary/40"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setErrorKey(null)
            startTransition(async () => {
              try {
                const res = await run(note)
                if (res.success) dialogRef.current?.close()
                else setErrorKey(res.error)
              } catch {
                setErrorKey('common.error_generic')
              }
            })
          }}
          className="flex flex-col gap-4"
        >
          <h2 id={`${id}-title`} className="text-body-lg font-semibold text-text-primary">{t(titleKey, lang)}</h2>
          <p className="text-body-sm font-medium text-text-secondary"><bdi>{subject}</bdi></p>
          {bodyKey ? <p className="text-body-sm text-text-secondary">{t(bodyKey, lang)}</p> : null}
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-note`} className="text-body-sm font-medium text-text-secondary">{t(noteLabelKey, lang)}</label>
            <textarea
              id={`${id}-note`}
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              required={noteRequired}
              className="w-full resize-y rounded-lg border border-border-strong bg-surface-base px-3.5 py-3 text-body-sm text-text-primary placeholder:text-text-muted focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600 focus:ring-offset-2"
            />
          </div>
          {errorKey ? <p role="alert" className="text-body-sm text-danger-700">{t(errorKey, lang)}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" disabled={pending} onClick={() => dialogRef.current?.close()}>{t('admin.requests.cancel', lang)}</Button>
            <Button type="submit" variant={confirmVariant} loading={pending} disabled={noteRequired && note.trim().length === 0}>
              {t(confirmKey, lang)}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  )
}

export function DeletionActions({ requestId, subject, finish }: { requestId: string; subject: string; finish: boolean }) {
  if (finish) {
    // Approved, but the login / files step did not finish: re-running the approval only finishes the erasure.
    return (
      <ActionDialog
        triggerKey="admin.requests.action_finish" triggerVariant="danger"
        titleKey="admin.requests.finish_title" bodyKey="admin.requests.finish_body"
        confirmKey="admin.requests.action_finish" confirmVariant="danger"
        noteRequired={false} noteLabelKey="admin.requests.note_optional"
        run={(note) => approveDeletionRequest(requestId, note || undefined)} subject={subject}
      />
    )
  }
  return (
    <>
      <ActionDialog
        triggerKey="admin.requests.action_delete" triggerVariant="danger"
        titleKey="admin.requests.delete_title" bodyKey="admin.requests.delete_body"
        confirmKey="admin.requests.action_delete_confirm" confirmVariant="danger"
        noteRequired={false} noteLabelKey="admin.requests.note_optional"
        run={(note) => approveDeletionRequest(requestId, note || undefined)} subject={subject}
      />
    </>
  )
}

export function RefuseDeletion({ requestId, subject }: { requestId: string; subject: string }) {
  return (
    <ActionDialog
      triggerKey="admin.requests.action_refuse" triggerVariant="ghost"
      titleKey="admin.requests.refuse_title" confirmKey="admin.requests.action_refuse" confirmVariant="primary"
      noteRequired noteLabelKey="admin.requests.note_required_label"
      run={(note) => rejectDeletionRequest(requestId, note)} subject={subject}
    />
  )
}

export function ExportActions({ exportId, subject }: { exportId: string; subject: string }) {
  return (
    <>
      <ActionDialog
        triggerKey="admin.requests.action_export_done" triggerVariant="primary"
        titleKey="admin.requests.export_done_title" bodyKey="admin.requests.export_done_body"
        confirmKey="admin.requests.action_export_done" confirmVariant="primary"
        noteRequired={false} noteLabelKey="admin.requests.note_optional"
        run={(note) => completeDataExport(exportId, note || undefined)} subject={subject}
      />
      <ActionDialog
        triggerKey="admin.requests.action_refuse" triggerVariant="ghost"
        titleKey="admin.requests.refuse_title" confirmKey="admin.requests.action_refuse" confirmVariant="primary"
        noteRequired noteLabelKey="admin.requests.note_required_label"
        run={(note) => rejectDataExport(exportId, note)} subject={subject}
      />
    </>
  )
}

export function ContactActions({ messageId, subject }: { messageId: string; subject: string }) {
  return (
    <ActionDialog
      triggerKey="admin.requests.action_handled" triggerVariant="secondary"
      titleKey="admin.requests.handled_title" confirmKey="admin.requests.action_handled" confirmVariant="primary"
      noteRequired={false} noteLabelKey="admin.requests.note_optional"
      run={(note) => markContactMessageHandled(messageId, note || undefined)} subject={subject}
    />
  )
}
