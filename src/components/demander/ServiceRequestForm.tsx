'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MessageCircle, Clock, AlertCircle, Loader2, ArrowRight, Shield } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { initials } from '@/components/listings/listing-utils'
import { submitServiceRequest } from '@/app/demander/[id]/actions'
import type { ServiceRequestTarget } from '@/lib/marche/demander'

const MIN_DESCRIPTION = 20

function formatPrice(n: number): string {
  return `${new Intl.NumberFormat('fr-TN').format(n)} TND`
}

export function ServiceRequestForm({ service }: { service: ServiceRequestTarget }) {
  const lang = useLang()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [description, setDescription] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [budget, setBudget] = useState('')
  const [descError, setDescError] = useState<string | undefined>(undefined)

  const freelancerName = service.freelancer.name.trim() || '—'

  function validateDesc(): string | undefined {
    const d = description.trim()
    if (!d) return t('demander.error.required', lang)
    if (d.length < MIN_DESCRIPTION) return t('demander.error.minLength', lang, { n: MIN_DESCRIPTION })
    return undefined
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validateDesc()
    setDescError(err)
    if (err) {
      document.getElementById('sr-description')?.focus()
      toast.error(t('demander.toast.error', lang))
      return
    }
    startTransition(async () => {
      const res = await submitServiceRequest({
        serviceId: service.id,
        description,
        timeframe,
        budget,
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

  return (
    <div className="lg:grid lg:grid-cols-5 lg:gap-8">
      {/* Summary (DOM-first → mobile first; desktop right column, sticky) */}
      <div className="lg:col-span-2 lg:col-start-4 lg:row-start-1">
        <div className="card-premium outline-brand rounded-2xl bg-white p-6 lg:sticky lg:top-24">
          <p className="text-xs uppercase tracking-wide text-text-muted">{t('demander.section.summary', lang)}</p>
          <div className="mt-4 flex gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-primary text-sm font-semibold text-white" aria-hidden="true">
              {initials(freelancerName)}
            </span>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold text-text-primary">{service.title}</p>
              <p className="mt-0.5 truncate text-sm text-text-muted">{freelancerName}</p>
              {service.freelancer.headline && (
                <p className="truncate text-xs text-text-muted">{service.freelancer.headline}</p>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-border-subtle pt-4">
            {service.startingPrice != null ? (
              <>
                <p className="text-xs uppercase tracking-wide text-text-muted">{t('service.from_price', lang)}</p>
                <p className="text-xl font-bold text-brand-primary">{formatPrice(service.startingPrice)}</p>
              </>
            ) : (
              <p className="text-lg font-bold text-brand-primary">{t('listing.service.priceOnRequest', lang)}</p>
            )}
            {service.deliveryTime && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-blue-50 px-3 py-1 text-xs font-medium text-brand-accent">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {t('service.detail.deliveryIn', lang, { time: service.deliveryTime })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form (desktop left column) */}
      <div className="mt-6 lg:col-span-3 lg:col-start-1 lg:row-start-1 lg:mt-0">
        <form onSubmit={onSubmit} noValidate className="card-premium outline-brand rounded-2xl bg-white p-6">
          <h1 className="text-xl font-semibold text-text-primary">{t('demander.title.service', lang)}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('demander.subtitle.service', lang)}
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <label htmlFor="sr-description" className={labelCls}>
                {t('demander.field.description', lang)} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="sr-description"
                rows={5}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setDescError(validateDesc())}
                placeholder={t('demander.field.description_ph', lang)}
                className={cn(
                  fieldBase,
                  'resize-y',
                  descError ? 'border-red-500 ring-2 ring-red-500/30' : 'border-border-subtle focus:border-brand-accent',
                )}
              />
              <div className="mt-1 flex items-center justify-between">
                {descError ? (
                  <p className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {descError}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-text-muted">{description.length}/1000</span>
              </div>
            </div>

            <div>
              <label htmlFor="sr-timeframe" className={labelCls}>
                {t('demander.field.timeframe', lang)}
              </label>
              <input
                id="sr-timeframe"
                type="text"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder={t('demander.field.timeframe_ph', lang)}
                className={cn(fieldBase, 'border-border-subtle focus:border-brand-accent')}
              />
            </div>

            <div>
              <label htmlFor="sr-budget" className={labelCls}>
                {t('demander.field.budget', lang)}
              </label>
              <div className="relative">
                <input
                  id="sr-budget"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className={cn(fieldBase, 'border-border-subtle pe-14 focus:border-brand-accent')}
                />
                <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-sm text-text-muted">
                  TND
                </span>
              </div>
              {service.startingPrice != null && (
                <p className="mt-1 text-xs text-text-muted">
                  {t('demander.field.budgetHint', lang, { price: service.startingPrice })}
                </p>
              )}
            </div>

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
                    {t('demander.submit.service', lang)}
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
