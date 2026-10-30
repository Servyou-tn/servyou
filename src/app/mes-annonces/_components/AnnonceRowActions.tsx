'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmModal } from '@/components/marche/ConfirmModal'
import { closeMissionAction, deleteMissionAction, reopenMissionAction } from '../[id]/actions'

type Confirm = 'close' | 'delete' | null

// The row's `actions` cell — Figma 1476:27949 PropositionRow: [« Voir les propositions » secondary/sm · kebab 36], gap 8, end-aligned.
// The kebab is not drawn (D7): it only wires the three manage actions the detail page already has, with the same server actions,
// toasts and confirmations — Fermer (open only) · Rouvrir (a filled post still inside its 30 days) · Supprimer (always).
// `canReopen` is computed on the server (a client clock would disagree with SSR near the 30-day edge).
export function AnnonceRowActions({
  id,
  title,
  canClose,
  canReopen,
  lang,
}: {
  id: string
  /** Names the kebab for assistive tech. */
  title: string
  canClose: boolean
  canReopen: boolean
  lang: Lang
}) {
  const router = useRouter()
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [pending, startTransition] = useTransition()

  function run(action: (id: string) => Promise<{ ok: boolean; errorKey?: string }>, doneKey: string) {
    startTransition(async () => {
      const res = await action(id)
      setConfirm(null)
      if (!res.ok) {
        toast.error(t(res.errorKey ?? 'common.error_generic', lang))
        return
      }
      toast.success(t(doneKey, lang))
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/mes-annonces/${id}`}
        className={cn(BUTTON_BASE, BUTTON_SIZE.sm, VARIANT_BASE.secondary, VARIANT_STATE.secondary, 'whitespace-nowrap')}
      >
        {t('mesannonces.row.view', lang)}
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('mesannonces.row.actions_aria', lang, { title })}
            className={cn('relative flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-subtle', FOCUS_RING)}
          >
            <MoreVertical className="size-5" aria-hidden="true" />
            <span aria-hidden="true" className="absolute -inset-1" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-xl border border-border-subtle bg-white p-1 shadow-lg">
          {canClose ? (
            <DropdownMenuItem onSelect={() => setConfirm('close')}>{t('annonces.detail.close', lang)}</DropdownMenuItem>
          ) : null}
          {canReopen ? (
            <DropdownMenuItem disabled={pending} onSelect={() => run(reopenMissionAction, 'annonces.detail.reopen_success')}>
              {t('annonces.detail.reopen', lang)}
            </DropdownMenuItem>
          ) : null}
          {canClose || canReopen ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm('delete')}>
            {t('annonces.detail.delete', lang)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm === 'close' ? (
        <ConfirmModal
          titleId={`close-${id}-title`}
          title={t('annonces.detail.close_modal_title', lang)}
          body={t('annonces.detail.close_modal_body', lang)}
          cancelLabel={t('common.cancel', lang)}
          confirmLabel={t('annonces.detail.confirm', lang)}
          confirmVariant="primary"
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => run(closeMissionAction, 'annonces.detail.close_success')}
        />
      ) : null}
      {confirm === 'delete' ? (
        <ConfirmModal
          titleId={`delete-${id}-title`}
          title={t('annonces.detail.delete_modal_title', lang)}
          body={t('annonces.detail.delete_modal_body', lang)}
          cancelLabel={t('common.cancel', lang)}
          confirmLabel={t('annonces.detail.delete_confirm', lang)}
          confirmVariant="danger"
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => run(deleteMissionAction, 'annonces.detail.delete_success')}
        />
      ) : null}
    </div>
  )
}
