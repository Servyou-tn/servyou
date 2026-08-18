'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW } from '@/components/layout/styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { DeleteProductModal } from '@/components/produits/DeleteProductModal'
import { updateProductAction, toggleProductStatusAction } from '@/app/actions/products'
import type { ProductCategory } from '@/lib/marche/product-categories'
import type { SellerProductDetail } from '@/lib/marche/seller-products-query'
import { EditImageGallery } from './EditImageGallery'

type Errors = { title?: string; price?: string; deliveryFee?: string; stockCount?: string }

// G7 « Modifier un produit » — Figma 535:32433 (form) + 536:32793/536:32818 (§5 + delete modal).
//
// A SEPARATE component from ProductForm, not a mode-prop fork of it — the discovery report named
// three axes that resist: the footer (dirty-state + single save, no publish gate — the product
// already exists with a status), the write action (update vs. insert, no seed-pinning hazard, no
// imagePaths/publish in the payload) and the redirect. What's genuinely shared and reused
// UNMODIFIED below: Input, Toggle, the category <select>, the buyer-total preview line, and the
// section shell classes — copied from ProductForm rather than imported, the same relationship
// EditShopForm has to CreateShopForm's Input/Textarea usage.
export function EditProductForm({
  product,
  categories,
}: {
  product: SellerProductDetail
  categories: ProductCategory[]
}) {
  const lang = useLang()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})

  const [title, setTitle] = useState(product.title)
  const [categoryId, setCategoryId] = useState(product.categoryId)
  const [description, setDescription] = useState(product.description ?? '')
  const [price, setPrice] = useState(String(product.priceTnd))
  const [deliveryFee, setDeliveryFee] = useState(String(product.deliveryFeeTnd))
  const [tracksStock, setTracksStock] = useState(product.tracksStock)
  const [stockCount, setStockCount] = useState(product.stockCount != null ? String(product.stockCount) : '')

  // The baseline the dirty-indicator and the save call compare against — advances only on a
  // SUCCESSFUL save, so a failed save still reads as dirty rather than silently reverting to
  // "saved". Images are not part of this: EditImageGallery commits each add/remove immediately
  // through its own actions, independent of this form's save button.
  const [saved, setSaved] = useState({
    title: product.title,
    categoryId: product.categoryId,
    description: product.description ?? '',
    price: String(product.priceTnd),
    deliveryFee: String(product.deliveryFeeTnd),
    tracksStock: product.tracksStock,
    stockCount: product.stockCount != null ? String(product.stockCount) : '',
  })

  const isDirty =
    title !== saved.title ||
    categoryId !== saved.categoryId ||
    description !== saved.description ||
    price !== saved.price ||
    deliveryFee !== saved.deliveryFee ||
    tracksStock !== saved.tracksStock ||
    stockCount !== saved.stockCount

  // §5 — Actif/Masqué. Calls the EXISTING toggleProductStatusAction from G5 directly; this
  // component writes no status of its own. Local state so the control reflects the change
  // immediately rather than waiting on a full page reload — nothing else on this page depends on
  // status, so there is no second place that could disagree with it.
  const [status, setStatus] = useState<'active' | 'hidden'>(product.status === 'active' ? 'active' : 'hidden')
  const [statusPending, startStatusTransition] = useTransition()
  const isModerated = product.adminHiddenAt != null

  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const priceNum = Number.parseFloat(price)
  const feeNum = Number.parseFloat(deliveryFee)
  const safePrice = Number.isFinite(priceNum) ? priceNum : 0
  const safeFee = Number.isFinite(feeNum) ? feeNum : 0
  const fmt = (n: number) => n.toFixed(2).replace(/\.00$/, '')

  function runStatusChange(nextStatus: 'active' | 'hidden') {
    const previous = status
    setStatus(nextStatus)
    startStatusTransition(async () => {
      const res = await toggleProductStatusAction({ productId: product.id, nextStatus })
      if (!res.ok) {
        setStatus(previous)
        toast.error(res.error)
      }
    })
  }

  // Same shape as ProductForm's canPublish check, restated as explicit field errors rather than a
  // disabled-button gate — the form standard this app follows keeps Save always enabled and
  // validates on the attempt ("disabling the submit button... prevents the user from triggering
  // the validation that would tell them what is missing"), which G6's own disabled-publish-button
  // pattern doesn't follow. Not fixed there — out of this PR's scope — but not repeated here.
  function validate(): Errors {
    const next: Errors = {}
    if (!title.trim()) next.title = t('product.error_title', lang)
    if (price.trim() === '' || !Number.isFinite(priceNum) || priceNum < 0) next.price = t('product.error_price', lang)
    if (deliveryFee.trim() === '' || !Number.isFinite(feeNum) || feeNum < 0) {
      next.deliveryFee = t('product.error_price', lang)
    }
    if (tracksStock && stockCount.trim() === '') next.stockCount = t('product.error_stock_required', lang)
    return next
  }

  function submit() {
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setError(null)
    startTransition(async () => {
      const res = await updateProductAction({
        productId: product.id,
        title: title.trim(),
        categoryId,
        description: description.trim() || undefined,
        priceTnd: Number.isFinite(priceNum) ? priceNum : 0,
        deliveryFeeTnd: Number.isFinite(feeNum) ? feeNum : 0,
        tracksStock,
        stockCount: tracksStock ? Number.parseInt(stockCount || '0', 10) : undefined,
      })
      if (!res.ok) {
        setError(res.error)
        if (res.field) setErrors((prev) => ({ ...prev, [res.field as keyof Errors]: res.error }))
        return
      }
      setErrors({})
      setSaved({ title, categoryId, description, price, deliveryFee, tracksStock, stockCount })
      toast.success(t('product.edit.saved', lang))
    })
  }

  const section = `rounded-2xl bg-white p-6 sm:p-8 ${CARD_SHADOW}`
  const heading = 'mb-5 text-base font-semibold text-text-primary'
  const label = 'mb-1.5 block text-sm font-medium text-text-secondary'
  const selectField = `w-full rounded-lg border border-border-strong bg-surface-base px-4 h-11 text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`
  const suffix = (
    <span aria-hidden="true" className="shrink-0 text-sm text-text-muted">
      {t('product.form.currency_suffix', lang)}
    </span>
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="max-w-[760px] space-y-5"
    >
      {/* ─── 1. Informations ─── */}
      <section className={section}>
        <h2 className={heading}>{t('product.form.section_basics', lang)}</h2>
        <div className="space-y-5">
          <Input
            id="product-title"
            label={t('product.form.title_label', lang)}
            helper={t('product.form.title_helper', lang)}
            placeholder={t('product.form.title_ph', lang)}
            error={errors.title}
            required
            counter
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="product-category" className={label}>
                {t('product.form.category_label', lang)}
                <span aria-hidden="true" className="text-danger-500"> *</span>
              </label>
              <select
                id="product-category"
                aria-required="true"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={selectField}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'ar' ? (c.name_ar ?? c.name_fr) : c.name_fr}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-sm text-text-muted">{t('product.form.category_helper', lang)}</p>
            </div>
          </div>

          <div>
            <label htmlFor="product-description" className={label}>
              {t('product.form.description_label', lang)}
              <span aria-hidden="true" className="text-danger-500"> *</span>
            </label>
            <textarea
              id="product-description"
              aria-required="true"
              rows={5}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('product.form.description_ph', lang)}
              className={`w-full resize-y rounded-lg border border-border-strong bg-surface-base px-4 py-3 text-base text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand-blue-600 ${FOCUS_RING}`}
            />
            <div className="mt-1.5 flex items-start justify-between gap-2">
              <p className="text-sm text-text-muted">{t('product.form.description_helper', lang)}</p>
              <span className="shrink-0 text-sm text-text-muted tabular-nums">{description.length}/2000</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. Prix & livraison ─── */}
      <section className={section}>
        <h2 className={heading}>{t('product.form.section_pricing', lang)}</h2>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              id="product-price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              label={t('product.form.price_label', lang)}
              helper={t('product.form.price_helper', lang)}
              error={errors.price}
              required
              iconEnd={suffix}
              placeholder="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Input
              id="product-delivery"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              label={t('product.form.delivery_label', lang)}
              helper={t('product.form.delivery_hint', lang)}
              error={errors.deliveryFee}
              required
              iconEnd={suffix}
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
            />
          </div>

          {/* dir="ltr" — three numeric runs in one RTL paragraph reverse under bidi rule N1
              otherwise (reference_rtl_numeric_run_reversal: same class as the "1 / 5" case).
              ProductForm's identical line (product.form.buyer_total, ProductForm.tsx:254-263)
              doesn't have this either — logged, not fixed here (one-PR-one-focus). */}
          <p
            dir="ltr"
            aria-live="polite"
            className="rounded-xl border border-border-subtle bg-surface-pill px-4 py-3 text-sm text-text-primary"
          >
            {t('product.form.buyer_total', lang, {
              price: fmt(safePrice),
              fee: fmt(safeFee),
              total: fmt(safePrice + safeFee),
            })}
          </p>
        </div>
      </section>

      {/* ─── 3. Stock ─── */}
      <section className={section}>
        <h2 className={heading}>{t('product.form.section_stock', lang)}</h2>

        <Toggle
          checked={tracksStock}
          onCheckedChange={setTracksStock}
          label={t('product.form.stock_label', lang)}
          helper={tracksStock ? undefined : t('product.form.stock_hint_off', lang)}
        />

        {tracksStock && (
          <div className="mt-5 sm:max-w-xs">
            <Input
              id="product-stock"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              label={t('product.field_stock_count', lang)}
              helper={t('product.form.stock_count_helper', lang)}
              error={errors.stockCount}
              required
              placeholder="0"
              value={stockCount}
              onChange={(e) => setStockCount(e.target.value)}
            />
          </div>
        )}
      </section>

      {/* ─── 4. Images — add/remove only, committed immediately (see EditImageGallery). ─── */}
      <section className={section}>
        <h2 className={heading}>{t('product.form.section_images', lang)}</h2>
        <EditImageGallery productId={product.id} initialImages={product.images.map((i) => ({ id: i.id, url: i.url }))} />
      </section>

      {/* ─── 5. Statut & suppression (G7-only) ─── */}
      <section className={section}>
        <h2 className={heading}>{t('product.edit.section_status', lang)}</h2>

        <div className="flex flex-col gap-3 border-b border-border-subtle pb-6">
          <div>
            <p className="text-sm font-medium text-text-primary">{t('product.edit.status_label', lang)}</p>
            <p className="mt-1 text-sm text-text-muted">{t('product.edit.status_desc', lang)}</p>
          </div>
          <SegmentedControl
            ariaLabel={t('product.edit.status_label', lang)}
            value={status}
            onChange={runStatusChange}
            className="w-fit"
            options={[
              {
                value: 'active',
                label: t('common.status_active', lang),
                // admin_hidden_at only ever coexists with status='hidden' in practice (same
                // observation ProductRow.tsx makes) — moving TO active is what the trigger blocks,
                // never staying hidden or moving to hidden, so this is the one option it can gate.
                disabled: isModerated,
                disabledTitle: isModerated ? t('owner.moderation_banner.product', lang) : undefined,
              },
              { value: 'hidden', label: t('common.status_hidden', lang) },
            ]}
          />
          {statusPending && <p className="text-xs text-text-muted">{t('product.form.submitting', lang)}</p>}
        </div>

        {/* DangerZone — the frame's own body copy ("commandes non affectées") assumes deletion
            always succeeds; §7's spike proved it's blocked outright for any product with order
            history. That's a real divergence from 536:32818, not an oversight: for a product WITH
            orders this renders the disabled-with-reason state ProductRow already ships (same
            string, product.error_delete_has_orders), not a modal that promises a delete it cannot
            perform. */}
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-danger-100 bg-danger-50 p-4">
          <div>
            <p className="text-sm font-semibold text-danger-700">{t('product.edit.danger_title', lang)}</p>
            {/* danger-600 is not a real token — only 50/100/500/700 exist in @theme
                (src/styles/tokens.css:41-104). Confirmed live: text-danger-600 rendered as
                rgb(237,237,237), unreadable against bg-danger-50. danger-700 is the only defined
                dark shade. */}
            <p className="mt-1 text-sm text-danger-700">
              {product.hasOrders ? t('product.error_delete_has_orders', lang) : t('product.edit.danger_body', lang)}
            </p>
          </div>
          <Button
            variant="danger"
            size="md"
            className="self-start"
            disabled={product.hasOrders}
            onClick={() => setConfirmingDelete(true)}
          >
            {t('product.edit.danger_cta', lang)}
          </Button>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* ─── Footer: dirty-state indicator + Voir le produit + Enregistrer les modifications.
          No publish gate — the product already exists with a status, managed above in §5. ─── */}
      <div className={`sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 ${CARD_SHADOW}`}>
        <p className="text-sm text-text-muted">{isDirty ? t('product.edit.dirty', lang) : null}</p>
        {/* Stacked below sm, not wrapped — flex-wrap on two whitespace-nowrap children of
            unrelated width (a text link vs. a submit button) wraps wherever the words happen to
            run out of room, so FR and AR (different label lengths) would each ragged-break at a
            different point. flex-col forces one deliberate break — link above button, both
            full-width — instead of leaving it to content length. */}
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          {/* Only when the live local status is 'active' — D1 (getProductDetail) filters
              status='active', so a link on a Masqué product would be a 404 offer. Matches the
              cached G7 memory's own specimen C, which hides this exact link on a non-public
              product. Tracks the LIVE `status` state, not product.status, so it reacts to the §5
              toggle in real time rather than only to the page's initial load. */}
          {status === 'active' ? (
            <Link
              href={`/produits/${product.id}`}
              className={`relative inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-5 text-base font-semibold whitespace-nowrap text-brand-blue-600 transition-colors hover:bg-brand-blue-50 active:bg-brand-blue-100 motion-reduce:transition-none sm:w-auto ${FOCUS_RING}`}
            >
              {t('product.edit.view_product', lang)}
            </Link>
          ) : null}
          <Button type="submit" variant="primary" loading={pending} className="w-full sm:w-auto">
            {pending ? t('product.form.submitting', lang) : t('product.edit.save', lang)}
          </Button>
        </div>
      </div>

      {confirmingDelete ? (
        <DeleteProductModal
          productId={product.id}
          productTitle={product.title}
          lang={lang}
          onCancel={() => setConfirmingDelete(false)}
          onDeleted={() => router.push('/mes-produits')}
        />
      ) : null}
    </form>
  )
}
