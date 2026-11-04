'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW, SELECT_FIELD_BASE } from '@/components/layout/styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { createProductAction } from '@/app/actions/products'
import type { ProductFormField } from '@/lib/products/constants'
import { hasAtMostTwoDecimals } from '@/lib/products/price'
import type { ProductCategory } from '@/lib/marche/product-categories'
import { ImageUploadGrid, type UploadedImage } from './ImageUploadGrid'

// G6 « Ajouter un produit » — Figma 530:31784. Four sections plus a two-CTA footer.
//
// Built on the F3 primitives rather than hand-rolled markup (g6-deltas.md D10). That is not a
// tidiness preference: `Input` already carries `required` (asterisk + aria-required), `helper`,
// `counter` and `iconEnd` — which is to say it closes D4, D8 and D9 by being used at all, and
// hand-rolling them a second time would have re-implemented four contracts that already exist.
// `ServiceRequestForm` is the precedent followed here, not `MissionForm`.
//
// ⚑ `productId` IS GENERATED SERVER-SIDE AND ARRIVES AS A SEED. Images upload to
// `{shop}/{productId}/…` BEFORE the product row exists, so the id has to be stable for the whole
// life of the form — and the SEED is not, which is why it is pinned below.
// See docs/design/g6-write-path.md §4a.

export function ProductForm({
  initialProductId,
  categories,
}: {
  initialProductId: string
  categories: ProductCategory[]
}) {
  // ⚑ PINNED ON MOUNT — DO NOT READ `initialProductId` BELOW THIS LINE.
  //
  // `page.tsx` mints the seed with `randomUUID()` inside a Server Component's render, and a Server
  // Action response re-renders that tree. So the PROP CHANGES MID-SESSION while the images already
  // uploaded under the previous id sit in `ImageUploadGrid`'s state. Submitting then sent paths
  // under one id and a `productId` under another, and `createProductAction`'s prefix check
  // (products.ts:213) rejected every publish as "possible tampering" — our own bug wearing a
  // security label.
  //
  // Pinning ties the id to this component's MOUNT, which is the SAME lifetime as the uploaded paths
  // held in `ImageUploadGrid` — a remount clears both together, so the two can never disagree. That
  // is the property that makes this structural rather than "does not happen today": there is no
  // render path that can move the id while leaving the paths behind.
  const [productId] = useState(initialProductId)
  const lang = useLang()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Per-field errors (walk #31) — from the submit check below or from the server's `field`, shown under the field.
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ProductFormField, string>>>({})

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  // Pre-filled with the column default. ~90% of Tunisian deliveries are 7 TND, but it is a
  // SUGGESTION and the seller's input is the source of truth — a NOT NULL DEFAULT 7 column that no
  // UI exposed would silently lock every seller to 7.
  const [deliveryFee, setDeliveryFee] = useState('7')
  const [tracksStock, setTracksStock] = useState(true)
  const [stockCount, setStockCount] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])

  // Live arithmetic, computed and never stored. Invalid input reads as 0 rather than NaN so the
  // preview degrades to "0 + 7 = 7" instead of "NaN".
  const priceNum = Number.parseFloat(price)
  const feeNum = Number.parseFloat(deliveryFee)
  // A price <= 0 is refused (walk #31), so the preview never adds it: « -3 + 7 = 4 » read as a valid total.
  const safePrice = Number.isFinite(priceNum) && priceNum > 0 ? priceNum : 0
  const priceInvalid = price.trim() !== '' && !(Number.isFinite(priceNum) && priceNum > 0)
  // Typing into a field clears the error shown under it (a server-attributed one included).
  const clearFieldError = (field: ProductFormField) =>
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  const safeFee = Number.isFinite(feeNum) ? feeNum : 0
  const fmt = (n: number) => n.toFixed(2).replace(/\.00$/, '')

  // The publish gate, mirrored client-side for the disabled state. The SERVER enforces it too
  // (createProductAction's superRefine) — this is affordance, not security.
  const canPublish =
    title.trim().length > 0 &&
    categoryId !== '' &&
    price.trim() !== '' &&
    Number.isFinite(priceNum) &&
    priceNum > 0 &&
    Number.isFinite(feeNum) &&
    feeNum >= 0 &&
    (!tracksStock || stockCount.trim() !== '') &&
    images.length > 0

  // Both CTAs: no product row — draft or not — may be saved without a title or with a price <= 0 (the server and the
  // products_title_not_blank / products_price_positive CHECKs refuse it too); the photo gate stays publish-only.
  function validateFields(): Partial<Record<ProductFormField, string>> {
    const next: Partial<Record<ProductFormField, string>> = {}
    if (!title.trim()) next.title = t('product.error_title', lang)
    if (!(Number.isFinite(priceNum) && priceNum > 0)) next.price = t('product.error_price_positive', lang)
    else if (!hasAtMostTwoDecimals(price)) next.price = t('product.error_price_decimals', lang)
    if (!(Number.isFinite(feeNum) && feeNum >= 0)) next.deliveryFee = t('product.error_price', lang)
    if (tracksStock && stockCount.trim() === '') next.stockCount = t('product.error_stock_required', lang)
    return next
  }

  function submit(publish: boolean) {
    setError(null)
    const found = validateFields()
    setFieldErrors(found)
    if (Object.keys(found).length > 0) return
    startTransition(async () => {
      const res = await createProductAction({
        productId,
        title: title.trim(),
        categoryId,
        description: description.trim() || undefined,
        priceTnd: Number.isFinite(priceNum) ? priceNum : 0,
        deliveryFeeTnd: Number.isFinite(feeNum) ? feeNum : 0,
        tracksStock,
        stockCount: tracksStock ? Number.parseInt(stockCount || '0', 10) : undefined,
        imagePaths: images.map((i) => i.path),
        publish,
      })
      if (!res.ok) {
        // A field error shows under its field only; the banner is for errors that belong to no field.
        if (res.field) setFieldErrors((prev) => ({ ...prev, [res.field as ProductFormField]: res.error }))
        else setError(res.error)
        return
      }
      // ⚑ TWO MESSAGES, BECAUSE THERE ARE TWO CTAs. `publish` maps to status active|hidden
      // (products.ts:284 — Brouillon is 'hidden'), so a single "Produit publié" would fire on a
      // draft save and tell the seller their product is live when it is not.
      //
      // Fired BEFORE the push, not after: <Toaster> lives in the root layout (layout.tsx:65),
      // which does not remount on a client-side navigation, so the toast outlives the transition
      // and is read on the destination. Sonner's 4s default covers the dashboard render.
      toast.success(t(publish ? 'product.created.published' : 'product.created.draft', lang))
      // G5 /mes-produits is unbuilt, so the dashboard is where a new product is visible.
      //
      // 🟡 THE TOAST CONFIRMS CREATION; IT DOES NOT MAKE THE PRODUCT VISIBLE. The dashboard shows
      // `activeProducts` as a COUNT tile and a low-stock rail that only lists stock <= 5, so a
      // healthy new product appears nowhere by name. Rebuilding /marche/produits (C1) is what
      // actually closes that, and it owns the landing-target change — do not repoint this push at
      // /marche/produits while that route is still a ComingSoon stub.
      router.push('/tableau-de-bord-vendeur')
    })
  }

  // 375 (m375-g6-ajouter / m375-g7-modifier, docs/design/m375-g6-g7-deltas.md): no cards — the sections sit on the page, 32 apart,
  // each titled 20 Semi Bold / 26, 16 above its fields. Below lg only (plain strings: no cn(), nothing to evict).
  const section = `rounded-2xl bg-white p-6 sm:p-8 ${CARD_SHADOW} max-lg:rounded-none max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none`
  const heading = 'mb-5 text-base font-semibold text-text-primary max-lg:mb-4 max-lg:text-h3 max-lg:leading-[26px]'
  const label = 'mb-1.5 block text-sm font-medium text-text-secondary'
  // No error state on this select today, so the default border is appended unconditionally —
  // token-for-token the same rendered class list this local constant produced before promotion.
  const selectField = `${SELECT_FIELD_BASE} border-border-strong`
  // The in-field currency adornment — the `TND` text node the Price Input composite carries.
  const suffix = (
    <span aria-hidden="true" className="shrink-0 text-sm text-text-muted">
      {t('product.form.currency_suffix', lang)}
    </span>
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canPublish) submit(true)
      }}
      className="max-w-[760px] space-y-5 max-lg:space-y-8"
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
            required
            counter
            maxLength={100}
            value={title}
            error={fieldErrors.title}
            onChange={(e) => {
              setTitle(e.target.value)
              clearFieldError('title')
            }}
          />

          {/* ⚑ HALF-WIDTH, deliberately. Sous-catégorie is the one approved divergence (no second
              taxonomy level exists in the database), so this row has a single occupant. A
              full-width select next to nothing reads as a missing field — which is exactly what it
              is until the taxonomy lands. Holding the slot also means no relayout when it arrives. */}
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
                <option value="">{t('product.form.category_ph', lang)}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {/* Falls back to name_fr so a category added without a translation degrades
                        to French rather than rendering an empty option. */}
                    {lang === 'ar' ? (c.name_ar ?? c.name_fr) : c.name_fr}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-sm text-text-muted">
                {t('product.form.category_helper', lang)}
              </p>
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
              <span className="shrink-0 text-sm text-text-muted tabular-nums">
                {description.length}/2000
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. Prix & livraison ─── */}
      <section className={section}>
        <h2 className={heading}>{t('product.form.section_pricing', lang)}</h2>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* TND rides INSIDE the field via iconEnd — Input's trailing slot sits within the
                field border, which is where the Price Input composite puts its TND text node. */}
            <Input
              id="product-price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              label={t('product.form.price_label', lang)}
              helper={t('product.form.price_helper', lang)}
              required
              iconEnd={suffix}
              placeholder="0"
              value={price}
              error={fieldErrors.price ?? (priceInvalid ? t('product.error_price_positive', lang) : undefined)}
              onChange={(e) => {
                setPrice(e.target.value)
                clearFieldError('price')
              }}
            />
            <Input
              id="product-delivery"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              label={t('product.form.delivery_label', lang)}
              helper={t('product.form.delivery_hint', lang)}
              required
              iconEnd={suffix}
              value={deliveryFee}
              error={fieldErrors.deliveryFee}
              onChange={(e) => {
                setDeliveryFee(e.target.value)
                clearFieldError('deliveryFee')
              }}
            />
          </div>

          <p
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

        {/* role="switch" + aria-checked, Space-activated, knob translates as well as recolouring —
            a checkbox announced "in a set" where this is an on/off. See ui/toggle.tsx. */}
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
              required
              placeholder="0"
              value={stockCount}
              error={fieldErrors.stockCount}
              onChange={(e) => {
                setStockCount(e.target.value)
                clearFieldError('stockCount')
              }}
            />
          </div>
        )}
      </section>

      {/* ─── 4. Images ─── */}
      <section className={section}>
        <h2 className={heading}>{t('product.form.section_images', lang)}</h2>
        <ImageUploadGrid productId={productId} onChange={setImages} />
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* ─── Footer: brouillon LEFT, publier RIGHT, and no third control. ───
          Brouillon is deliberately ungated — an ungated save is the whole reason the two-CTA
          footer exists. `Annuler` is gone: the sidebar and the breadcrumb both already lead out,
          and Figma has no third control here.
          ⚑ Publish ships DISABLED (gated on ≥1 image) and Button's Figma matrix is sparse —
          `primary/lg/disabled` does not exist — so it stays at the default size `md`. */}
      <div className={`sticky bottom-[var(--cookie-banner-h,0px)] flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 ${CARD_SHADOW} max-lg:rounded-xl max-lg:border max-lg:border-border-subtle max-lg:px-[15px] max-lg:py-[19px] max-lg:shadow-none`}>
        <Button type="button" variant="secondary" onClick={() => submit(false)} disabled={pending}>
          {t('product.form.save_draft', lang)}
        </Button>
        <div className="flex flex-col items-end gap-1.5">
          <Button type="submit" variant="primary" loading={pending} disabled={!canPublish}>
            {pending ? t('product.form.submitting', lang) : t('product.form.publish', lang)}
          </Button>
          {!canPublish && (
            <p className="text-xs text-text-muted">{t('product.form.publish_gate', lang)}</p>
          )}
        </div>
      </div>
    </form>
  )
}
