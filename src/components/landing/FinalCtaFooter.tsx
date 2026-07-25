import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { Footer } from '@/components/layout/Footer'
import { ArrowRightIcon } from './icons'

// Section 8 — the emotional closing CTA (white block) followed by the shared navy
// Footer that closes the page. The footer was extracted to components/layout/Footer so
// the (marketing) content pages can reuse it; the landing's composition is unchanged.
export function FinalCtaFooter({ lang }: { lang: Lang }) {
  return (
    <>
      {/* Closing CTA — white block, centered, emotional anchor line. */}
      <section className="bg-surface-base">
        <div className="mx-auto max-w-3xl px-6 py-28 text-center">
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-text-primary">
            {t('landing.final.heading', lang)}
          </h2>
          <p className="mx-auto mt-5 max-w-[560px] text-lg leading-relaxed text-text-muted">
            {t('landing.final.subtitle', lang)}
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              href="/inscription"
              className={`inline-flex h-14 items-center gap-2 rounded-full bg-brand-blue-600 px-8 text-base font-semibold text-white transition-all hover:scale-[1.02] hover:bg-brand-blue-800 ${FOCUS_RING}`}
            >
              {t('landing.hero.cta_primary', lang)}
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
          <p className="mt-5 text-sm font-medium text-text-muted">{t('landing.final.trust', lang)}</p>
        </div>
      </section>

      <Footer lang={lang} />
    </>
  )
}
