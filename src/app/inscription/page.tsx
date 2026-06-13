import Image from 'next/image'
import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { AuthShell } from '@/components/auth/AuthShell'

// `display` = the Manrope display voice. AuthShell sets --font-display on its root,
// so this works on every element rendered as AuthShell children. No 'use client':
// pure presentation + routing (hover lift, focus ring, reduced-motion are all CSS).
const display = 'font-[family-name:var(--font-display)]'

// Inline ArrowRight (lucide's exact path) — the project deliberately avoids the
// lucide-react package (see Hero/HowItWorks); reusing the inline glyph honours
// the no-new-dependencies constraint.
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

// The three role intents. Icons are the SAME 3D illustrations the hero orbital
// composition uses (visual continuity from landing → signup). Each card is a
// <Link> to its Step-2 (role-branded) signup form.
const ROLE_CARDS = [
  { key: 'consumer', href: '/inscription/consumer', icon: '/brand/icons/icon-cart.png' },
  { key: 'shopOwner', href: '/inscription/shop-owner', icon: '/brand/icons/icon-shop.png' },
  { key: 'freelancer', href: '/inscription/freelancer', icon: '/brand/icons/icon-freelancer.png' },
] as const

// Step 1 — the role intent picker. Uses the shared AuthShell chrome (centered logo,
// pale-blue card) so it stays visually identical to the Step-2 forms. The 3 role
// cards keep their white surface, so they read as white tiles on the blue card.
export default async function InscriptionPage() {
  const lang = await getLang()
  const isRtl = lang === 'ar'

  return (
    <AuthShell maxWidthClass="max-w-[720px]">
      <h1
        className={`${display} text-center text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-[var(--text-primary)] md:text-[36px]`}
      >
        {t('signup.intent.title', lang)}
      </h1>
      <p
        className={`${display} mb-8 mt-2 text-center text-base font-medium text-[var(--text-muted)] md:mb-10 md:text-lg`}
      >
        {t('signup.intent.subtitle', lang)}
      </p>

      {/* 3 role cards: stacked on mobile, a 3-up grid on md+. The grid's inline
          axis reverses automatically under <html dir="rtl">. */}
      <ul className="flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-4">
        {ROLE_CARDS.map(({ key, href, icon }) => {
          const label = t(`signup.intent.cards.${key}.label`, lang)
          const description = t(`signup.intent.cards.${key}.description`, lang)
          return (
            <li key={key} className="md:h-full">
              <Link
                href={href}
                aria-label={`${label} — ${description}`}
                className={`${display} group relative flex h-full min-h-[140px] cursor-pointer flex-col items-center rounded-[20px] border-[1.5px] border-[var(--border-subtle)] bg-[var(--surface-base)] px-5 py-6 text-center outline-none transition-all duration-[250ms] ease-out hover:border-[var(--brand-accent)] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 motion-safe:hover:-translate-y-1 motion-safe:active:scale-[0.99] motion-reduce:transition-none md:min-h-[280px] md:py-8`}
              >
                <Image
                  src={icon}
                  width={160}
                  height={160}
                  alt={t(`signup.intent.cards.${key}.iconAlt`, lang)}
                  draggable={false}
                  className="mb-4 h-16 w-16 select-none object-contain transition-transform duration-[250ms] ease-out motion-safe:group-hover:scale-105 motion-reduce:transition-none md:mb-6 md:h-20 md:w-20"
                />
                <span className="text-xl font-bold tracking-[-0.01em] text-[var(--text-primary)] md:text-[22px]">
                  {label}
                </span>
                <p className="mt-2 max-w-[220px] text-[13px] font-normal leading-[1.5] text-[var(--text-muted)] md:text-sm">
                  {description}
                </p>
                {/* CTA hint — pushed to the card bottom (mt-auto), 24px min gap (pt-6). */}
                <span className="mt-auto inline-flex items-center gap-1 pt-6 text-[13px] font-semibold text-[var(--brand-accent)]">
                  {t(`signup.intent.cards.${key}.cta`, lang)}
                  <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? 'rotate-180' : ''}`} />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Already-registered fallback. */}
      <p
        className={`${display} mt-6 text-center text-[15px] font-medium text-[var(--text-muted)] md:mt-8`}
      >
        {t('signup.intent.alreadyAccount', lang)}{' '}
        <Link
          href="/connexion"
          className="rounded font-semibold text-[var(--brand-accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2"
        >
          {t('signup.intent.signInLink', lang)}
        </Link>
      </p>
    </AuthShell>
  )
}
