'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Briefcase, CheckCircle, Inbox, Loader2, MapPin, MessageSquare, RotateCcw, Trash2, Wifi } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import { ModerationBanner } from '@/components/ModerationBanner'
import { StatusPill } from '@/components/ui/status-pill'
import { EmptyState } from '@/components/marche/EmptyState'
import { ConfirmModal } from '@/components/marche/ConfirmModal'
import { AnnonceResponseCard } from '@/components/marche/AnnonceResponseCard'
import { ANNONCE_STATUS_PILL } from '@/lib/marche/annonce-status'
import type { AnnonceDetailData } from '@/lib/marche/annonce-detail'
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

export function AnnonceDetail({ annonce }: { annonce: AnnonceDetailData }) {
  const lang = useLang()
  const router = useRouter()

  const [closeOpen, setCloseOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Resolved server-side (lib/marche/annonce-status.ts, shared with AnnonceCard) and passed down
  // as `displayStatus` — NOT recomputed here. A resolver reading `Date.now()` inside this
  // 'use client' component's render body would run once during SSR and again on hydration with
  // two different clocks; for a post near the 30-day boundary that is a hydration mismatch.
  const display = annonce.displayStatus

  // Action gating: an expired-but-open post offers no Close (it would be a no-op); a filled
  // post can be reopened only while still inside the 30-day window. Modify returns in PR-D
  // with the edit route behind it — canManageOpen still gates Close below, unrelated to Modify.
  const canManageOpen = display === 'open'
  const canReopen = annonce.status === 'filled' && !annonce.isExpired

  async function doClose() {
    setClosing(true)
    const res = await closeMissionAction(annonce.id)
    if (!res.ok) {
      toast.error(t(res.errorKey ?? 'common.error_generic', lang))
      setClosing(false)
      return
    }
    toast.success(t('annonces.detail.close_success', lang))
    setCloseOpen(false)
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
  const hasBudget = annonce.budgetMin != null || annonce.budgetMax != null
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

  // Status badge — shares AnnonceCard's own ANNONCE_STATUS_PILL (lib/marche/annonce-status.ts)
  // rather than a second local copy. Before PR-E this page kept its own map with a different hue
  // (green, not StatusPill's indigo for 'pourvue') AND a different label ("Fermée", not "Pourvue")
  // for the identical displayStatus value — the same post read as two different things depending
  // which page you were on.
  const { status: pillStatus, labelKey: statusLabelKey } = ANNONCE_STATUS_PILL[display]

  const responseBadgeCls = annonce.isAtCap ? 'bg-warning-100 text-warning-500' : 'bg-surface-sunken text-text-muted'
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
          <p className="text-caption uppercase tracking-wide text-text-muted">{t('annonces.detail.label', lang)}</p>
          <h1 className="mt-1 wrap-anywhere text-h2 text-text-primary">{annonce.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-body-sm text-text-muted">
            <StatusPill status={pillStatus}>{t(statusLabelKey, lang)}</StatusPill>
            <span aria-hidden="true">·</span>
            <span>{t('annonces.detail.posted_on', lang, { date: formatDate(annonce.createdAt) })}</span>
            <span aria-hidden="true">·</span>
            <span className={cn('rounded-full px-3 py-1 text-xs font-medium', responseBadgeCls)}>
              {responseBadgeLabel}
            </span>
          </div>
        </div>

        {annonce.adminHiddenAt && <ModerationBanner variant="job_post" />}

        {/* Section A — annonce summary */}
        <div className="card-premium outline-brand mb-6 rounded-2xl bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-brand-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-text-primary">{t('annonces.detail.section_details', lang)}</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium text-text-muted">{t('annonces.detail.description_label', lang)}</p>
              <p className="mt-1 whitespace-pre-line wrap-anywhere text-base leading-relaxed text-text-primary">
                {annonce.description}
              </p>
            </div>

            {/* xl:grid-cols-2, not sm: — measured at 1024 (this card is ~410px wide inside the
                page's lg:col-span-3 of 5), a 5-figure budget range wraps to 2 lines at the sm-2up
                172px column width. xl defers the 2-up split until the column is wide enough for
                the widest realistic value on one line — same fix class as PR #153's
                lg:grid-cols-3 -> xl:grid-cols-3 on the list grid, applied here to the dl's own
                2-column split rather than the outer page grid (that fix doesn't reach this one). */}
            <dl className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-text-muted">{t('annonces.detail.budget_label', lang)}</dt>
                {/* dir="ltr" only on the numeric branches — the "À discuter" fallback (hasBudget
                    false) is real translated text and must stay in the ambient RTL flow. */}
                <dd dir={hasBudget ? 'ltr' : undefined} className="mt-1 text-base font-semibold text-text-primary">
                  {budgetLabel}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-muted">{t('annonces.detail.category_label', lang)}</dt>
                <dd className="mt-1">
                  {annonce.category ? (
                    <span className="inline-block rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium text-text-primary">
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
                {/* dir="ltr" only around the date string — "Aucune" (deadline_none) is real
                    translated text and must stay in the ambient RTL flow. */}
                <dd className="mt-1 text-base text-text-primary">
                  {annonce.deadline ? (
                    <span dir="ltr">{formatDate(annonce.deadline)}</span>
                  ) : (
                    t('annonces.detail.deadline_none', lang)
                  )}
                </dd>
              </div>
            </dl>

            {annonce.skills.length > 0 && (
              <div>
                <p className="text-sm font-medium text-text-muted">{t('annonces.detail.skills_label', lang)}</p>
                {/* Same chip recipe as AnnonceCard's skills chips — the same job_post_skills data
                    was rendered two different ways on two pages of one feature (this page used
                    surface-sunken grey; the list card used this brand-blue treatment). */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {annonce.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-brand-blue-50 px-3 py-1 text-xs wrap-anywhere text-brand-blue-600"
                    >
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
          <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-medium text-text-muted">
            {annonce.responseCount}
          </span>
        </div>

        {annonce.responses.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<Inbox className="mx-auto h-12 w-12" />}
              message={t('annonces.detail.empty_title', lang)}
              subtitle={t('annonces.detail.empty_desc', lang)}
            />
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {annonce.responses.map((resp) => (
              <AnnonceResponseCard key={resp.id} response={resp} annonceTitle={annonce.title} lang={lang} />
            ))}
          </div>
        )}
      </div>

      {/* RIGHT — sticky action panel */}
      <div className="mt-6 lg:col-span-2 lg:mt-0">
        <div className="card-premium outline-brand rounded-2xl bg-white p-6 lg:sticky lg:top-24">
          <p className="mb-4 text-xs uppercase tracking-wide text-text-muted">{t('annonces.detail.actions', lang)}</p>

          <div className="flex flex-col gap-3">
            {/* Close — only while open, now a real modal (see below) sharing Delete's a11y wiring. */}
            {canManageOpen && (
              <button
                type="button"
                onClick={() => setCloseOpen(true)}
                className={cn(
                  'inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-blue-600 text-base font-semibold text-white shadow-md transition-colors hover:bg-brand-blue-500',
                  FOCUS_RING,
                )}
              >
                <CheckCircle className="h-5 w-5" aria-hidden="true" />
                {t('annonces.detail.close', lang)}
              </button>
            )}

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
                  'inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-border-subtle bg-white text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60',
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
                'inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-danger-500 bg-white text-sm font-medium text-danger-500 transition-colors hover:bg-danger-50',
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

      {/* Close confirmation — reversible via Reopen, so no typed keyword (see ConfirmModal). */}
      {closeOpen && (
        <ConfirmModal
          titleId="close-annonce-title"
          title={t('annonces.detail.close_modal_title', lang)}
          body={t('annonces.detail.close_modal_body', lang)}
          cancelLabel={t('common.cancel', lang)}
          confirmLabel={t('annonces.detail.confirm', lang)}
          confirmVariant="primary"
          pending={closing}
          onCancel={() => setCloseOpen(false)}
          onConfirm={doClose}
        />
      )}

      {/* Delete confirmation — no typed keyword: lower-consequence than DeleteProductModal's
          with-orders case (job_responses rows are preserved by the soft-delete, not orphaned). */}
      {deleteOpen && (
        <ConfirmModal
          titleId="delete-annonce-title"
          title={t('annonces.detail.delete_modal_title', lang)}
          body={t('annonces.detail.delete_modal_body', lang)}
          cancelLabel={t('common.cancel', lang)}
          confirmLabel={t('annonces.detail.delete_confirm', lang)}
          confirmVariant="danger"
          pending={deleting}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={doDelete}
        />
      )}
    </div>
  )
}
