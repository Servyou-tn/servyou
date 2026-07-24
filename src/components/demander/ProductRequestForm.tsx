'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Minus, Plus, Wallet, Shield, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { isValidPhone } from '@/lib/phone'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { PackageIcon } from '@/components/dashboard/consumer/icons'
import { submitProductRequest } from '@/app/demander/[id]/actions'
import type { ProductRequestTarget } from '@/lib/marche/demander'

const MAX_QTY = 99

function formatPrice(n: number): string {
  return `${new Intl.NumberFormat('fr-TN').format(n)} TND`
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1 flex items-center gap-1 text-sm text-red-600">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}

type Field = 'deliveryName' | 'deliveryAddress' | 'governorate' | 'deliveryPhone'

export function ProductRequestForm({
  product,
  defaultName,
}: {
  product: ProductRequestTarget
  defaultName: string
}) {
  const lang = useLang()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [deliveryName, setDeliveryName] = useState(defaultName)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [governorate, setGovernorate] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [note, setNote] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})

  const maxQty = product.tracksStock && product.stockCount != null ? product.stockCount : MAX_QTY
  const total = product.price * quantity

  function validateField(field: Field): string | undefined {
    if (field === 'deliveryName' && !deliveryName.trim()) return t('demander.error.required', lang)
    if (field === 'deliveryAddress' && !deliveryAddress.trim()) return t('demander.error.required', lang)
    if (field === 'governorate' && !governorate) return t('demander.error.required', lang)
    if (field === 'deliveryPhone') {
      if (!deliveryPhone.trim()) return t('demander.error.required', lang)
      if (!isValidPhone(deliveryPhone)) return t('demander.error.phoneFormat', lang)
    }
    return undefined
  }

  function onBlur(field: Field) {
    setErrors((e) => ({ ...e, [field]: validateField(field) }))
  }

  function validateAll(): Partial<Record<Field, string>> {
    const next: Partial<Record<Field, string>> = {}
    for (const f of ['deliveryName', 'deliveryAddress', 'governorate', 'deliveryPhone'] as Field[]) {
      const msg = validateField(f)
      if (msg) next[f] = msg
    }
    return next
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next = validateAll()
    setErrors(next)
    const firstError = Object.keys(next)[0]
    if (firstError) {
      document.getElementById(`pr-${firstError}`)?.focus()
      toast.error(t('demander.toast.error', lang))
      return
    }
    startTransition(async () => {
      const res = await submitProductRequest({
        productId: product.id,
        deliveryName,
        deliveryAddress,
        governorate,
        deliveryPhone,
        quantity,
        note,
      })
      if (res.ok) {
        toast.success(t('demander.toast.success', lang), {
          action: {
            label: t('demander.toast.viewOrder', lang),
            onClick: () => router.push(`/mes-commandes/${res.orderId}`),
          },
        })
        router.push('/mes-commandes')
      } else {
        toast.error(res.error)
      }
    })
  }

  const labelCls = 'mb-1.5 block text-sm font-medium text-text-primary'
  const fieldBase = `w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted ${FOCUS_RING}`
  const fieldCls = (hasError: boolean) =>
    cn(fieldBase, hasError ? 'border-red-500 ring-2 ring-red-500/30' : 'border-border-subtle focus:border-brand-accent')

  return (
    <div className="lg:grid lg:grid-cols-5 lg:gap-8">
      {/* Summary (DOM-first → mobile shows it first; desktop right column, sticky) */}
      <div className="lg:col-span-2 lg:col-start-4 lg:row-start-1">
        <div className="card-premium outline-brand rounded-2xl bg-white p-6 lg:sticky lg:top-24">
          <p className="text-xs uppercase tracking-wide text-text-muted">{t('demander.section.summary', lang)}</p>
          <div className="mt-4 flex gap-3">
            {product.imageUrl ? (
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <Image src={product.imageUrl} alt="" fill sizes="64px" className="object-cover" />
              </span>
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-slate-100 text-icon-muted">
                <PackageIcon className="h-7 w-7" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold text-text-primary">{product.title}</p>
              {product.shop.name && <p className="mt-0.5 truncate text-sm text-text-muted">{product.shop.name}</p>}
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-border-subtle pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">{t('demander.unitPrice', lang)}</span>
              <span className="text-text-primary">{formatPrice(product.price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">{t('demander.field.quantity', lang)}</span>
              <span className="text-text-primary">× {quantity}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
            <span className="font-semibold text-text-primary">{t('demander.total', lang)}</span>
            <span className="text-xl font-bold text-brand-primary">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Form (desktop left column) */}
      <div className="mt-6 lg:col-span-3 lg:col-start-1 lg:row-start-1 lg:mt-0">
        <form onSubmit={onSubmit} noValidate className="card-premium outline-brand rounded-2xl bg-white p-6">
          <h1 className="text-xl font-semibold text-text-primary">{t('demander.title.product', lang)}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
            <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('demander.subtitle.product', lang)}
          </p>

          <div className="mt-6 space-y-6">
            {/* Quantité */}
            <div>
              <span className={labelCls}>{t('demander.field.quantity', lang)}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="-"
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-text-primary transition-colors hover:bg-slate-50 disabled:opacity-40',
                    FOCUS_RING,
                  )}
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="mx-4 min-w-[2ch] text-center text-lg font-semibold tabular-nums text-text-primary">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                  aria-label="+"
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-text-primary transition-colors hover:bg-slate-50 disabled:opacity-40',
                    FOCUS_RING,
                  )}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {product.tracksStock && product.stockCount != null && product.stockCount < 10 && (
                <p className="mt-2 text-xs text-amber-600">
                  {t('product.detail.stock_low', lang, { n: product.stockCount })}
                </p>
              )}
            </div>

            {/* Détails de livraison */}
            <div className="space-y-4 border-t border-border-subtle pt-6">
              <h2 className="text-base font-semibold text-text-primary">{t('demander.section.delivery', lang)}</h2>

              <div>
                <label htmlFor="pr-deliveryName" className={labelCls}>
                  {t('demander.field.fullName', lang)} <span className="text-red-500">*</span>
                </label>
                <input
                  id="pr-deliveryName"
                  type="text"
                  autoComplete="name"
                  value={deliveryName}
                  onChange={(e) => setDeliveryName(e.target.value)}
                  onBlur={() => onBlur('deliveryName')}
                  placeholder={t('demander.field.fullName_ph', lang)}
                  className={fieldCls(Boolean(errors.deliveryName))}
                />
                <FieldError message={errors.deliveryName} />
              </div>

              <div>
                <label htmlFor="pr-deliveryAddress" className={labelCls}>
                  {t('demander.field.address', lang)} <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="pr-deliveryAddress"
                  rows={2}
                  autoComplete="street-address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  onBlur={() => onBlur('deliveryAddress')}
                  placeholder={t('demander.field.address_ph', lang)}
                  className={cn(fieldCls(Boolean(errors.deliveryAddress)), 'resize-y')}
                />
                <FieldError message={errors.deliveryAddress} />
              </div>

              <div>
                <label htmlFor="pr-governorate" className={labelCls}>
                  {t('demander.field.governorate', lang)} <span className="text-red-500">*</span>
                </label>
                <select
                  id="pr-governorate"
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  onBlur={() => onBlur('governorate')}
                  className={fieldCls(Boolean(errors.governorate))}
                >
                  <option value="">{t('demander.field.governorate_ph', lang)}</option>
                  {GOVERNORATES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {lang === 'ar' ? g.ar : g.fr}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.governorate} />
              </div>

              <div>
                <label htmlFor="pr-deliveryPhone" className={labelCls}>
                  {t('demander.field.phone', lang)} <span className="text-red-500">*</span>
                </label>
                <input
                  id="pr-deliveryPhone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  onBlur={() => onBlur('deliveryPhone')}
                  placeholder={t('demander.field.phone_ph', lang)}
                  className={fieldCls(Boolean(errors.deliveryPhone))}
                />
                <FieldError message={errors.deliveryPhone} />
              </div>

              <div>
                <label htmlFor="pr-note" className={labelCls}>
                  {t('demander.field.note', lang)}
                </label>
                <textarea
                  id="pr-note"
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('demander.field.note_ph', lang)}
                  className={cn(fieldBase, 'resize-y border-border-subtle focus:border-brand-accent')}
                />
                <p className="mt-1 text-end text-xs text-text-muted">{note.length}/500</p>
              </div>
            </div>

            {/* Submit */}
            <div>
              <button
                type="submit"
                disabled={pending}
                className={cn(
                  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-accent text-base font-semibold text-white shadow-md transition-all duration-200 ease-out hover:bg-brand-accent-light hover:shadow-lg disabled:opacity-60 sm:w-auto sm:px-8',
                  FOCUS_RING,
                )}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    {t('demander.submit.loading', lang)}
                  </>
                ) : (
                  <>
                    {t('demander.submit.product', lang)}
                    <ArrowRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
                  </>
                )}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-muted">
                <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t('demander.trust', lang)}
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
