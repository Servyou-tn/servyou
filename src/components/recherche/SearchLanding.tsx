import Link from 'next/link'
import { Search } from 'lucide-react'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// The bare-/recherche landing block (no query, no filters). NOT a browse grid — the two
// marketplaces (/marche/produits, /marche/services) own browse-by-default now, so /recherche
// is search-specific: prompt the user to type above, or send them to a marketplace.
export function SearchLanding({ lang }: { lang: Lang }) {
  const primary = `inline-flex items-center justify-center rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent/90 ${FOCUS_RING}`
  const secondary = `inline-flex items-center justify-center rounded-full border border-border-subtle bg-white px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-slate-50 ${FOCUS_RING}`

  return (
    <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
      <div className="mx-auto max-w-md">
        <Search className="mx-auto h-10 w-10 text-[#B8B8B8]" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold text-text-primary">{t('search.landing.title', lang)}</h1>
        <p className="mt-2 text-[13px] text-text-muted">{t('search.landing.subtitle', lang)}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/marche/produits" className={primary}>
            {t('search.landing.browseProducts', lang)}
          </Link>
          <Link href="/marche/services" className={secondary}>
            {t('search.landing.browseServices', lang)}
          </Link>
        </div>
      </div>
    </div>
  )
}
