'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// Initials = first letter of each word in the name, max 2, uppercase.
function initials(name: string | null): string {
  if (!name) return '?'
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// Right-rail card 1. The one place the saturated brand-blue-800 navy appears on the
// page — an identity anchor. White text on navy throughout.
export function ProfileCard({
  fullName,
  city,
  ordersCount,
  missionsCount,
}: {
  fullName: string | null
  city: string | null
  ordersCount: number
  missionsCount: number
}) {
  const lang = useLang()

  return (
    <BlurFade delay={0} inView>
      <div className="rounded-2xl bg-brand-blue-800 p-5 text-white">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue-600 text-base font-semibold text-white"
          aria-hidden="true"
        >
          {initials(fullName)}
        </div>
        {fullName ? <p className="mt-3 text-base font-semibold">{fullName}</p> : null}
        {city ? <p className="mt-0.5 text-sm text-brand-sky">{city}</p> : null}

        <div className="my-4 h-px bg-white/15" />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xl font-semibold">{ordersCount}</p>
            <p className="text-xs text-brand-sky">{t('dashboard.rightRail.profile.ordersLabel', lang)}</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{missionsCount}</p>
            <p className="text-xs text-brand-sky">{t('dashboard.rightRail.profile.missionsLabel', lang)}</p>
          </div>
        </div>
      </div>
    </BlurFade>
  )
}
