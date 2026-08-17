'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Image as ImageIcon, MoreVertical } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { tndPrice } from '@/components/listings/listing-utils'
import { toggleProductStatusAction, deleteProductAction } from '@/app/actions/products'
import { isOutOfStock, type SellerProductRow } from '@/lib/marche/seller-products'

// §8.4: route-local, hand-built markup close to List Row's Figma instance (thumb, title, col1-3
// Prix/Stock/Vendus, status pill, Modifier, kebab) — not parameterized into a shared component,
// per the founder ruling and the SegmentedControl lesson §8.4 cites. §8.6: mobile reflow is
// INFERRED from OrderActionRow's own breakpoint mechanism (flex-col -> lg:flex-row), no G5 375
// frame exists — flagged for a founder visual check, not treated as measured.
export function ProductRow({
  product,
  lang,
  checked,
  onToggle,
}: {
  product: SellerProductRow
  lang: Lang
  checked: boolean
  onToggle: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const router = useRouter()

  const outOfStock = isOutOfStock({ tracks_stock: product.tracksStock, stock_count: product.stockCount })
  // admin_hidden_at only ever coexists with status='hidden' in practice (nothing sets status back
  // to 'active' without also clearing the marker via admin_unhide_content) — so it's the ONE thing
  // that can block "Activer", never "Masquer".
  const isModerated = product.adminHiddenAt != null

  const runToggle = (nextStatus: 'active' | 'hidden') => {
    startTransition(async () => {
      const result = await toggleProductStatusAction({ productId: product.id, nextStatus })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  const runDelete = () => {
    startTransition(async () => {
      const result = await deleteProductAction({ productId: product.id })
      setConfirmingDelete(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <li className="flex flex-col gap-3 rounded-[10px] border border-border-subtle bg-surface-base p-4 lg:flex-row lg:items-center lg:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={t('product.select_row_aria', lang, { title: product.title })}
          className="h-4 w-4 shrink-0 accent-brand-blue-600"
        />
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-sunken">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt="" fill sizes="48px" className="object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-icon-muted" aria-hidden="true" />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="truncate text-body font-semibold text-text-primary">{product.title}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={product.status === 'active' ? 'active' : 'masqué'}>
              {t(product.status === 'active' ? 'common.status_active' : 'common.status_hidden', lang)}
            </StatusPill>
            {/* Not mutually exclusive with the pill above — a product can be Actif AND Épuisé. */}
            {outOfStock ? (
              <StatusPill status="rupture-stock">{t('common.status_sold_out', lang)}</StatusPill>
            ) : null}
          </div>
        </div>
      </div>

      {/* Non-uniform columns: "Toujours disponible" (Stock, untracked) and a 4-digit-plus-decimals
          price both overflow an equal-thirds split at any reasonable row width. */}
      <div className="grid grid-cols-[minmax(70px,auto)_minmax(120px,auto)_minmax(56px,auto)] gap-4 lg:shrink-0">
        <StatCol label={t('product.col_price', lang)} value={tndPrice(product.priceTnd)} />
        <StatCol
          label={t('product.col_stock', lang)}
          value={product.tracksStock ? String(product.stockCount ?? 0) : t('common.stock_always', lang)}
        />
        <StatCol label={t('product.col_sold', lang)} value={String(product.soldCount)} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Bientôt pattern (§8.2), matching sidebar-items.ts/SidebarItem.tsx exactly: an inert,
            titled span rather than a link to a page that doesn't exist yet (G7). */}
        <span
          aria-disabled="true"
          title={t('shell.sidebar.soon', lang)}
          className="inline-flex h-9 cursor-not-allowed items-center rounded-lg border border-border-subtle px-3 text-body-sm font-medium text-text-muted"
        >
          {t('common.edit', lang)}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={pending}
              aria-label={t('product.actions_menu_aria', lang, { title: product.title })}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-subtle disabled:opacity-50',
                FOCUS_RING,
              )}
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-xl border border-border-subtle bg-white p-1 shadow-lg"
          >
            {product.status === 'hidden' ? (
              <DropdownMenuItem
                disabled={pending || isModerated}
                title={isModerated ? t('owner.moderation_banner.product', lang) : undefined}
                onSelect={() => runToggle('active')}
              >
                {t('product.action_activate', lang)}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled={pending} onSelect={() => runToggle('hidden')}>
                {t('product.action_hide', lang)}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={pending || product.hasOrders}
              title={product.hasOrders ? t('product.error_delete_has_orders', lang) : undefined}
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault()
                setConfirmingDelete(true)
              }}
            >
              {t('common.delete', lang)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {confirmingDelete ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('common.delete', lang)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-xl bg-surface-base p-6">
            <p className="text-body text-text-primary">
              {t('product.delete_confirm', lang, { title: product.title })}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setConfirmingDelete(false)}
                disabled={pending}
              >
                {t('common.cancel', lang)}
              </Button>
              <Button variant="danger" size="md" loading={pending} onClick={runDelete}>
                {t('common.delete', lang)}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  )
}

function StatCol({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-caption text-text-muted">{label}</p>
      <p dir="ltr" className="truncate text-start text-body-sm font-semibold text-text-primary">
        {value}
      </p>
    </div>
  )
}
