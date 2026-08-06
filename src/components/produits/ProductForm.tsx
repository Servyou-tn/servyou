'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW } from '@/components/layout/styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { createProductAction } from '@/app/actions/products'
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
// ⚑ `productId` IS GENERATED SERVER-SIDE AND ARRIVES AS A PROP. It is not created here and not
// re-generated on re-render: images upload to `{shop}/{productId}/…` BEFORE the product row exists,
// so the id has to be stable for the whole life of the form. See docs/design/g6-write-path.md §4a.

export function ProductForm({
  productId,
  categories,
}: {
  productId: string
  categories: ProductCategory[]
}) {
  const lang = useLang()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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
  const safePrice = Number.isFinite(priceNum) ? priceNum : 0
  const safeFee = Number.isFinite(feeNum) ? feeNum : 0
  const fmt = (n: number) => n.toFixed(2).replace(/\.00$/, '')

  // The publish gate, mirrored client-side for the disabled state. The SERVER enforces it too
  // (createProductAction's superRefine) — this is affordance, not security.
  const canPublish =
    title.trim().length > 0 &&
    categoryId !== '' &&
    price.trim() !== '' &&
    Number.isFinite(priceNum) &&
    priceNum >= 0 &&
    Number.isFinite(feeNum) &&
    feeNum >= 0 &&
    (!tracksStock || stockCount.trim() !== '') &&
    images.length > 0

  function submit(publish: boolean) {
    setError(null)
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
        setError(res.error)
        return
      }
      // G5 /mes-produits is unbuilt, so the dashboard is where a new product is visible.
      router.push('/tableau-de-bord-vendeur')
    })
  }

  const section = `rounded-2xl bg-white p-6 sm:p-8 ${CARD_SHADOW}`
  const heading = 'mb-5 text-base font-semibold text-text-primary'
  const label = 'mb-1.5 block text-sm font-medium text-text-secondary'
  const selectField = `w-full rounded-lg border border-border-strong bg-surface-base px-4 h-11 text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`
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
            required
            counter
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
              required
              iconEnd={suffix}
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
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
              onChange={(e) => setStockCount(e.target.value)}
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
      <div className={`sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 ${CARD_SHADOW}`}>
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
