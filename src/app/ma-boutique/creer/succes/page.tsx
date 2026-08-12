import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CircleCheckBig } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Button } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { getShellUser } from '@/lib/marche/shell-user'
import { resolveOwnedShopId } from '@/lib/shops/owner-shop'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Boutique créée — Servyou' }

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
// D3 LINK — ruled 2026-08-12 (docs/follow-ups.md, 4th entry against the tableau-de-bord-vendeur
// 🔴): "Voir ma boutique publique" ships `disabled`, matching D1/C1's non-live treatment. The G4
// dashboard's live `/boutique/{id}` link is a known bug, not a precedent to extend.
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

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex justify-center">
        {/* No fill/stroke came back from get_metadata (geometry only) — card chrome borrowed
            from step 1/2's own box convention for wizard consistency, not measured. */}
        <div className="flex w-full max-w-[760px] flex-col items-center gap-4 rounded-card border border-border-subtle bg-surface-base p-8 text-center sm:p-12">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-success-50">
            <CircleCheckBig className="h-12 w-12 text-success-500" aria-hidden="true" />
          </span>

          <h1 className="text-2xl font-semibold leading-[30px] text-brand-blue-800">
            {t('shop.create.succes.title', lang)}
          </h1>

          <p className="max-w-[420px] text-[15px] leading-6 text-text-muted">
            {t('shop.create.succes.subline', lang)}
          </p>

          <div className="mt-2 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            {/* disabled removes it from the tab order (expected for a dead action), but the
                "why" must still be perceivable, not only a hover-only title — same fix
                ProduitsLensToggle.tsx already applies: aria-disabled + a visible badge inside
                the accessible name, per accessibility.md's Button spec ("aria-disabled when
                disabled"). */}
            <Button
              variant="secondary"
              size="md"
              disabled
              aria-disabled="true"
              title={t('shop.create.succes.view_shop_soon', lang)}
              className="w-full sm:w-auto"
            >
              {t('boutique.view_public', lang)}
              <span className="rounded-full bg-brand-blue-100 px-1.5 py-0.5 text-caption font-semibold text-brand-blue-600">
                {t('shop.create.succes.view_shop_soon', lang)}
              </span>
            </Button>
            <Link href="/tableau-de-bord-vendeur" className={primaryLinkClasses}>
              {t('shop.create.succes.cta_dashboard', lang)}
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
