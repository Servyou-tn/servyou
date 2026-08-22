'use client'

import { useState, useTransition } from 'react'
import { t, type Lang } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { deleteProductAction } from '@/app/actions/products'

// G7 typed-confirm delete modal, Figma 536:32818. Shared between G5's ProductRow (kebab menu)
// and G7's DangerZone — the founder ruling was that two confirmation patterns for one destructive
// action (G5's plain confirm() vs. this) is worse than either, so both surfaces render THIS.
//
// ⚑ ONLY EVER RENDERED FOR A ZERO-ORDER PRODUCT. Both callers gate on `hasOrders` themselves and
// show the disabled-with-reason state instead when it's true (ProductRow.tsx's existing kebab-item
// pattern) — this component assumes the delete it's about to attempt is the one §7 already proved
// succeeds. Its body copy deliberately does NOT say anything about existing orders (the frame's own
// "commandes non affectées" line): every product this modal can be opened for has none, so a line
// about orders being preserved would only raise a question this population never has.
//
// The delete itself still goes through deleteProductAction's own order-count check — this modal
// gating on hasOrders is affordance, not the security boundary, same relationship the disabled
// "Supprimer" button in ProductRow already has to the server-side check.
export function DeleteProductModal({
  productId,
  productTitle,
  lang,
  onCancel,
  onDeleted,
}: {
  productId: string
  productTitle: string
  lang: Lang
  onCancel: () => void
  onDeleted: () => void
}) {
  const [keyword, setKeyword] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const requiredKeyword = t('product.delete_modal.keyword', lang)
  // Trimmed, not exact-raw — mobile keyboards routinely append a trailing space (autocomplete/
  // autocapitalize), and a match that fails only on whitespace would leave the button disabled
  // with nothing telling the seller why.
  const matches = keyword.trim() === requiredKeyword

  const runDelete = () => {
    if (!matches || pending) return
    setError(null)
    startTransition(async () => {
      const result = await deleteProductAction({ productId })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onDeleted()
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('product.delete_modal.title', lang)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-scrim p-4"
    >
      <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-xl bg-surface-base p-6">
        <div className="flex flex-col gap-1.5">
          <p className="text-body font-semibold text-text-primary">
            {t('product.delete_modal.title', lang)}
          </p>
          <p className="text-body-sm text-text-secondary">
            {t('product.delete_modal.body', lang, { title: productTitle })}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="delete-confirm-input" className="text-body-sm text-text-secondary">
            {t('product.delete_modal.confirm_label', lang, { keyword: requiredKeyword })}
          </label>
          <input
            id="delete-confirm-input"
            type="text"
            autoComplete="off"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className={`h-11 rounded-lg border border-border-strong bg-surface-base px-4 text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={pending}>
            {t('common.cancel', lang)}
          </Button>
          <Button variant="danger" size="md" loading={pending} disabled={!matches} onClick={runDelete}>
            {t('product.delete_modal.confirm_cta', lang)}
          </Button>
        </div>
      </div>
    </div>
  )
}
