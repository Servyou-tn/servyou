'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Briefcase,
  CheckCircle,
  Inbox,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquare,
  RotateCcw,
  Trash2,
  Wifi,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import type { AnnonceDetailData, AnnonceResponse } from '@/lib/marche/annonce-detail'
import {
  closeMissionAction,
  reopenMissionAction,
  deleteMissionAction,
} from '@/app/mes-annonces/[id]/actions'

function formatPrice(n: number): string {
  return `${new Intl.NumberFormat('fr-TN').format(n)} TND`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Whole days between the response timestamp and now (never negative).
function daysAgo(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)))
}

function initials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

// The display status folds the stored status with computed expiry: a 'filled' post stays
// "Fermée" regardless of age (it was deliberately closed); an 'open' post past 30 days reads
// as "Expirée" since the DB will no longer accept responses to it.
type DisplayStatus = 'open' | 'filled' | 'expired'

export function AnnonceDetail({ annonce }: { annonce: AnnonceDetailData }) {
  const lang = useLang()
  const router = useRouter()
  const supabase = createClient()

  // Per-response phone reveal — keyed by freelancer id so each "Contacter" button reveals
  // independently (unlike the single-seller order page).
  const [phones, setPhones] = useState<Record<string, string>>({})
  const [revealingId, setRevealingId] = useState<string | null>(null)

  const [closeStep, setCloseStep] = useState(false)
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const keepBtnRef = useRef<HTMLButtonElement>(null)

  const display: DisplayStatus =
    annonce.status === 'filled' ? 'filled' : annonce.isExpired ? 'expired' : 'open'

  // Action gating: an expired-but-open post offers no Close (it would be a no-op); a filled
  // post can be reopened only while still inside the 30-day window. Modify returns in PR-D
  // with the edit route behind it — canManageOpen still gates Close below, unrelated to Modify.
  const canManageOpen = display === 'open'
  const canReopen = annonce.status === 'filled' && !annonce.isExpired

  // Delete modal a11y: lock scroll, move focus onto the non-destructive button, restore on close.
  useEffect(() => {
    if (!deleteOpen) return
    const opener = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    keepBtnRef.current?.focus()
    return () => {
      document.body.style.overflow = ''
      opener?.focus?.()
    }
  }, [deleteOpen])

  useEffect(() => {
    if (!deleteOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !deleting) setDeleteOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [deleteOpen, deleting])

  async function contactFreelancer(resp: AnnonceResponse) {
    let p = phones[resp.freelancerId]
    if (!p) {
      setRevealingId(resp.freelancerId)
      const { data, error } = await supabase.rpc('get_contact_phone', { target: resp.freelancerId })
      setRevealingId(null)
      if (error) {
        console.error('[AnnonceDetail] phone reveal error:', error)
        toast.error(t('annonces.detail.phone_reveal_error', lang))
        return
      }
      if (!data) {
        toast.error(t('annonces.detail.no_phone', lang))
        return
      }
      p = data as string
      setPhones((m) => ({ ...m, [resp.freelancerId]: p! }))
    }
    const waNumber = p.replace(/[^0-9]/g, '') // wa.me wants digits only, country code included
    const message = t('annonces.detail.whatsapp_consumer_to_responder', lang, { annonce: annonce.title })
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  async function doClose() {
    setClosing(true)
    const res = await closeMissionAction(annonce.id)
    if (!res.ok) {
      toast.error(t(res.errorKey ?? 'common.error_generic', lang))
      setClosing(false)
      return
    }
    toast.success(t('annonces.detail.close_success', lang))
    setCloseStep(false)
    setClosing(false)
    router.refresh()
  }

  async function doReopen() {
    setReopening(true)
    const res = await reopenMissionAction(annonce.id)
    if (!res.ok) {
      toast.error(t(res.errorKey ?? 'common.error_generic', lang))
      setReopening(false)
      return
    }
    toast.success(t('annonces.detail.reopen_success', lang))
    setReopening(false)
    router.refresh()
  }

  async function doDelete() {
    setDeleting(true)
    const res = await deleteMissionAction(annonce.id)
    if (!res.ok) {
      toast.error(t(res.errorKey ?? 'common.error_generic', lang))
      setDeleting(false)
      return
    }
    toast.success(t('annonces.detail.delete_success', lang))
    // Keep `deleting` true so the buttons stay disabled through the navigation; the Sonner
    // toaster lives in the root layout, so the toast survives the route change.
    router.push('/mes-annonces')
    router.refresh()
  }

  // Budget label: a single value when min === max, a range when both differ, a one-sided bound
  // when only one is set, "À discuter" when neither is.
  let budgetLabel: string
  if (annonce.budgetMin != null && annonce.budgetMax != null) {
    budgetLabel =
      annonce.budgetMin === annonce.budgetMax
        ? formatPrice(annonce.budgetMin)
        : `${formatPrice(annonce.budgetMin)} – ${formatPrice(annonce.budgetMax)}`
  } else if (annonce.budgetMin != null) {
    budgetLabel = `≥ ${formatPrice(annonce.budgetMin)}`
  } else if (annonce.budgetMax != null) {
    budgetLabel = `≤ ${formatPrice(annonce.budgetMax)}`
  } else {
    budgetLabel = t('annonces.detail.budget_tbd', lang)
  }

  const statusBadge = {
    open: { cls: 'bg-brand-blue-100 text-brand-blue-700', label: t('annonces.detail.status_open', lang) },
    filled: { cls: 'bg-green-100 text-green-700', label: t('annonces.detail.status_filled', lang) },
    expired: { cls: 'bg-slate-200 text-slate-700', label: t('annonces.detail.status_expired', lang) },
  }[display]

  const responseBadgeCls = annonce.isAtCap ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-text-muted'
  const responseBadgeLabel = t(
    annonce.isAtCap ? 'annonces.detail.responses_cap' : 'annonces.detail.responses',
    lang,
    { n: annonce.responseCount, max: MAX_RESPONSES_PER_POST },
  )

  return (
    <div className="lg:grid lg:grid-cols-5 lg:gap-8">
      {/* LEFT — annonce summary + responses */}
      <div className="lg:col-span-3">
        {/* Back */}
        <Link
          href="/mes-annonces"
          className={cn(
            'mb-6 inline-flex items-center gap-1.5 rounded text-sm text-text-muted transition-colors hover:text-text-primary',
            FOCUS_RING,
          )}
        >
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          {t('annonces.detail.back', lang)}
        </Link>

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-text-muted">{t('annonces.detail.label', lang)}</p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">{annonce.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
            <span className={cn('rounded-full px-3 py-1 text-xs font-medium', statusBadge.cls)}>
              {statusBadge.label}
            </span>
            <span aria-hidden="true">·</span>
            <span>{t('annonces.detail.posted_on', lang, { date: formatDate(annonce.createdAt) })}</span>
            <span aria-hidden="true">·</span>
            <span className={cn('rounded-full px-3 py-1 text-xs font-medium', responseBadgeCls)}>
              {responseBadgeLabel}
            </span>
          </div>
        </div>

        {/* Section A — annonce summary */}
        <div className="card-premium outline-brand mb-6 rounded-2xl bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-brand-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-text-primary">{t('annonces.detail.section_details', lang)}</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium text-text-muted">{t('annonces.detail.description_label', lang)}</p>
              <p className="mt-1 whitespace-pre-line text-base leading-relaxed text-text-primary">
                {annonce.description}
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-text-muted">{t('annonces.detail.budget_label', lang)}</dt>
                <dd className="mt-1 text-base font-semibold text-text-primary">{budgetLabel}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-muted">{t('annonces.detail.category_label', lang)}</dt>
                <dd className="mt-1">
                  {annonce.category ? (
                    <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-text-primary">
                      {annonce.category}
                    </span>
                  ) : (
                    <span className="text-base text-text-muted">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-muted">{t('annonces.detail.location_label', lang)}</dt>
                <dd className="mt-1 inline-flex items-center gap-1.5 text-base text-text-primary">
                  {annonce.isRemote ? (
                    <>
                      <Wifi className="h-4 w-4 text-text-muted" aria-hidden="true" />
                      {t('annonce.form.remote_label', lang)}
                    </>
                  ) : annonce.city ? (
                    <>
                      <MapPin className="h-4 w-4 text-text-muted" aria-hidden="true" />
                      {annonce.city}
                    </>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-muted">{t('annonces.detail.deadline_label', lang)}</dt>
                <dd className="mt-1 text-base text-text-primary">
                  {annonce.deadline ? formatDate(annonce.deadline) : t('annonces.detail.deadline_none', lang)}
                </dd>
              </div>
            </dl>

            {annonce.skills.length > 0 && (
              <div>
                <p className="text-sm font-medium text-text-muted">{t('annonces.detail.skills_label', lang)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {annonce.skills.map((s) => (
                    <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-text-primary">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section B — responses */}
        <div className="mb-4 flex items-center gap-2 lg:mb-0">
          <MessageSquare className="h-5 w-5 text-brand-blue-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-text-primary">{t('annonces.detail.responses_title', lang)}</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-text-muted">
            {annonce.responseCount}
          </span>
        </div>

        {annonce.responses.length === 0 ? (
          <div className="card-premium outline-brand mt-4 rounded-2xl bg-white p-12 text-center">
            <Inbox className="mx-auto mb-4 h-16 w-16 text-text-muted" aria-hidden="true" />
            <p className="text-base font-semibold text-text-primary">{t('annonces.detail.empty_title', lang)}</p>
            <p className="mt-2 text-sm text-text-muted">{t('annonces.detail.empty_desc', lang)}</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {annonce.responses.map((resp) => {
              const days = daysAgo(resp.createdAt)
              return (
                <div key={resp.id} className="card-premium outline-brand rounded-2xl bg-white p-6">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {/* Avatar (initials — no avatar field exists in the schema) */}
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-blue-800 text-base font-medium text-white">
                      {initials(resp.fullName)}
                    </div>

                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-base font-semibold text-text-primary">
                          {resp.fullName || t('annonces.detail.freelance_unnamed', lang)}
                        </p>
                        {resp.city && (
                          <>
                            <span className="text-text-muted" aria-hidden="true">·</span>
                            <span className="text-sm text-text-muted">{resp.city}</span>
                          </>
                        )}
                      </div>
                      {resp.headline && (
                        <p className="mt-0.5 truncate text-sm text-text-primary">{resp.headline}</p>
                      )}
                      {resp.proposalMessage && (
                        <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-text-primary">
                          {resp.proposalMessage}
                        </p>
                      )}
                      <p className="mt-3 text-xs text-text-muted">
                        {days === 0
                          ? t('annonces.detail.responded_today', lang)
                          : t('annonces.detail.responded_days_ago', lang, { n: days })}
                      </p>
                    </div>

                    {/* Contact — WhatsApp CTA. #25D366 / #1DA851 are WhatsApp brand green, a
                        documented literal exception (mirror --wa-brand / --wa-brand-hover). */}
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => contactFreelancer(resp)}
                        disabled={revealingId === resp.freelancerId}
                        className={cn(
                          'inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-text-primary shadow-md transition-colors hover:bg-[#1DA851] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto',
                          FOCUS_RING,
                        )}
                      >
                        {revealingId === resp.freelancerId ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        )}
                        {t('annonces.detail.contact', lang)}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* RIGHT — sticky action panel */}
      <div className="mt-6 lg:col-span-2 lg:mt-0">
        <div className="card-premium outline-brand rounded-2xl bg-white p-6 lg:sticky lg:top-24">
          <p className="mb-4 text-xs uppercase tracking-wide text-text-muted">{t('annonces.detail.actions', lang)}</p>

          <div className="flex flex-col gap-3">
            {/* Close — only while open, 2-step inline confirm */}
            {canManageOpen &&
              (!closeStep ? (
                <button
                  type="button"
                  onClick={() => setCloseStep(true)}
                  className={cn(
                    'inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-blue-600 text-base font-semibold text-white shadow-md transition-colors hover:bg-brand-blue-500',
                    FOCUS_RING,
                  )}
                >
                  <CheckCircle className="h-5 w-5" aria-hidden="true" />
                  {t('annonces.detail.close', lang)}
                </button>
              ) : (
                <div className="rounded-2xl border border-border-subtle p-3">
                  <p className="text-sm font-medium text-text-primary">{t('annonces.detail.close_sure', lang)}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={doClose}
                      disabled={closing}
                      className={cn(
                        'inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-brand-blue-600 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-500 disabled:cursor-not-allowed disabled:opacity-60',
                        FOCUS_RING,
                      )}
                    >
                      {closing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      {closing ? t('common.submitting', lang) : t('annonces.detail.confirm', lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCloseStep(false)}
                      disabled={closing}
                      className={cn(
                        'inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-full border border-border-subtle bg-white text-sm font-medium text-text-primary transition-colors hover:bg-slate-50 disabled:opacity-60',
                        FOCUS_RING,
                      )}
                    >
                      {t('common.cancel', lang)}
                    </button>
                  </div>
                </div>
              ))}

            {canManageOpen && (
              <p className="text-xs text-text-muted">{t('annonces.detail.close_helper', lang)}</p>
            )}

            {/* Reopen — only a filled, not-expired post */}
            {canReopen && (
              <button
                type="button"
                onClick={doReopen}
                disabled={reopening}
                className={cn(
                  'inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-border-subtle bg-white text-sm font-medium text-text-primary transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60',
                  FOCUS_RING,
                )}
              >
                {reopening ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                )}
                {t('annonces.detail.reopen', lang)}
              </button>
            )}

            {/* Delete — always available (destructive) */}
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className={cn(
                'inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-red-300 bg-white text-sm font-medium text-red-700 transition-colors hover:bg-red-50',
                FOCUS_RING,
              )}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t('annonces.detail.delete', lang)}
            </button>

            <div className="mt-2 border-t border-border-subtle pt-3">
              <p className="text-xs leading-relaxed text-text-muted">{t('annonces.detail.expiry_note', lang)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleting && setDeleteOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-annonce-title"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 id="delete-annonce-title" className="text-xl font-bold text-text-primary">
              {t('annonces.detail.delete_modal_title', lang)}
            </h2>
            <p className="mt-2 text-sm text-text-muted">{t('annonces.detail.delete_modal_body', lang)}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                ref={keepBtnRef}
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className={cn(
                  'inline-flex h-10 cursor-pointer items-center rounded-full border border-border-subtle bg-white px-4 text-sm font-medium text-text-primary transition-colors hover:bg-slate-50 disabled:opacity-60',
                  FOCUS_RING,
                )}
              >
                {t('common.cancel', lang)}
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={deleting}
                className={cn(
                  'inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60',
                  FOCUS_RING,
                )}
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {deleting ? t('common.submitting', lang) : t('annonces.detail.delete_confirm', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
