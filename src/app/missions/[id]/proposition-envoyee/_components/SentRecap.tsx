import { CategoryChip, SkillChip } from '@/components/missions/MissionChips'
import { t, type Lang } from '@/lib/i18n'
import { formatTunisDate, formatTunisTime } from '@/lib/datetime'
import { tndAmount } from '@/components/listings/listing-utils'
import { PlatformIcon } from '@/components/social/PlatformIcon'
import { detectPlatform } from '@/lib/social/platforms'
import type { SentProposal } from '@/lib/marche/sent-proposal-query'

// recap-panel — Figma 377:10742: surface/base, 1 px border/subtle, radius 12, pad 24, gap 16. Rows with no value are
// ABSENT, not blank (no link, skill, price or délai → no empty label). The message is a 3-line preview (D-H13-4).
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-caption font-medium text-text-muted">{children}</p>
}

export function SentRecap({ sent, lang }: { sent: SentProposal; lang: Lang }) {
  const hasTerms = sent.price != null || sent.timeframe
  return (
    <section className="flex w-full flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
      <h2 className="text-caption font-semibold text-text-muted uppercase">{t('proposal.sent.recap', lang)}</h2>

      {sent.mission ? (
        <>
          <div className="flex flex-col gap-2">
            <div>
              <CategoryChip slug={sent.mission.categorySlug} nameFr={sent.mission.categoryNameFr} nameAr={sent.mission.categoryNameAr} lang={lang} />
            </div>
            <p className="text-body font-semibold text-text-primary [overflow-wrap:anywhere]">{sent.mission.title}</p>
          </div>
          <hr className="border-0 border-t border-border-subtle" />
        </>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label>{t('proposal.sent.message', lang)}</Label>
        <p className="line-clamp-3 rounded-lg bg-surface-sunken p-3 text-body-sm whitespace-pre-line text-text-secondary [overflow-wrap:anywhere]">
          {sent.message}
        </p>
      </div>

      {sent.links.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label>{t('proposal.sent.links', lang)}</Label>
          <ul className="flex flex-col gap-1">
            {sent.links.map((l) => (
              <li key={l.url} className="text-body-sm [overflow-wrap:anywhere]">
                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-start gap-1.5 text-brand-blue-600 hover:underline">
                  <PlatformIcon platform={detectPlatform(l.url) ?? 'website'} className="mt-0.5 size-4 shrink-0" />
                  <span>{l.label ? `${l.label} — ${hostOf(l.url)}` : hostOf(l.url)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sent.skills.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label>{t('proposal.sent.skills', lang)}</Label>
          <div className="flex flex-wrap gap-2">
            {sent.skills.map((s) => (
              <SkillChip key={s}>{s}</SkillChip>
            ))}
          </div>
        </div>
      ) : null}

      {hasTerms ? (
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-body-sm">
          {sent.price != null ? (
            <p className="flex gap-1">
              <span className="text-text-muted">{t('proposal.sent.price', lang)}</span>
              <span dir="ltr" className="font-semibold text-text-primary">
                {tndAmount(sent.price)} TND
              </span>
            </p>
          ) : null}
          {sent.timeframe ? (
            <p className="flex gap-1">
              <span className="text-text-muted">{t('proposal.sent.timeframe', lang)}</span>
              <span className="font-semibold text-text-primary [overflow-wrap:anywhere]">{sent.timeframe}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="text-caption text-text-muted">
        {t('proposal.sent.at', lang, { date: formatTunisDate(sent.createdAt, lang, 'long'), time: formatTunisTime(sent.createdAt, lang) })}
      </p>
    </section>
  )
}
