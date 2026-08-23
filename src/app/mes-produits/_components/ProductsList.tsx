'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { t, tn, type Lang } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { bulkActivateProductsAction, bulkDeleteProductsAction } from '@/app/actions/products'
import type { SellerProductRow } from '@/lib/marche/seller-products'
import { ProductRow } from './ProductRow'

// Bulk select owner (§8.5): current-page-only selection, route-local client state — no precedent
// in this codebase for cross-page selection, and none is needed since the ruling scopes it to the
// page being viewed. Both risky bulk actions (Activer, Supprimer) share one result shape: report
// what updated and what was skipped, via a toast (the existing pattern — see ProductForm.tsx).
export function ProductsList({ products, lang }: { products: SellerProductRow[]; lang: Lang }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const router = useRouter()

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clear = () => setSelected(new Set())

  const runBulkActivate = () => {
    const productIds = [...selected]
    startTransition(async () => {
      const result = await bulkActivateProductsAction({ productIds })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (result.skipped.length === 0) {
        toast.success(t('product.bulk.activate_result', lang, { updated: result.updatedCount }))
      } else {
        // The aggregate sentence names the count and the shared reason; the description line names
        // each skipped row by title — "report what was skipped and why, per skipped row."
        toast.warning(
          t('product.bulk.activate_result_skipped', lang, {
            updated: result.updatedCount,
            skipped: result.skipped.length,
          }),
          { description: result.skipped.map((s) => s.title).join(', ') },
        )
      }
      clear()
      router.refresh()
    })
  }

  const runBulkDelete = () => {
    const productIds = [...selected]
    startTransition(async () => {
      const result = await bulkDeleteProductsAction({ productIds })
      setConfirmingDelete(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (result.skipped.length === 0) {
        toast.success(t('product.bulk.delete_result', lang, { updated: result.updatedCount }))
      } else {
        toast.warning(
          t('product.bulk.delete_result_skipped', lang, {
            updated: result.updatedCount,
            skipped: result.skipped.length,
          }),
          { description: result.skipped.map((s) => s.title).join(', ') },
        )
      }
      clear()
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-blue-100 bg-brand-blue-50 px-4 py-3">
          <p className="text-body-sm font-medium text-text-primary">
            <span dir="ltr">{tn('product.bulk.selected_count', lang, selected.size)}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={clear} disabled={pending}>
              {t('product.bulk.deselect', lang)}
            </Button>
            <Button variant="secondary" size="sm" loading={pending} onClick={runBulkActivate}>
              {t('product.action_activate', lang)}
            </Button>
            <Button variant="danger" size="sm" disabled={pending} onClick={() => setConfirmingDelete(true)}>
              {t('common.delete', lang)}
            </Button>
          </div>
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            lang={lang}
            checked={selected.has(product.id)}
            onToggle={() => toggle(product.id)}
          />
        ))}
      </ul>

      {confirmingDelete ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('common.delete', lang)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-xl bg-surface-base p-6">
            <p className="text-body text-text-primary">
              {tn('product.bulk.confirm_delete', lang, selected.size)}
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
              <Button variant="danger" size="md" loading={pending} onClick={runBulkDelete}>
                {t('common.delete', lang)}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
