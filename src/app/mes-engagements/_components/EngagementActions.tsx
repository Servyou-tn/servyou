'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreVertical } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AdvanceOrderButton } from '@/components/orders/AdvanceOrderButton'
import { CancelOrderDialog } from '@/components/orders/CancelOrderButton'
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import { SERVICE_CANCEL_REASONS } from '@/lib/orders/cancel-reasons'
import { isCancellable, nextSellerStatus, type OrderStatus } from '@/lib/types/order-status'

// The row's `actions` cell — Figma 274:9204 / I274:9231;273:9166: [next button 120 · whatsapp 36 · kebab 36],
// gap 8, end-aligned. Client because the three controls are interactive (advance / cancel are server
// actions, the WhatsApp reveal reads the phone on click, the kebab opens the cancel dialog).
//
// The next button per status (the frame draws « Marquer livré » on En cours and « Voir » on Livré / Terminé):
//   pending   → « Accepter »       (advance: pending → accepted — a plain transition now, ruling D5)
//   accepted  → « Marquer livré »  (advance: accepted → arrived)
//   otherwise → « Voir »           (arrived waits on the BUYER's confirmation; the rest are terminal)
// Which hop is the seller's is NOT decided here: nextSellerStatus is the one source G4, G8 and H8 share.
//
// The kebab holds « Voir le détail » and « Annuler » (ruling D10); « Annuler » opens the cancel dialog with
// the freelancer's service presets and is offered only while the order can still be cancelled.

const NEXT_BUTTON = 'min-w-[120px]'

export function EngagementActions({
  orderId,
  status,
  clientId,
  title,
  lang,
  whatsappMessage,
  detailHref,
}: {
  orderId: string
  status: OrderStatus
  clientId: string
  /** The service title — names the kebab for assistive tech. */
  title: string
  lang: Lang
  /** Fully composed and localised by the row (the button only reveals the number and opens wa.me). */
  whatsappMessage: string
  detailHref: string
}) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const next = nextSellerStatus(status, 'service')
  const cancellable = isCancellable(status)

  return (
    <div className="flex items-center justify-end gap-2">
      {next ? (
        <AdvanceOrderButton
          orderId={orderId}
          label={t(`engagements.advance.${next}`, lang)}
          revalidate="/mes-engagements"
          className={NEXT_BUTTON}
        />
      ) : (
        <Link
          href={detailHref}
          className={cn(BUTTON_BASE, BUTTON_SIZE.sm, VARIANT_BASE.secondary, VARIANT_STATE.secondary, NEXT_BUTTON)}
        >
          {t('engagements.view', lang)}
        </Link>
      )}

      <WhatsAppContactButton
        iconOnly
        targetId={clientId}
        label={t('engagements.whatsapp_aria', lang)}
        message={whatsappMessage}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('engagements.row_actions_aria', lang, { title })}
            className={cn(
              'relative flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-subtle',
              FOCUS_RING,
            )}
          >
            <MoreVertical className="size-5" aria-hidden="true" />
            <span aria-hidden="true" className="absolute -inset-1" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl border border-border-subtle bg-white p-1 shadow-lg">
          <DropdownMenuItem asChild>
            <Link href={detailHref}>{t('engagements.view_detail', lang)}</Link>
          </DropdownMenuItem>
          {cancellable ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setCancelOpen(true)}>
                {t('engagements.cancel', lang)}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {cancelOpen ? (
        <CancelOrderDialog
          orderId={orderId}
          status={status}
          orderType="service"
          lang={lang}
          reasons={SERVICE_CANCEL_REASONS}
          revalidate="/mes-engagements"
          onClose={() => setCancelOpen(false)}
        />
      ) : null}
    </div>
  )
}
