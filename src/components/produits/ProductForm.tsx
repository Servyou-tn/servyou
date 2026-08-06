'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW } from '@/components/layout/styles'
import { createProductAction } from '@/app/actions/products'
import type { ProductCategory } from '@/lib/marche/product-categories'
import { ImageUploadGrid, type UploadedImage } from './ImageUploadGrid'

// G6 « Ajouter un produit » — Figma 530:31784. Four sections plus a two-CTA footer.
//
// ⚑ `productId` IS GENERATED SERVER-SIDE AND ARRIVES AS A PROP. It is not created here and not
// re-generated on re-render: images upload to `{shop}/{productId}/…` BEFORE the product row exists,
// so the id has to be stable for the whole life of the form. See docs/design/g6-write-path.md §4a.
//
// The category picker is ONE LEVEL. The live `categories` table is flat (parent_id NULL on all 14
// rows); there is no subcategory to cascade to.

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

  const field = `w-full rounded-xl border border-border-subtle bg-white px-4 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand-blue-600 ${FOCUS_RING}`
  const label = 'mb-1.5 block text-sm font-medium text-text-primary'
  const section = `rounded-2xl bg-white p-6 sm:p-8 ${CARD_SHADOW}`
  const heading = 'mb-5 text-base font-semibold text-text-primary'

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canPublish) submit(true)
      }}
      className="max-w-[760px] space-y-5"
    >
      {/* ─── 1. Informations de base ─── */}
      <section className={section}>
        <h2 className={heading}>{t('product.form.section_basics', lang)}</h2>
        <div className="space-y-5">
          <div>
            <label htmlFor="product-title" className={label}>
              {t('product.form.title_label', lang)}
            </label>
            <input
              id="product-title"
              type="text"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('product.form.title_ph', lang)}
              className={field}
            />
            <p className="mt-1 text-end text-xs text-text-muted">{title.length}/100</p>
          </div>

          <div>
            <label htmlFor="product-category" className={label}>
              {t('product.form.category_label', lang)}
            </label>
            <select
              id="product-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={field}
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
          </div>

          <div>
            <label htmlFor="product-description" className={label}>
              {t('product.form.description_label', lang)}
            </label>
            <textarea
              id="product-description"
              rows={5}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('product.form.description_ph', lang)}
              className={`${field} resize-y`}
            />
            <p className="mt-1 text-end text-xs text-text-muted">{description.length}/2000</p>
          </div>
        </div>
      </section>

      {/* ─── 2. Prix et livraison ─── */}
      <section className={section}>
        <h2 className={heading}>{t('product.form.section_pricing', lang)}</h2>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="product-price" className={label}>
                {t('product.field_price', lang)}
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className={field}
              />
            </div>
            <div>
              <label htmlFor="product-delivery" className={label}>
                {t('product.form.delivery_label', lang)}
              </label>
              <input
                id="product-delivery"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className={field}
              />
              <p className="mt-1.5 text-xs text-text-muted">{t('product.form.delivery_hint', lang)}</p>
            </div>
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
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={tracksStock}
            onChange={(e) => setTracksStock(e.target.checked)}
            className={`h-4 w-4 rounded border-border-subtle text-brand-blue-600 ${FOCUS_RING}`}
          />
          {t('product.field_stock_manage', lang)}
        </label>

        {tracksStock ? (
          <div className="mt-5">
            <label htmlFor="product-stock" className={label}>
              {t('product.field_stock_count', lang)}
            </label>
            <input
              id="product-stock"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={stockCount}
              onChange={(e) => setStockCount(e.target.value)}
              placeholder="0"
              className={`${field} sm:max-w-xs`}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-muted">{t('product.form.stock_hint_off', lang)}</p>
        )}
      </section>

      {/* ─── 4. Photos ─── */}
      <section className={section}>
        <h2 className={heading}>{t('product.form.section_images', lang)}</h2>
        <ImageUploadGrid productId={productId} onChange={setImages} />
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* ─── Footer: two CTAs. Brouillon is deliberately UNGATED. ─── */}
      <div className={`sticky bottom-0 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-5 ${CARD_SHADOW}`}>
        <button
          type="submit"
          disabled={pending || !canPublish}
          className={`inline-flex items-center rounded-full bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-500 disabled:opacity-60 ${FOCUS_RING}`}
        >
          {pending ? t('product.form.submitting', lang) : t('product.form.publish', lang)}
        </button>
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={pending}
          className={`inline-flex items-center rounded-full border border-border-subtle px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-pill disabled:opacity-60 ${FOCUS_RING}`}
        >
          {t('product.form.save_draft', lang)}
        </button>
        <Link
          href="/tableau-de-bord-vendeur"
          className={`inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-pill ${FOCUS_RING}`}
        >
          {t('product.form.cancel', lang)}
        </Link>
        {!canPublish && (
          <p className="w-full text-xs text-text-muted">{t('product.form.publish_gate', lang)}</p>
        )}
      </div>
    </form>
  )
}
