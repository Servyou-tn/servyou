'use client'

import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { Avatar } from '@/components/ui/avatar'
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import type { AnnonceResponse } from '@/lib/marche/annonce-detail'

function initials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

// Whole days between the response timestamp and now (never negative).
function daysAgo(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)))
}

// PR-E — the response-card composite the discovery pass found no DS owner for. Anatomy is exactly
// the six fields getAnnonceDetail's query supports (lib/marche/annonce-detail.ts) — nothing
// invented (no rating, no proposed price: neither exists in the job_responses schema):
// avatar, name + city, headline, message body, relative timestamp, contact CTA.
//
// Avatar size: `md` (40px, avatar.tsx's own scale), not the old hand-rolled 48px. Precedent is
// OrdersList.tsx's "named party in a card" usage, not ServiceDetail's `lg` — that one is reserved
// for a single page-defining identity, and up to MAX_RESPONSES_PER_POST (10) of these can stack on
// one page. Avatar does not compute initials itself (avatar.tsx:44) — this file's own initials()
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
        <Avatar size="md" initials={initials(response.fullName)} className="shrink-0" />

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
          <p className="mt-3 text-xs text-text-muted">
            {days === 0
              ? t('annonces.detail.responded_today', lang)
              : t('annonces.detail.responded_days_ago', lang, { n: days })}
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
