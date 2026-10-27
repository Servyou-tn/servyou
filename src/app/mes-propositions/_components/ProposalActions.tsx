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
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import { isProposalActive, type ProposalState } from '@/lib/marche/proposals'
import { withdrawProposalAction } from '../actions'

// The row's `actions` cell — Figma 296:9022: [« Voir la mission » secondary/sm · WhatsApp icon 36 · kebab 36], gap 8, end-aligned.
// Client because the WhatsApp reveal reads the phone on click and the kebab opens the withdraw confirmation.
//
//   open                → « Voir la mission » (/missions/[id], which shows its answered state) · live WhatsApp · kebab: Voir ma
//                         proposition (H13) + Retirer ma proposition (D-H11-2)
//   filled / expired    → same link; WhatsApp is the disabled sunken circle (follow up live pitches only); kebab: Voir ma proposition
//   unavailable         → the post is gone, so « Voir la mission » would 404: the primary link is « Voir ma proposition » (H13 renders
//                         the recap without the mission); no WhatsApp target; no kebab (nothing left to do)
export function ProposalActions({
  responseId,
  jobPostId,
  state,
  clientId,
  title,
  lang,
  whatsappMessage,
}: {
  responseId: string
  jobPostId: string
  state: ProposalState
  clientId: string | null
  /** Names the kebab for assistive tech and the confirmation. */
  title: string
  lang: Lang
  whatsappMessage: string
}) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const active = isProposalActive(state)
  const gone = state === 'unavailable'
  const recapHref = `/missions/${jobPostId}/proposition-envoyee`

  function withdraw() {
    startTransition(async () => {
      const result = await withdrawProposalAction({ responseId })
      setConfirmOpen(false)
      if (result.ok) {
        toast.success(t('propositions.withdraw.done', lang))
        router.refresh()
        return
      }
      // A post that closed in the meantime, or a row already gone, is a stale list: say why and refresh it.
      toast.error(t(result.reason === 'technical' ? 'common.error_generic' : 'propositions.withdraw.stale', lang))
      if (result.reason !== 'technical') router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={gone ? recapHref : `/missions/${jobPostId}`}
        className={cn(BUTTON_BASE, BUTTON_SIZE.sm, VARIANT_BASE.secondary, VARIANT_STATE.secondary, 'whitespace-nowrap')}
      >
        {t(gone ? 'propositions.view_mine' : 'propositions.view_mission', lang)}
      </Link>

      {clientId ? (
        <WhatsAppContactButton
          iconOnly
          disabled={!active}
          targetId={clientId}
          label={t(active ? 'propositions.whatsapp_aria' : 'propositions.whatsapp_closed_aria', lang)}
          message={whatsappMessage}
          errorMessageKey="proposal.sent.whatsapp_error"
          noPhoneMessageKey="proposal.sent.whatsapp_none"
        />
      ) : null}

      {gone ? null : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('propositions.row_actions_aria', lang, { title })}
              className={cn('relative flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-subtle', FOCUS_RING)}
            >
              <MoreVertical className="size-5" aria-hidden="true" />
              <span aria-hidden="true" className="absolute -inset-1" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-xl border border-border-subtle bg-white p-1 shadow-lg">
            <DropdownMenuItem asChild>
              <Link href={recapHref}>{t('propositions.view_mine', lang)}</Link>
            </DropdownMenuItem>
            {active ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
                  {t('propositions.withdraw.action', lang)}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {confirmOpen ? (
        <ConfirmModal
          titleId={`withdraw-${responseId}-title`}
          title={t('propositions.withdraw.title', lang)}
          body={t('propositions.withdraw.body', lang, { title })}
          cancelLabel={t('common.cancel', lang)}
          confirmLabel={t('propositions.withdraw.confirm', lang)}
          confirmVariant="danger"
          pending={pending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={withdraw}
        />
      ) : null}
    </div>
  )
}
