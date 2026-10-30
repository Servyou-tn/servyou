'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Calendar, Clock, Inbox, MapPin, Wifi, type LucideIcon } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t, tn, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import { ModerationBanner } from '@/components/ModerationBanner'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import { CategoryChip, SkillChip } from '@/components/missions/MissionChips'
import { ConfirmModal } from '@/components/marche/ConfirmModal'
import { formatJobBudget, hasJobBudget } from '@/lib/marche/format-job-budget'
import { AnnonceResponseCard } from '@/components/marche/AnnonceResponseCard'
import { ANNONCE_STATUS_PILL } from '@/lib/marche/annonce-status'
import { formatTunisDate } from '@/lib/datetime'
import type { AnnonceDetailData } from '@/lib/marche/annonce-detail'
import {
  closeMissionAction,
  reopenMissionAction,
  deleteMissionAction,
} from '@/app/mes-annonces/[id]/actions'

/** F4 draws the first three proposals, then « + N autres propositions ». */
const PROPOSALS_SHOWN = 3

// Panel recipe shared by the two left cards (Figma 1477:29190 / 375 frame 1488:65602): surface/base, 1px border, radius xl, gap 12, p 24 — px 16 at 375.
const PANEL = 'flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-base px-4 py-6 sm:p-6'

// F4 « Détail de mon annonce » (Figma 1477:29190, 1440). Left: description panel, then the proposals received. Right (376 from `xl`): the
// decision card. Below `xl` everything is ONE column in that order — the 375 frame (1488:65602) is applied separately.
export function AnnonceDetail({ annonce }: { annonce: AnnonceDetailData }) {
  const lang = useLang()
  const router = useRouter()

  const [closeOpen, setCloseOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showAll, setShowAll] = useState(false)

  // Resolved server-side (lib/marche/annonce-status.ts, shared with the list row) and passed down
  // as `displayStatus` — NOT recomputed here. A resolver reading `Date.now()` inside this
  // 'use client' component's render body would run once during SSR and again on hydration with
  // two different clocks; for a post near the 30-day boundary that is a hydration mismatch. The same goes for « Expire dans N jours »
  // (`expiresInDays`) and the proposals' « il y a 3 h » (`fetchedAt`): both come from the server's single clock.
  const display = annonce.displayStatus

  // Action gating: an expired-but-open post offers no « pourvue » (it would be a no-op); a filled post can be reopened only while
  // still inside the 30-day window.
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

  // Same sentence as the list and the mission pages (formatJobBudget): the single « Budget approximatif » is saved as budget_max, a
  // max-only budget reads as a figure, an old min–max post still reads as a range. No budget at all → « Selon budget » (as the list).
  const hasBudget = hasJobBudget(annonce.budgetMin, annonce.budgetMax)
  const budgetLabel = hasBudget
    ? formatJobBudget(annonce.budgetMin, annonce.budgetMax, lang)
    : t('mesannonces.row.budget_none', lang)

  // One status map for every surface (list row + this page): the same post reads as the same word in the same colour.
  const { status: pillStatus, labelKey: statusLabelKey } = ANNONCE_STATUS_PILL[display]

  const count = annonce.responseCount
  const places = MAX_RESPONSES_PER_POST - count
  const visibleResponses = showAll ? annonce.responses : annonce.responses.slice(0, PROPOSALS_SHOWN)
  const hiddenCount = annonce.responses.length - PROPOSALS_SHOWN

  // « Expire dans N jours » only means something while the post is open.
  const expiresIn = display === 'open' ? annonce.expiresInDays : null
  const expiresText =
    expiresIn == null
      ? null
      : expiresIn === 0
        ? t('annonces.detail.expires_today', lang)
        : `${t('annonces.detail.expires_label', lang)} ${tn('annonces.detail.days', lang, expiresIn)}`

  const where = annonce.isRemote ? t('annonce.form.remote_label', lang) : annonce.city

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <Link
        href="/mes-annonces"
        className={cn(
          'inline-flex w-fit items-center gap-1.5 rounded text-body-sm font-semibold text-brand-blue-600 hover:underline',
          FOCUS_RING,
        )}
      >
        <ArrowLeft className="size-5 rtl:-scale-x-100" aria-hidden="true" />
        {t('annonces.detail.back', lang)}
      </Link>

      {/* Post header: category chip + status pill, H1, meta row. */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip slug={annonce.categorySlug} nameFr={annonce.category} nameAr={annonce.categoryAr} lang={lang} />
          <StatusPill status={pillStatus}>{t(statusLabelKey, lang)}</StatusPill>
        </div>
        <h1 className="wrap-anywhere text-h1 text-text-primary">{annonce.title}</h1>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm font-medium text-text-muted">
          <li className="inline-flex items-center gap-1.5">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            {t('annonces.detail.posted_on', lang, { date: formatTunisDate(annonce.createdAt, lang, 'long') })}
          </li>
          {where && (
            <li className="inline-flex items-center gap-1.5">
              {annonce.isRemote ? (
                <Wifi className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
              )}
              {where}
            </li>
          )}
          {expiresText && (
            <li className="inline-flex items-center gap-1.5">
              <Calendar className="size-4 shrink-0" aria-hidden="true" />
              {expiresText}
            </li>
          )}
        </ul>
      </header>

      {annonce.adminHiddenAt && <ModerationBanner variant="job_post" />}

      <div className="flex flex-col gap-5 sm:gap-6 xl:flex-row xl:items-start">
        {/* LEFT — description, then the proposals received */}
        <div className="flex min-w-0 flex-col gap-6 xl:flex-1">
          <section className={PANEL}>
            <h2 className="text-body-sm font-semibold text-text-secondary">{t('annonces.detail.desc_title', lang)}</h2>
            <p className="whitespace-pre-line wrap-anywhere text-body text-text-primary">{annonce.description}</p>
          </section>

          <section className={PANEL} aria-labelledby="proposals-title">
            <h2 id="proposals-title" className="text-body-sm font-semibold text-text-secondary">
              {t('annonces.detail.proposals_title', lang, { n: count })}
            </h2>

            {count === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Inbox className="size-12 text-text-muted" aria-hidden="true" />
                <p className="text-body font-semibold text-text-primary">{t('annonces.detail.empty_title', lang)}</p>
                <p className="max-w-md text-body-sm text-text-muted">{t('annonces.detail.empty_desc', lang)}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {visibleResponses.map((resp) => (
                  <AnnonceResponseCard
                    key={resp.id}
                    response={resp}
                    annonceTitle={annonce.title}
                    lang={lang}
                    now={annonce.fetchedAt}
                  />
                ))}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    aria-expanded={showAll}
                    className={cn(
                      'w-fit cursor-pointer rounded text-body text-text-primary hover:underline',
                      FOCUS_RING,
                    )}
                  >
                    {showAll ? t('annonces.detail.proposals_less', lang) : tn('annonces.detail.proposals_more', lang, hiddenCount)}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT — decision card (376 from `xl`) */}
        <aside className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base px-4 py-6 sm:p-6 xl:sticky xl:top-24 xl:w-94 xl:shrink-0">
          <div>
            <p className="text-caption font-medium text-text-muted">{t('annonces.detail.budget_label', lang)}</p>
            {/* <bdi dir="ltr">: « 200 – 400 TND » reorders in an RTL block otherwise; only the figure branch is isolated — « Selon budget »
                is real translated text and keeps the ambient direction. */}
            <p className="mt-0.5 text-h1 text-text-primary">{hasBudget ? <bdi dir="ltr">{budgetLabel}</bdi> : budgetLabel}</p>
          </div>

          <hr className="border-border-subtle" />

          <div className="flex flex-col gap-1.5">
            <CompetitionPill count={count} cap={annonce.isAtCap} lang={lang} />
            {/* The « 5 / 10 » pair is its own LTR run: in an RTL line the spaced slash is a neutral and the numbers swap (« 10 / 5 »). */}
            <p className="text-caption font-medium text-text-muted">
              <bdi dir="ltr">
                {count} / {MAX_RESPONSES_PER_POST}
              </bdi>{' '}
              · {annonce.isAtCap ? t('annonces.detail.slots_full', lang) : tn('annonces.detail.slots_left', lang, places)}
            </p>
          </div>

          {annonce.skills.length > 0 && (
            <>
              <hr className="border-border-subtle" />
              <div className="flex flex-col gap-1.5">
                <p className="text-caption font-medium text-text-muted">{t('annonces.detail.skills_label', lang)}</p>
                <div className="flex flex-wrap gap-2">
                  {annonce.skills.map((s) => (
                    <SkillChip key={s}>{s}</SkillChip>
                  ))}
                </div>
              </div>
            </>
          )}

          <hr className="border-border-subtle" />

          <dl className="flex flex-col gap-3 text-body-sm">
            {where && <MetaRow icon={MapPin} label={t('annonces.detail.location_label', lang)} value={where} />}
            {annonce.deadline && (
              <MetaRow icon={Calendar} label={t('annonces.detail.deadline_label', lang)} value={formatTunisDate(annonce.deadline, lang, 'long')} />
            )}
            {/* Day 0 (the last day) is said once, in the header; the row needs a number to sit beside its label. */}
            {expiresIn != null && expiresIn > 0 && (
              <MetaRow icon={Clock} label={t('annonces.detail.expires_label', lang)} value={tn('annonces.detail.days', lang, expiresIn)} />
            )}
          </dl>

          <div className="flex flex-col gap-4">
            {canManageOpen && (
              <Button variant="secondary" className="w-full" onClick={() => setCloseOpen(true)}>
                {t('annonces.detail.close', lang)}
              </Button>
            )}
            {canReopen && (
              <Button variant="secondary" className="w-full" loading={reopening} onClick={doReopen}>
                {t('annonces.detail.reopen', lang)}
              </Button>
            )}
            {/* « Modifier l'annonce »: the edit route does not exist yet (next PR). A disabled button cannot take focus and its title
                is unreliable, so the reason is visible text, tied to the button for assistive tech. */}
            <div className="flex flex-col gap-1">
              <Button variant="ghost" className="w-full" disabled aria-describedby="edit-soon">
                {t('annonces.detail.edit', lang)}
              </Button>
              <p id="edit-soon" className="text-center text-caption text-text-muted">
                {t('annonces.detail.edit_soon', lang)}
              </p>
            </div>
            <Button variant="danger" className="w-full" onClick={() => setDeleteOpen(true)}>
              {t('annonces.detail.delete', lang)}
            </Button>
          </div>
        </aside>
      </div>

      {/* « Marquer comme pourvue » confirmation — reversible via Reopen, so no typed keyword (see ConfirmModal). */}
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

// Space-between row: label Medium text/secondary, value Semi Bold text/primary (Figma 14 px). Plain strings — size + colour together.
function MetaRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="flex items-center gap-1.5 font-medium text-text-secondary">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="text-end font-semibold text-text-primary wrap-anywhere">{value}</dd>
    </div>
  )
}

// Competition pill (F4): green while proposals come in, amber at the cap, neutral with none — the text carries the state, never colour alone.
function CompetitionPill({ count, cap, lang }: { count: number; cap: boolean; lang: Lang }) {
  const tone = count === 0 ? 'bg-surface-sunken text-text-secondary' : cap ? 'bg-warning-100 text-warning-700' : 'bg-success-100 text-success-700'
  const dot = count === 0 ? 'bg-text-muted' : cap ? 'bg-warning-500' : 'bg-success-500'
  return (
    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-caption font-semibold ${tone}`}>
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      {count === 0 ? t('annonces.detail.competition_none', lang) : tn('annonces.detail.competition', lang, count)}
    </span>
  )
}
