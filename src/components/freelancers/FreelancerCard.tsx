import Image from 'next/image'
import Link from 'next/link'
import { MapPin, User } from 'lucide-react'
import { getInitials } from '@/components/ui/initials'
import { FOCUS_RING } from '@/components/layout/styles'
import { FavoriteHeart } from '@/components/favorites/FavoriteHeart'
import type { FreelancerCardData } from '@/lib/marche/freelancer-cards'
import { t, tn, type Lang } from '@/lib/i18n'

// Freelancer Card — Figma « Freelancer Card » on 720:62688 (F1 Freelances): a horizontal card, surface/base · r12 · pad 20 · gap 16:
// a 72 round avatar, then a column (gap 12) with the name (16 Semi Bold), the headline (14 muted, two lines), « 📍 ville » (12 muted),
// up to four skill chips + « +N » (12 Medium, blue/50 · blue/700, r6) and a footer — « N services offerts » (12 muted) and a small
// primary « Voir le profil » (32 high). The frame's 20 heart sits at the end of the header row.
//
// The frame's border is blue/600 on the specimens; that reads as a hover/selected state leaking into the default, so the resting
// border is border/subtle and blue/600 appears on hover (decision logged in the PR). Name colour: text-primary (the frame's blue/800
// is not a token this app's text uses elsewhere).
//
// Hook-free like ShopCard: a server page or a client list renders it with `lang`. The whole card opens the profile through the name
// link (stretched ::after); the heart and the CTA sit above that layer.
// Lives here, NOT in the loader: this card is imported by client components, and the loader pulls in next/headers.
const FREELANCER_CARD_SKILLS = 4

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
  const shown = freelancer.skills.slice(0, FREELANCER_CARD_SKILLS)
  const extra = freelancer.skills.length - shown.length

  return (
    <article className="relative flex gap-4 rounded-xl border border-border-subtle bg-surface-base p-5 transition-colors hover:border-brand-blue-600">
      <span className="relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue-100 text-xl font-semibold text-brand-blue-600">
        {freelancer.avatarUrl ? (
          <Image src={freelancer.avatarUrl} alt="" fill sizes="72px" className="object-cover" />
        ) : freelancer.name ? (
          <span aria-hidden="true">{getInitials(freelancer.name)}</span>
        ) : (
          <User className="size-8 text-text-muted" aria-hidden="true" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="truncate text-base font-semibold text-text-primary">
              <Link href={href} className={`rounded after:absolute after:inset-0 after:rounded-xl ${FOCUS_RING}`}>
                {freelancer.name}
              </Link>
            </h3>
            {freelancer.headline ? <p className="line-clamp-2 text-body-sm text-text-muted">{freelancer.headline}</p> : null}
            {freelancer.city ? (
              <p className="inline-flex items-center gap-1 text-caption text-text-muted">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                {freelancer.city}
              </p>
            ) : null}
          </div>
          {heart ? (
            <FavoriteHeart
              kind="freelancer"
              targetId={freelancer.id}
              name={freelancer.name}
              initialFavorited={heart.initialFavorited}
              isLoggedIn={heart.isLoggedIn}
              onChange={heart.onChange}
              className="relative z-10 -mt-2 -me-2"
            />
          ) : null}
        </div>

        {shown.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {shown.map((skill) => (
              <li key={skill} className="rounded-md bg-brand-blue-50 px-2 py-1 text-caption font-medium text-brand-blue-700">
                {skill}
              </li>
            ))}
            {extra > 0 ? (
              <li className="rounded-md bg-brand-blue-50 px-2 py-1 text-caption font-medium text-brand-blue-700">+{extra}</li>
            ) : null}
          </ul>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {freelancer.serviceCount !== null ? (
            <span className="text-caption text-text-muted">{tn('freelancerCard.services', lang, freelancer.serviceCount)}</span>
          ) : (
            <span />
          )}
          <Link
            href={href}
            className={`relative z-10 ms-auto inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-[10px] bg-brand-blue-600 px-3 text-body-sm font-semibold text-text-inverse transition-colors hover:bg-brand-blue-700 ${FOCUS_RING}`}
          >
            {t('freelancerCard.view', lang)}
          </Link>
        </div>
      </div>
    </article>
  )
}
