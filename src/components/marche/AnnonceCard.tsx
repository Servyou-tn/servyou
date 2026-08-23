'use client'

import { MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import { tndPrice } from '@/components/listings/listing-utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { StatusPill } from '@/components/ui/status-pill'
import { ModerationBanner } from '@/components/ModerationBanner'
import { getExpiryCountdownDays } from '@/lib/marche/annonce-expiry-countdown'
import { ANNONCE_STATUS_PILL } from '@/lib/marche/annonce-status'
import type { MyAnnonce } from '@/lib/marche/my-data'

const SKILLS_SHOWN = 3

function budgetLabel(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${tndPrice(min)} – ${tndPrice(max)}`
  if (min != null) return `≥ ${tndPrice(min)}`
  if (max != null) return `≤ ${tndPrice(max)}`
  return null
}

// Owner-side grid card (3-up, ListingResults.tsx:26's grid) — same ANATOMY strategy as
// ServiceListingCard (reserved 2-line title, capped chips) so a pathological row (a 114-char
// title, 8 skills) can't blow one card taller than its grid row, but NOT its literal fixed
// height: this card's content is intrinsically sized and CSS Grid's default row-stretch is what
// keeps a row's shorter cards visually aligned with the tallest one — no hardcoded height to
// desync from real content. `flex h-full flex-col` + `mt-auto` on the footer is what pins the CTA
// to the bottom of whatever height the grid row stretches this card to.
//
// The whole card is ONE <Link> — including the footer CTA. A second real <a> to the SAME
// destination would be a duplicate tab stop / duplicate screen-reader target for zero gain (the
// FavoriteButton-as-sibling pattern on Product/ServiceListingCard exists because THAT sibling is a
// different action that must not navigate; this card has no such second action).
export function AnnonceCard({ annonce }: { annonce: MyAnnonce }) {
  const lang = useLang()

  const { status: pillStatus, labelKey } = ANNONCE_STATUS_PILL[annonce.display_status]
  const statusLabel = t(labelKey, lang)
  const capReached = annonce.response_count >= MAX_RESPONSES_PER_POST
  const budget = budgetLabel(annonce.budget_min, annonce.budget_max)
  const metaLabel = annonce.is_remote ? t('annonce.form.remote_label', lang) : annonce.city
  const skillsShown = annonce.skills.slice(0, SKILLS_SHOWN)
  const skillsOverflow = annonce.skills.length - skillsShown.length
  // Countdown is about the POST (will it stop taking responses soon); it is deliberately a
  // different visual language (warning-toned, not the meta row's plain muted text) from a
  // deadline (about the WORK) — this card shows no deadline, so there is nothing to collide with.
  // Rendered in the meta row (below), not between the chip row and title: a standalone block
  // there pushed the title down only for cards that had a countdown, desyncing that card's title
  // from the rest of its grid row.
  const countdownDays = annonce.display_status === 'open' ? getExpiryCountdownDays(annonce.created_at) : null

  return (
    <Link
      href={`/mes-annonces/${annonce.id}`}
      className={`card-premium relative flex h-full flex-col overflow-hidden p-6 ${FOCUS_RING}`}
    >
      {/* Top row — category chip left (was fetched, never rendered, before this rebuild), status
          right. ms-auto on the pill keeps it end-aligned whether or not a category exists. */}
      <div className="flex items-start gap-3">
        {annonce.category && (
          <span className="inline-flex items-center rounded-full bg-surface-sunken px-2.5 py-1 text-caption font-medium text-text-secondary">
            {annonce.category}
          </span>
        )}
        <StatusPill status={pillStatus} className="ms-auto shrink-0">
          {statusLabel}
        </StatusPill>
      </div>

      {/* Reserved 2 lines, not today's binary fits-or-ellipsis: text-body's real line-height
          (1.625, globals.css) × 2 = 52px = h-13 on Tailwind v4's dynamic spacing scale exactly —
          no arbitrary bracket needed. wrap-anywhere: an unbreakable run (no spaces) would
          otherwise silently clip with no ellipsis under line-clamp instead of wrapping. */}
      <p className="mt-3 line-clamp-2 min-h-13 wrap-anywhere text-body font-semibold text-text-primary">
        {annonce.title}
      </p>

      {/* alert={false}: N moderated cards in a row would otherwise fire N assertive
          announcements for what is, to the user, one glanceable state per card. */}
      {annonce.admin_hidden_at && (
        <div className="mt-3">
          <ModerationBanner variant="job_post" alert={false} />
        </div>
      )}

      {/* Reserved 2 lines, unconditionally (not `annonce.description &&`): text-sm's line-height
          is Tailwind's own calc(1.25 / 0.875) × 0.875rem = 1.25rem/line × 2 = 2.5rem = h-10 on the
          standard spacing scale — same derive-from-the-token method as the title's h-13, so a
          missing or 1-line description no longer lets the budget below it rise to a different
          height than the row's longer-description cards. */}
      <p className="mt-2 line-clamp-2 min-h-10 wrap-anywhere text-sm text-text-muted">
        {annonce.description}
      </p>

      {/* Figure row — budget is the one dominant number, alone (no competition pill: there is no
          owner-side signal for how many other posts compete for the same freelancers). */}
      <p dir="ltr" className="mt-3 text-h3 font-bold text-text-primary">
        {budget ?? t('mesannonces.budget_unset', lang)}
      </p>

      {/* Response counter — framed as a result (icon + count), not a capacity meter. Only at the
          fairness cap does it switch to StatusPill's own warning tone; the numeric run itself
          stays dir="ltr" (reference_rtl_numeric_run_reversal — "n / max" is bidi-neutral
          spaces/slash with no strong-direction anchor of its own). */}
      <div className="mt-2">
        {capReached ? (
          <StatusPill status="pending" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            <span dir="ltr">
              {annonce.response_count} / {MAX_RESPONSES_PER_POST}
            </span>{' '}
            {t('mesannonces.responses_suffix', lang)}
          </StatusPill>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-blue-700">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span dir="ltr">
              {annonce.response_count} / {MAX_RESPONSES_PER_POST}
            </span>{' '}
            {t('mesannonces.responses_suffix', lang)}
          </span>
        )}
      </div>

      {/* Meta row — city OR remote (never both: a remote post's city is not where the work
          happens, so showing it alongside "Réalisable à distance" would read as a contradiction),
          plus the expiry countdown when the post is within its last 7 days. The countdown keeps
          its own warning tone (distinct from the deadline's plain-muted date treatment elsewhere
          in the app) even sitting next to the muted city/remote text. */}
      {(metaLabel || countdownDays != null) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm">
          {metaLabel && <span className="text-text-muted">{metaLabel}</span>}
          {metaLabel && countdownDays != null && (
            <span className="text-text-muted" aria-hidden="true">
              ·
            </span>
          )}
          {countdownDays != null && (
            <span className="font-semibold text-warning-700">
              {t('mesannonces.expiry_countdown', lang, { n: countdownDays })}
            </span>
          )}
        </div>
      )}

      {/* Skills — read-only chips mined from TagInput's visuals (rounded-full, bg-brand-blue-50,
          text-brand-blue-600), not the write-path component itself (no remove button, no input).
          Capped at 3 with a "+N" overflow computed off the FULL list (getMyAnnonces embeds every
          row — the write path caps a post to 8 skills, but this read path has no such cap, so a
          legacy row can exceed it). */}
      {annonce.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {skillsShown.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center rounded-full bg-brand-blue-50 px-3 py-1 text-sm wrap-anywhere text-brand-blue-600"
            >
              {skill}
            </span>
          ))}
          {skillsOverflow > 0 && (
            <span
              dir="ltr"
              className="inline-flex items-center rounded-full bg-surface-sunken px-3 py-1 text-sm font-medium text-text-secondary"
            >
              +{skillsOverflow}
            </span>
          )}
        </div>
      )}

      {/* Footer — divider, then the CTA. mt-auto pins it to the bottom of whatever height the
          grid row stretches this card to (see the component comment above). */}
      <div className="mt-auto flex items-center justify-end border-t border-border-subtle pt-4">
        {/* rounded-[10px]: same already-logged off-token CTA radius as ServiceListingCard's "Voir
            le service" (radius/lg exists in Figma but isn't wired as a rounded-lg-reachable
            utility — see that file's OFF-TOKEN VALUES note), reused here rather than
            re-discovered. */}
        <span className="inline-flex h-8 items-center rounded-[10px] bg-brand-blue-600 px-3 text-body-sm font-medium text-white">
          {t('mesannonces.view_responses', lang)}
        </span>
      </div>
    </Link>
  )
}
