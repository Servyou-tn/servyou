import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { FavoriteHeart } from '@/components/favorites/FavoriteHeart'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import type { FreelancerCardData } from '@/lib/marche/freelancer-cards'
import { t, tn, type Lang } from '@/lib/i18n'

// « Freelancer Card » — the Figma component as instanced on 662:53894 (1440) / 663:55017 (375); measurements in
// docs/design/freelances-lens-measurements.md. A horizontal card, FIXED 203 high: surface/base · r12 · a 2 px blue/600 stroke on EVERY card (not a
// hover state) · pad 20 · gap 16.
//   avatar   72 round, fill border/strong, holding an Avatar lg (56): the picture when there is one, else the person glyph in text/muted on
//            border/strong — NO initials. The « verified » dot is hidden in the component (no data).
//   content  vertical, gap 12:
//     header   name 16 Semi Bold blue/800 · title 14 Regular text/muted, 2 lines · city row (map-pin 14 + 12 Regular text/muted, gap 4);
//              the heart is a PLAIN 20 outline icon (text/muted; filled when favourited) at the top end — no circle.
//     chips    gap 8 · pad 4 8 · r6 · blue/50 · 12 Medium blue/700: up to 4 skills + « +N » for the rest — 2 + « +N » below `sm`, as the 375 frame draws.
//     footer   space-between: « N services offerts » 13 Regular text/muted · primary sm Button, 120 × 32, r10, « Voir le profil ».
//
// Hook-free like ShopCard: a server page or a client list renders it with `lang`. The whole card opens the profile through the name link
// (stretched ::after); the heart and the CTA sit above that layer. Lives here, NOT in the loader: this card is imported by client components, and
// the loader pulls in next/headers.
const SKILLS_WIDE = 4
const SKILLS_NARROW = 2

const CHIP = 'inline-flex h-[23px] shrink-0 items-center rounded-[6px] bg-brand-blue-50 px-2 text-xs font-medium text-brand-blue-700'

export function FreelancerCard({
  freelancer,
  lang,
  heart,
}: {
  freelancer: FreelancerCardData
  lang: Lang
  heart?: { initialFavorited: boolean; isLoggedIn: boolean; onChange?: (favorited: boolean) => void }
}) {
  const href = `/freelance/${freelancer.id}`
  const skills = freelancer.skills
  const wide = skills.slice(0, SKILLS_WIDE)
  const moreWide = skills.length - wide.length
  const moreNarrow = skills.length - SKILLS_NARROW

  return (
    <article className="relative flex h-[203px] gap-4 rounded-xl border-2 border-brand-blue-600 bg-surface-base p-4.5">
      <span className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-border-strong">
        <Avatar size="lg" src={freelancer.avatarUrl} name={freelancer.name} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="truncate text-base font-semibold leading-[19px] text-brand-blue-800">
              <Link href={href} className={`rounded after:absolute after:inset-0 after:rounded-xl ${FOCUS_RING}`}>
                {freelancer.name}
              </Link>
            </h3>
            {/* The title box is FIXED 42 in the component (two 21 lines): it keeps its height when the title is short or missing. */}
            <p className="line-clamp-2 min-h-[42px] text-sm text-text-muted">{freelancer.headline}</p>
            {freelancer.city ? (
              <p className="inline-flex items-center gap-1 text-xs leading-[15px] text-text-muted">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                {freelancer.city}
              </p>
            ) : null}
          </div>
          {heart ? (
            <FavoriteHeart
              variant="plain"
              kind="freelancer"
              targetId={freelancer.id}
              name={freelancer.name}
              initialFavorited={heart.initialFavorited}
              isLoggedIn={heart.isLoggedIn}
              onChange={heart.onChange}
              className="relative z-10"
            />
          ) : null}
        </div>

        {skills.length > 0 ? (
          <ul className="flex gap-2 overflow-hidden">
            {wide.map((skill, i) => (
              <li key={skill.fr} className={cn(CHIP, i >= SKILLS_NARROW && 'max-sm:hidden')}>
                {lang === 'ar' ? skill.ar : skill.fr}
              </li>
            ))}
            {moreWide > 0 ? <li className={cn(CHIP, 'max-sm:hidden')}>+{moreWide}</li> : null}
            {moreNarrow > 0 ? <li className={cn(CHIP, 'sm:hidden')}>+{moreNarrow}</li> : null}
          </ul>
        ) : null}

        <div className="mt-auto flex items-center justify-between">
          {freelancer.serviceCount !== null ? (
            <span className="whitespace-nowrap text-[13px] leading-4 text-text-muted">
              <span className="sm:hidden">{tn('freelancerCard.services_short', lang, freelancer.serviceCount)}</span>
              <span className="max-sm:hidden">{tn('freelancerCard.services', lang, freelancer.serviceCount)}</span>
            </span>
          ) : (
            <span />
          )}
          <Link
            href={href}
            className={cn(BUTTON_BASE, BUTTON_SIZE.sm, VARIANT_BASE.primary, VARIANT_STATE.primary, 'relative z-10 w-30 shrink-0 rounded-[10px]')}
          >
            {t('freelancerCard.view', lang)}
          </Link>
        </div>
      </div>
    </article>
  )
}
