import type { Metadata } from 'next'
import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { FAQ_CATEGORIES, type ResolvedCategory } from '@/lib/faq/faq-content'
import { FaqView } from './FaqView'

export const metadata: Metadata = { title: 'Questions fréquentes — Servyou' }

export default async function FaqPage() {
  const lang = await getLang()

  // Resolve the key structure to display text once on the server; FaqView filters the
  // resolved text client-side.
  const categories: ResolvedCategory[] = FAQ_CATEGORIES.map((cat) => ({
    title: t(cat.titleKey, lang),
    questions: cat.questions.map((qa) => ({
      id: qa.qKey,
      q: t(qa.qKey, lang),
      a: t(qa.aKey, lang),
    })),
  }))

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      {/* Headline */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-5xl">
          {t('faq.headline', lang)}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[#6B6B6B]">{t('faq.subtitle', lang)}</p>
      </div>

      <div className="mt-10">
        <FaqView categories={categories} />
      </div>

      {/* Closing CTA */}
      <section className="mt-16 text-center">
        <p className="text-lg font-bold text-text-primary">{t('faq.cta.tagline', lang)}</p>
        <Link
          href="/contact"
          className={`mt-4 inline-flex h-12 items-center justify-center rounded-full bg-brand-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-primary ${FOCUS_RING}`}
        >
          {t('faq.cta.button', lang)}
        </Link>
      </section>
    </div>
  )
}
