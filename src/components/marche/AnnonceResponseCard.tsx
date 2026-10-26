'use client'

import { t, tn } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { Avatar } from '@/components/ui/avatar'
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import { getInitials } from '@/components/ui/initials'
import { SkillChip } from '@/components/missions/MissionChips'
import { tndAmount } from '@/components/listings/listing-utils'
import type { AnnonceResponse } from '@/lib/marche/annonce-detail'

// Whole days between the response timestamp and now (never negative).
function daysAgo(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)))
}

// PR-E — the response-card composite the discovery pass found no DS owner for. Anatomy is exactly
// the fields getAnnonceDetail's query supports (lib/marche/annonce-detail.ts) — nothing invented (no rating):
// avatar, name + city, headline, message body, then — since missions PR-4 — the proposal's TERMS (price, délai),
// portfolio links and skills, relative timestamp, contact CTA. Before PR-4 the freelancer's price / links / skills were
// write-only: the form (H12) collected them and this card could not show them.
//
// Links come from a jsonb column the DB trigger validates (http(s) only, ≤ 500, ≤ 3), and are still rendered as plain
// anchors with rel="noopener noreferrer nofollow" + target=_blank — never as HTML.
//
// Avatar size: `md` (40px, avatar.tsx's own scale), not the old hand-rolled 48px. Precedent is
// OrdersList.tsx's "named party in a card" usage, not ServiceDetail's `lg` — that one is reserved
// for a single page-defining identity, and up to MAX_RESPONSES_PER_POST (10) of these can stack on
// one page. Avatar does not compute initials itself (avatar.tsx:44) — the shared getInitials()
// feeds it, same helper the old hand-rolled circle used.
//
// Headline is NOT truncated: measured live at 1024 (lg:col-span-3 of the page's 5-col grid leaves
// this card ~410px, and the fixed-width neighbours — avatar, gap, the Contact button — leave the
// body column too narrow for even a moderate real headline), a plain `truncate` clipped
// "Développeuse full-stack" to "Développeuse full-st…" with REAL, unmodified data, not a stress
// case. line-clamp-2 + wrap-anywhere is the same reserve-space-don't-truncate answer already
// shipped for AnnonceCard's title/description (PR-C) and this page's own title/description
// (PR-E) — one answer to one recurring bug class, not a new one invented here.
export function AnnonceResponseCard({
  response,
  annonceTitle,
  lang,
}: {
  response: AnnonceResponse
  annonceTitle: string
  lang: Lang
}) {
  const days = daysAgo(response.createdAt)
  const message = t('annonces.detail.whatsapp_consumer_to_responder', lang, { annonce: annonceTitle })

  return (
    <div className="card-premium outline-brand rounded-2xl bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Avatar size="md" initials={getInitials(response.fullName)} className="shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-base font-semibold text-text-primary">
              {response.fullName || t('annonces.detail.freelance_unnamed', lang)}
            </p>
            {response.city && (
              <>
                <span className="text-text-muted" aria-hidden="true">
                  ·
                </span>
                <span className="text-sm text-text-muted">{response.city}</span>
              </>
            )}
          </div>
          {response.headline && (
            <p className="mt-0.5 line-clamp-2 wrap-anywhere text-sm text-text-primary">{response.headline}</p>
          )}
          {response.proposalMessage && (
            <p className="mt-3 whitespace-pre-line wrap-anywhere text-base leading-relaxed text-text-primary">
              {response.proposalMessage}
            </p>
          )}
          <ProposalTerms response={response} lang={lang} />
          <p className="mt-3 text-xs text-text-muted">
            {days === 0
              ? t('annonces.detail.responded_today', lang)
              : tn('annonces.detail.responded_days_ago', lang, days)}
          </p>
        </div>

        <div className="shrink-0">
          <WhatsAppContactButton
            targetId={response.freelancerId}
            message={message}
            label={t('annonces.detail.contact', lang)}
            size="sm"
            errorMessageKey="annonces.detail.phone_reveal_error"
            noPhoneMessageKey="annonces.detail.no_phone"
          />
        </div>
      </div>
    </div>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// Price + délai as two labelled facts, then the links and skills. Every piece is absent (not blank) when the freelancer left
// it empty; a proposal with none of them renders nothing here, exactly as before.
function ProposalTerms({ response, lang }: { response: AnnonceResponse; lang: Lang }) {
  const { proposedPrice, proposedTimeframe, links, skills } = response
  if (proposedPrice == null && !proposedTimeframe && links.length === 0 && skills.length === 0) return null
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border-subtle pt-4">
      {(proposedPrice != null || proposedTimeframe) && (
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {proposedPrice != null && (
            <div className="flex gap-1.5">
              <dt className="text-text-muted">{t('annonces.detail.proposed_price', lang)}</dt>
              <dd dir="ltr" className="font-semibold text-text-primary">
                {tndAmount(proposedPrice)} TND
              </dd>
            </div>
          )}
          {proposedTimeframe && (
            <div className="flex gap-1.5">
              <dt className="text-text-muted">{t('annonces.detail.proposed_timeframe', lang)}</dt>
              <dd className="font-semibold text-text-primary wrap-anywhere">{proposedTimeframe}</dd>
            </div>
          )}
        </dl>
      )}
      {links.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-text-muted">{t('annonces.detail.proposal_links', lang)}</p>
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.url} className="text-sm wrap-anywhere">
                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-blue-600 hover:underline">
                  {l.label ? `${l.label} — ${hostOf(l.url)}` : hostOf(l.url)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {skills.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-text-muted">{t('annonces.detail.proposal_skills', lang)}</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <SkillChip key={s}>{s}</SkillChip>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
