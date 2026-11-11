'use client'

import { useState } from 'react'
import { Clock, User, Wallet } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

import { Avatar } from '@/components/ui/avatar'
import { Button, ButtonLink } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import { getInitials } from '@/components/ui/initials'
import { SkillChip } from '@/components/missions/MissionChips'
import { PlatformIcon } from '@/components/social/PlatformIcon'
import { detectPlatform } from '@/lib/social/platforms'
import { tndAmount } from '@/components/listings/listing-utils'
import { relativeTimeLabel } from '@/lib/relative-time'
import type { AnnonceResponse } from '@/lib/marche/annonce-detail'

/** Above this many characters the message is clamped to 3 lines with a « Lire la suite » toggle (F4 draws an excerpt). */
const LONG_MESSAGE = 240

// F4 « Proposition reçue » card (Figma 1477:29190): received-ago · avatar + name + « headline · city » · price + délai · message ·
// WhatsApp + « Voir le profil ». Anatomy is exactly what getAnnonceDetail loads — nothing invented (no rating). The proposal's
// portfolio links and skills (missions PR-4 / M-C) are not drawn in the frame but stay, under the message.
//
// `now` is the SERVER's clock (AnnonceDetailData.fetchedAt): this client component never reads Date.now() while rendering, or SSR and
// hydration would print two different « il y a 3 h » around a minute boundary.
//
// Links come from a jsonb column the DB trigger validates (http(s) only, ≤ 500, ≤ 3), and are still rendered as plain anchors with
// rel="noopener noreferrer nofollow" + target=_blank — never as HTML.
//
// Plain class strings, not cn(), wherever a text size and a text colour sit together: tailwind-merge treats every `text-*` as one
// group and evicts the custom size tokens (text-caption / text-body-sm) next to a colour.
//
// 375 (m375-f4-annonce, docs/design/m375-f4-home-ar-deltas.md): the stroke sits inside Figma's pad 20 / 16 (content 279), caption line 15,
// name 19, « headline · city » and the price / délai lines 17, the message 27. Below lg only.
// G1 (migration 20261106153901): once the owner has chosen, the card says so — « Choisi » on the chosen proposal, « Non retenu »
// on the others. While the post can still be decided, `onChoose` adds « Choisir ce freelance » (the parent confirms and calls the
// RPC). No frame draws these states: the pill and the button are the existing StatusPill / Button, placed where the frame's caption
// row and action row already are (PR deltas doc).
const OUTCOME_PILL = {
  chosen: { status: 'reçue', labelKey: 'annonces.choose.pill_chosen' },
  not_chosen: { status: 'withdrawn', labelKey: 'annonces.choose.pill_not_chosen' },
} as const

export function AnnonceResponseCard({
  response,
  annonceTitle,
  lang,
  now,
  onChoose,
}: {
  response: AnnonceResponse
  annonceTitle: string
  lang: Lang
  now: number
  /** Present only while this post can still be decided (open, nobody chosen). */
  onChoose?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const message = t('annonces.detail.whatsapp_consumer_to_responder', lang, { annonce: annonceTitle })
  const { proposalMessage, headline, city, proposedPrice, proposedTimeframe } = response
  const long = (proposalMessage?.length ?? 0) > LONG_MESSAGE
  const identity = [headline, city].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-base px-[15px] py-[19px] sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption font-medium text-text-muted max-lg:leading-[15px]">
          {t('annonces.detail.received_ago', lang, { when: midSentence(relativeTimeLabel(response.createdAt, lang, now), lang) })}
        </p>
        {response.status !== 'pending' ? (
          <StatusPill status={OUTCOME_PILL[response.status].status}>{t(OUTCOME_PILL[response.status].labelKey, lang)}</StatusPill>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Avatar size="md" initials={getInitials(response.fullName)} className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="wrap-anywhere text-body font-semibold text-text-primary max-lg:leading-[19px]">
            {response.fullName || t('annonces.detail.freelance_unnamed', lang)}
          </p>
          {identity && (
            <p className="flex items-center gap-1.5 text-body-sm font-medium text-text-muted max-lg:leading-[17px]">
              <User className="size-4 shrink-0" aria-hidden="true" />
              <span className="wrap-anywhere">{identity}</span>
            </p>
          )}
        </div>
      </div>

      {(proposedPrice != null || proposedTimeframe) && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm font-medium text-text-muted max-lg:leading-[17px]">
          {proposedPrice != null && (
            <div className="flex items-center gap-1.5">
              <Wallet className="size-4 shrink-0" aria-hidden="true" />
              <dt>{t('annonces.detail.proposed_price', lang)} :</dt>
              {/* bdi, not dir="ltr" on the block: the LTR run is isolated and the row keeps its own direction. */}
              <dd>
                {/* Auto-direction isolate (walk #25): « 80 TND » LTR in FR, « 80 د.ت » RTL in AR — the dashboard's reading order. */}
                <bdi>
                  {tndAmount(proposedPrice)} {t('annonce.form.budget_currency', lang)}
                </bdi>
              </dd>
            </div>
          )}
          {proposedTimeframe && (
            <div className="flex items-center gap-1.5">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              <dt>{t('annonces.detail.proposed_timeframe', lang)} :</dt>
              <dd className="wrap-anywhere">{proposedTimeframe}</dd>
            </div>
          )}
        </dl>
      )}

      {proposalMessage && (
        <div>
          <p
            className={`whitespace-pre-line wrap-anywhere text-body leading-7 text-text-primary max-lg:leading-[27px] ${long && !expanded ? 'line-clamp-3' : ''}`}
          >
            {proposalMessage}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-1 cursor-pointer rounded text-body-sm font-semibold text-brand-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-600"
            >
              {t(expanded ? 'annonces.detail.msg_less' : 'annonces.detail.msg_more', lang)}
            </button>
          )}
        </div>
      )}

      <ProposalExtras response={response} lang={lang} />

      <div className="flex flex-wrap items-center gap-2">
        {onChoose ? (
          <Button variant="primary" size="md" onClick={onChoose}>
            {t('annonces.choose.cta', lang)}
          </Button>
        ) : null}
        <div className="w-63">
          <WhatsAppContactButton
            targetId={response.freelancerId}
            message={message}
            label={t('annonces.detail.contact_wa', lang)}
            size="md"
            glyphClassName="lg:hidden"
            errorMessageKey="annonces.detail.phone_reveal_error"
            noPhoneMessageKey="annonces.detail.no_phone"
          />
        </div>
        {/* /freelance/[id] resolves freelancer_profiles.id, not the profiles.id job_responses stores — hidden when that profile is not readable. */}
        {response.freelancerProfileId && (
          <ButtonLink
            href={`/freelance/${response.freelancerProfileId}`}
            variant="secondary"
            size="md"
            className="w-fit"
          >
            {t('annonces.detail.view_profile', lang)}
          </ButtonLink>
        )}
      </div>
    </div>
  )
}

// relativeTimeLabel's « Hier » / « À l'instant » are standalone capitalised strings; after « Proposition reçue » they read mid-sentence.
function midSentence(s: string, lang: Lang): string {
  return lang !== 'ar' ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// The portfolio links and the skills the freelancer attached to this proposal. Absent (not blank) when empty.
function ProposalExtras({ response, lang }: { response: AnnonceResponse; lang: Lang }) {
  const { links, skills } = response
  if (links.length === 0 && skills.length === 0) return null
  return (
    <div className="flex flex-col gap-3 border-t border-border-subtle pt-3">
      {links.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-caption font-medium text-text-muted">{t('annonces.detail.proposal_links', lang)}</p>
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.url} className="text-body-sm wrap-anywhere">
                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-start gap-1.5 text-brand-blue-600 hover:underline">
                  <PlatformIcon platform={detectPlatform(l.url) ?? 'website'} className="mt-0.5 size-4 shrink-0" />
                  <span>{l.label ? `${l.label} — ${hostOf(l.url)}` : hostOf(l.url)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {skills.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-caption font-medium text-text-muted">{t('annonces.detail.proposal_skills', lang)}</p>
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
