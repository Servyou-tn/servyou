'use client'

import type { ComponentType, SVGProps } from 'react'
import Link from 'next/link'
import { BlurFade } from '@/components/magicui/blur-fade'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { CompassIcon, BriefcaseIcon, HeartIcon, StoreIcon } from './icons'

const display = 'font-[family-name:var(--font-display)]'

type Action = {
  href: string
  titleKey: string
  subKey: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

// Section 3 — quick actions. "Devenir vendeur" only renders when the user has no
// seller role (always true on this consumer-only page; kept explicit for the future).
export function QuickActions({ showBecomeSeller }: { showBecomeSeller: boolean }) {
  const lang = useLang()

  const actions: Action[] = [
    {
      href: '/',
      titleKey: 'consumer.dashboard.actions.browse_title',
      subKey: 'consumer.dashboard.actions.browse_sub',
      Icon: CompassIcon,
    },
    {
      href: '/poster-mission',
      titleKey: 'consumer.dashboard.actions.post_title',
      subKey: 'consumer.dashboard.actions.post_sub',
      Icon: BriefcaseIcon,
    },
    {
      href: '/mes-favoris',
      titleKey: 'consumer.dashboard.actions.favs_title',
      subKey: 'consumer.dashboard.actions.favs_sub',
      Icon: HeartIcon,
    },
  ]
  if (showBecomeSeller) {
    actions.push({
      href: '/devenir-vendeur',
      titleKey: 'consumer.dashboard.actions.seller_title',
      subKey: 'consumer.dashboard.actions.seller_sub',
      Icon: StoreIcon,
    })
  }

  return (
    <section className="mb-10">
      <BlurFade delay={0.2} inView>
        {/* responsive pair retained: md:text-[28px] has no clean tier; half-tokenizing would break the mobile→desktop ramp (DS-3b-3) */}
        <h2 className={`${display} mb-4 text-[22px] font-bold text-[var(--text-primary)] md:text-[28px]`}>
          {t('consumer.dashboard.actions.heading', lang)}
        </h2>
      </BlurFade>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action, i) => (
          <BlurFade key={action.href} delay={0.2 + i * 0.05} inView>
            <Link
              href={action.href}
              className={`block rounded-xl bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_28px_72px_rgba(15,23,42,0.12)] ${FOCUS_RING}`}
            >
              <action.Icon className="h-8 w-8 text-[var(--brand-accent)]" />
              <p className={`${display} mt-3 text-body font-semibold text-[var(--text-primary)]`}>
                {t(action.titleKey, lang)}
              </p>
              <p className="mt-1 text-body-sm text-[var(--text-muted)]">{t(action.subKey, lang)}</p>
            </Link>
          </BlurFade>
        ))}
      </div>
    </section>
  )
}
