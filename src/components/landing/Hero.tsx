import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { ArrowRightIcon, MapPinIcon, CheckIcon, TunisiaFlagIcon } from './icons'

// Three mock order cards inside the phone. Badge tints: brand blue (request sent),
// green (accepted), amber (in progress). The non-token hexes are mock-only.
const mockCards = [
  {
    titleKey: 'landing.hero.mock.bag_title',
    metaKey: 'landing.hero.mock.bag_meta',
    badgeKey: 'landing.hero.mock.bag_badge',
    badge: 'bg-brand-accent-light/20 text-brand-accent',
  },
  {
    titleKey: 'landing.hero.mock.logo_title',
    metaKey: 'landing.hero.mock.logo_meta',
    badgeKey: 'landing.hero.mock.logo_badge',
    badge: 'bg-status-dot-success/20 text-[#059669]',
  },
  {
    titleKey: 'landing.hero.mock.web_title',
    metaKey: 'landing.hero.mock.web_meta',
    badgeKey: 'landing.hero.mock.web_badge',
    badge: 'bg-[#F59E0B]/20 text-[#B45309]',
  },
] as const

const trustItems = [
  { valueKey: 'landing.trust.governorates_value', labelKey: 'landing.trust.governorates' },
  { valueKey: 'landing.trust.categories_value', labelKey: 'landing.trust.categories' },
  { valueKey: 'landing.trust.commission_value', labelKey: 'landing.trust.commission' },
  { valueKey: 'landing.trust.data_value', labelKey: 'landing.trust.data' },
] as const

const badgePill =
  'absolute inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-text-primary shadow-lg'

export function Hero({ lang }: { lang: Lang }) {
  return (
    <>
      <section style={{ background: 'linear-gradient(to bottom, var(--surface-base), var(--surface-subtle))' }}>
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — text */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.1em] text-brand-accent">
                {t('landing.hero.label', lang)}
              </p>
              <h1 className="mt-4 max-w-[600px] text-5xl font-bold leading-[1.1] tracking-tight text-text-primary lg:text-[64px]">
                {t('landing.hero.headline', lang)}
              </h1>
              <p className="mt-6 max-w-[480px] text-xl leading-relaxed text-text-muted">
                {t('landing.hero.subheadline', lang)}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className={`inline-flex h-14 items-center gap-2 rounded-full bg-brand-accent px-8 text-base font-semibold text-white transition-all hover:scale-[1.02] hover:bg-brand-primary ${FOCUS_RING}`}
                >
                  {t('landing.hero.cta_primary', lang)}
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
                <Link
                  href="/missions"
                  className={`inline-flex h-14 items-center rounded-full border border-border-subtle px-8 text-base font-semibold text-text-primary transition-colors hover:bg-surface-subtle ${FOCUS_RING}`}
                >
                  {t('landing.hero.cta_secondary', lang)}
                </Link>
              </div>
            </div>

            {/* Right — hero visual: phone mockup + floating badges */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[380px]">
                <div className="rotate-[3deg] rounded-3xl bg-white p-3 shadow-2xl">
                  <div className="rounded-2xl bg-surface-subtle p-4">
                    <div className="flex flex-col gap-3">
                      {mockCards.map(card => (
                        <div key={card.titleKey} className="rounded-xl bg-white p-3 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-200" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-text-primary">
                                {t(card.titleKey, lang)}
                              </p>
                              <p className="truncate text-xs text-text-muted">{t(card.metaKey, lang)}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${card.badge}`}
                            >
                              {t(card.badgeKey, lang)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`${badgePill} -left-4 top-8 rotate-[-8deg]`}>
                  <CheckIcon className="h-4 w-4 text-brand-accent" />
                  {t('landing.badge.commission', lang)}
                </div>
                <div className={`${badgePill} -right-6 top-16 rotate-[6deg]`}>
                  <MapPinIcon className="h-4 w-4 text-brand-primary" />
                  {t('landing.badge.governorates', lang)}
                </div>
                <div className={`${badgePill} -right-4 bottom-12 rotate-[-4deg]`}>
                  <TunisiaFlagIcon className="h-4 w-4" />
                  {t('landing.badge.tunisian', lang)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust band */}
      <div className="border-y border-border-subtle bg-surface-subtle">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center px-6 py-6 text-center">
          {trustItems.map((item, i) => (
            <span key={item.labelKey} className="inline-flex items-center">
              {i > 0 && (
                <span className="px-4 text-border-subtle" aria-hidden="true">
                  ·
                </span>
              )}
              <span>
                <span className="text-lg font-bold text-brand-primary">{t(item.valueKey, lang)}</span>{' '}
                <span className="text-sm font-medium text-text-muted">{t(item.labelKey, lang)}</span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
