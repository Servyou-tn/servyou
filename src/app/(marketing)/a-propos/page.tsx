import type { Metadata } from 'next'
import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

export const metadata: Metadata = { title: 'À propos — Servyou' }

const VALUES = [
  { n: '01', title: 'about.values.v1.title', body: 'about.values.v1.body' },
  { n: '02', title: 'about.values.v2.title', body: 'about.values.v2.body' },
  { n: '03', title: 'about.values.v3.title', body: 'about.values.v3.body' },
] as const

const STORY = ['about.story.p1', 'about.story.p2', 'about.story.p3', 'about.story.p4'] as const

export default async function AProposPage() {
  const lang = await getLang()

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      {/* Headline */}
      <div className="text-center">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-text-primary md:text-5xl">
          {t('about.headline', lang)}
        </h1>
        <p className="mt-4 text-lg text-text-muted">{t('about.subtitle', lang)}</p>
      </div>

      {/* Story (founder voice) */}
      <div className="mt-12 space-y-6">
        {STORY.map((key) => (
          <p key={key} className="text-base leading-relaxed text-text-primary md:text-lg">
            {t(key, lang)}
          </p>
        ))}
      </div>

      {/* Values */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
          {t('about.values.heading', lang)}
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.n} className="rounded-2xl border border-border-subtle bg-white p-6">
              <span className="text-2xl font-bold text-brand-blue-600">{v.n}</span>
              <h3 className="mt-3 text-base font-bold text-text-primary">{t(v.title, lang)}</h3>
              <p className="mt-2 text-body-sm leading-relaxed text-text-muted">{t(v.body, lang)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mt-20 text-center">
        <p className="text-xl font-bold text-text-primary md:text-2xl">{t('about.cta.tagline', lang)}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/inscription"
            className={`inline-flex h-12 items-center justify-center rounded-full bg-brand-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-800 ${FOCUS_RING}`}
          >
            {t('about.cta.primary', lang)}
          </Link>
          <Link
            href="/contact"
            className={`inline-flex h-12 items-center justify-center rounded-full border border-border-subtle bg-white px-6 text-sm font-semibold text-text-primary transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
          >
            {t('about.cta.secondary', lang)}
          </Link>
        </div>
      </section>
    </div>
  )
}
