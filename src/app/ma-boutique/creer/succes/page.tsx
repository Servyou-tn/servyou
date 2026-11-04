import type { Metadata } from 'next'
import { localizedMetadata } from '@/lib/i18n/metadata'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, CircleCheckBig } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { FOCUS_RING } from '@/components/layout/styles'
import { getShellUser } from '@/lib/marche/shell-user'
import { resolveOwnedShopId } from '@/lib/shops/owner-shop'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata('meta.shop_created')
}

const ROUTE = '/ma-boutique/creer/succes'

// G2 success — Figma 556:38328/556:38330, measured in docs/design/g2-discovery.md §21-23.
//
// GUARD mirrors configuration/page.tsx:36-44 exactly (no `layout.tsx` exists under
// ma-boutique/creer to inherit a guard from — written explicitly here, same as configuration
// wrote its own). Shop existence is the only precondition: no shop → step 1 owns the right
// destination, same as every other route in this wizard.
//
// BOOKMARK/REVISIT is deliberately NOT prevented beyond the guard above (founder-ruled,
// g2-discovery.md §23): nothing on this page is sensitive or goes stale, and inventing a
// persisted "already seen this" flag would be a new pattern with no precedent anywhere in this
// wizard's three pages.
//
// D3 LINK — D3 shipped 2026-08-12 (`/boutique/[id]`, docs/follow-ups.md "D3 URL shape —
// RESOLVED"). "Voir ma boutique publique" is now a real `<Link>` to `/boutique/{shopId}`,
// closing the 4th of the four surfaces the founder tracked against this same root cause.
//
// SHELL — AppShell, INFERRED: the one `get_metadata` call did not expand the parent frame
// (556:38328), so shell-vs-chromeless was never measured. Chosen for consistency with step 1/2
// (both AppShell) and with E2 (`/demander/succes`), the closest content-shape precedent, which
// also renders inside AppShell rather than chromeless.
export default async function ShopCreatedPage() {
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(ROUTE)}`)

  const supabase = await createClient()
  const owned = await resolveOwnedShopId(supabase, shell.id)
  if (!owned.ok) {
    if (owned.reason === 'query_failed') {
      throw new Error('shop fetch failed while guarding /ma-boutique/creer/succes')
    }
    // No shop yet — step 1 owns the full consumer/shop_owner/freelancer branching.
    redirect('/ma-boutique/creer')
  }

  const lang = await getLang()

  const primaryLinkClasses = `inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand-blue-600 px-4 text-base font-semibold text-text-inverse transition-colors hover:bg-brand-blue-700 active:bg-brand-blue-800 sm:w-auto ${FOCUS_RING}`
  const secondaryLinkClasses = `inline-flex h-10 w-full items-center justify-center rounded-lg border border-border-strong bg-surface-base px-4 text-base font-semibold text-text-primary transition-colors hover:bg-surface-subtle active:bg-surface-sunken sm:w-auto ${FOCUS_RING}`

  return (
    <AppShell user={shell.topBarUser}>
      {/* Below lg (375 frame): the wizard's page header over the card — breadcrumb 14 Medium muted (gap 8, chevron 14),
          the page title 32 Bold / 38, the subtitle 14 secondary; the card 20 under it. The title is a <p>: the card's
          « … créé(e) ! » stays the page's one h1. */}
      <div className="mb-5 flex flex-col gap-2 lg:hidden">
        <nav aria-label="Fil d'Ariane">
          <ol className="flex items-center gap-2 text-sm font-medium text-text-muted">
            <li>
              <Link href="/devenir-vendeur" className={`rounded ${FOCUS_RING}`}>
                {t('shop.create.crumb_devenir', lang)}
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </li>
            <li>{t('shop.create.crumb_current', lang)}</li>
          </ol>
        </nav>
        <p className="text-[32px] font-bold leading-[38px] text-text-primary">{t('shop.create.page_title', lang)}</p>
        <p className="text-sm text-text-secondary">{t('shop.create.page_subtitle', lang)}</p>
      </div>
      <div className="flex justify-center">
        {/* No fill/stroke came back from get_metadata (geometry only) — card chrome borrowed
            from step 1/2's own box convention for wizard consistency, not measured. */}
        <div className="flex w-full max-w-[760px] flex-col items-center gap-4 rounded-card border border-border-subtle bg-surface-base p-8 text-center max-lg:gap-5 max-sm:px-4 max-sm:py-10 sm:p-12">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-success-50 max-lg:bg-success-100">
            <CircleCheckBig className="h-12 w-12 text-success-500" aria-hidden="true" />
          </span>

          <h1 className="text-2xl font-semibold leading-[30px] text-brand-blue-800 max-lg:font-bold max-lg:text-text-primary">
            {t('shop.create.succes.title', lang)}
          </h1>

          <p className="max-w-[420px] text-[15px] leading-6 text-text-muted max-lg:text-base max-lg:leading-[26px] max-lg:text-text-secondary">
            {t('shop.create.succes.subline', lang)}
          </p>

          <div className="mt-2 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Link href={`/boutique/${owned.shopId}`} className={secondaryLinkClasses}>
              {t('boutique.view_public', lang)}
            </Link>
            <Link href="/tableau-de-bord-vendeur" className={primaryLinkClasses}>
              {t('shop.create.succes.cta_dashboard', lang)}
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
