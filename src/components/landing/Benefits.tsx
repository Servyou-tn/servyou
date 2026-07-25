import { t, type Lang } from '@/lib/i18n'
import { MapPinIcon, WalletIcon, ShieldIcon } from './icons'

// Section 4 — the three Servyou benefits (Cultivo three-card pattern). Icons in
// brand-blue-800 navy per the template. White background, 16px-radius cards with
// a subtle border that lifts on hover. No section heading: the template defines
// only the three cards.
const cards = [
  { Icon: MapPinIcon, titleKey: 'landing.benefits.tunisian_title', bodyKey: 'landing.benefits.tunisian_body' },
  { Icon: WalletIcon, titleKey: 'landing.benefits.pricing_title', bodyKey: 'landing.benefits.pricing_body' },
  { Icon: ShieldIcon, titleKey: 'landing.benefits.data_title', bodyKey: 'landing.benefits.data_body' },
] as const

export function Benefits({ lang }: { lang: Lang }) {
  return (
    <section className="bg-surface-base">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-6 lg:grid-cols-3">
          {cards.map(({ Icon, titleKey, bodyKey }) => (
            <div
              key={titleKey}
              className="rounded-2xl border border-border-subtle bg-surface-base p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-blue-800/10 text-brand-blue-800">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-text-primary">{t(titleKey, lang)}</h3>
              <p className="mt-3 text-base leading-relaxed text-text-muted">{t(bodyKey, lang)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
