'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Wrench, MoreVertical } from 'lucide-react'
import { t, tn, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { StatusPill } from '@/components/ui/status-pill'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toggleServiceStatusAction } from '@/app/actions/services'
import { tndPrice } from '@/components/listings/listing-utils'
import type { SellerServiceRow } from '@/lib/marche/seller-services'
import { CascadeWarningModal } from './CascadeWarningModal'
import { DeleteServiceModal } from './DeleteServiceModal'

// H5's row — Figma 258:7898 (Service Row, state[default,hover] × status[active,paused]), measured
// as a FLAT divided table row (cornerRadius 0, bottom-only 1px hairline, INSIDE stroke), not a
// bordered card. ProductRow.tsx's LOGIC is the reference (status toggle, moderation lock, delete
// modal) — not its markup, per the founder ruling. No mobile frame exists for H5 (unmeasured, same
// as ProductRow's own inferred reflow) — this one stacks below lg the same shape ProductRow uses.
//
// Column shape deviates from G5 on purpose (founder rulings): "Voir" (not "Modifier") is the
// visible link — it goes to the PUBLIC service page (D2); edit is a kebab item, permanently
// disabled because H6/H7 don't exist in code yet, same "coming soon" tooltip H4's inert CTAs use.
// The kebab is Activer/Mettre en pause (not Dupliquer/Partager, which the generic Kebab Menu master
// component draws but nothing in the schema or this app's plumbing backs).
export function ServiceRow({ service, lang }: { service: SellerServiceRow; lang: Lang }) {
  const [pending, startTransition] = useTransition()
  const [modal, setModal] = useState<'none' | 'cascade-pause' | 'cascade-delete' | 'delete-confirm'>('none')
  const router = useRouter()

  const isModerated = service.adminHiddenAt != null
  const isActive = service.status === 'active'

  const pillStatus = isActive ? 'active' : isModerated ? 'moderated' : 'paused'
  const pillLabel = isActive
    ? t('common.status_active', lang)
    : isModerated
      ? t('service.status_moderated', lang)
      : t('service.status_paused', lang)

  const runToggle = (nextStatus: 'active' | 'hidden') => {
    startTransition(async () => {
      const result = await toggleServiceStatusAction({ serviceId: service.id, nextStatus })
      setModal('none')
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  const onActivate = () => runToggle('active')
  const onPauseClick = () => {
    if (service.isLastActive) setModal('cascade-pause')
    else runToggle('hidden')
  }
  const onDeleteClick = () => {
    if (service.isLastActive) setModal('cascade-delete')
    else setModal('delete-confirm')
  }

  return (
    <li className="flex flex-col gap-3 border-b border-border-subtle p-4 last:border-b-0 lg:flex-row lg:items-center lg:gap-6 lg:px-6 lg:py-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-blue-50">
          <Wrench className="size-5 text-brand-blue-600" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-body font-semibold text-text-primary">{service.title}</p>
          {service.description ? (
            <p className="truncate text-body-sm text-text-secondary">{service.description}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 lg:flex lg:shrink-0 lg:items-center lg:gap-6">
        <div className="flex lg:w-[150px]">
          <StatusPill status={pillStatus}>{pillLabel}</StatusPill>
        </div>
        <StatCol label={t('service.from_price', lang)} value={tndPrice(service.priceTnd)} className="lg:w-[120px]" />
        <StatCol
          label={t('service.col_orders', lang)}
          value={tn('seller.orders.count', lang, service.ordersCount)}
          className="lg:w-[130px]"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/services/${service.id}`}
          className={cn(
            'inline-flex h-9 items-center rounded-lg border border-border-subtle px-3 text-body-sm font-medium text-text-secondary hover:bg-surface-subtle',
            FOCUS_RING,
          )}
        >
          {t('service.action_view', lang)}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={pending}
              aria-label={t('service.actions_menu_aria', lang, { title: service.title })}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-subtle disabled:opacity-50',
                FOCUS_RING,
              )}
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border border-border-subtle bg-white p-1 shadow-lg">
            {isActive ? (
              <DropdownMenuItem disabled={pending} onSelect={onPauseClick}>
                {t('service.action_pause', lang)}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={pending || isModerated}
                title={isModerated ? t('owner.moderation_banner.service', lang) : undefined}
                onSelect={onActivate}
              >
                {t('service.action_activate', lang)}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem disabled title={t('marche.sidebar.coming_soon', lang)}>
              {t('service.action_edit', lang)}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={pending || service.hasOrders}
              title={service.hasOrders ? t('service.error_delete_has_orders', lang) : undefined}
              variant="destructive"
              onSelect={onDeleteClick}
            >
              {t('common.delete', lang)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {modal === 'cascade-pause' ? (
        <CascadeWarningModal
          variant="pause"
          lang={lang}
          pending={pending}
          onCancel={() => setModal('none')}
          onConfirm={() => runToggle('hidden')}
        />
      ) : null}

      {modal === 'cascade-delete' ? (
        <CascadeWarningModal
          variant="delete"
          lang={lang}
          pending={false}
          onCancel={() => setModal('none')}
          onConfirm={() => setModal('delete-confirm')}
        />
      ) : null}

      {modal === 'delete-confirm' ? (
        <DeleteServiceModal
          serviceId={service.id}
          serviceTitle={service.title}
          lang={lang}
          onCancel={() => setModal('none')}
          onDeleted={() => {
            setModal('none')
            router.refresh()
          }}
        />
      ) : null}
    </li>
  )
}

function StatCol({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <p className="text-caption text-text-muted">{label}</p>
      <p dir="ltr" className="truncate text-start text-body-sm font-semibold text-text-primary">
        {value}
      </p>
    </div>
  )
}
