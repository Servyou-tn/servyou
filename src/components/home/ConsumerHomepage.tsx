import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'
import { PageHeader } from '@/components/shared/PageHeader'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'

// / (logged-in consumer) — a thin landing, NOT a browse surface (founder ruling, PR
// feat/sidebar-marketplace-and-shell-migration: "/ stops being a browse surface. It becomes a
// thin landing pointing into the marketplace"). This used to BE the marketplace browse: a
// products/services grid switched by ?type=, wrapped in the legacy MarcheLayout with its own
// top-bar Produits/Services toggle. All of that is gone — the grid, the empty-state card, the
// type-switching, the MarcheLayout wrap. The sidebar's expandable Marketplace item is now the
// durable way into either engine, on every page, not just this one; this landing only needs to
// point a first-time visitor there once.
//
// INFERRED: no measured Figma frame exists for this card (the quota was exhausted before this PR;
// docs/follow-ups.md has the full note). Kept deliberately minimal — reused PageHeader + a single
// CARD_SHADOW card, no new visual pattern — rather than design a bespoke landing without a frame
// to build it against.
export function ConsumerHomepage({ user, lang }: { user: TopBarUser; lang: Lang }) {
  return (
    <AppShell user={user}>
      <PageHeader
        subtitle={t('page_header.accueil.subtitle', lang)}
        emphasisWord={t('page_header.accueil.emphasis', lang)}
      />
      <div className={`rounded-2xl bg-white p-8 text-center ${CARD_SHADOW}`}>
        <p className="mx-auto max-w-md text-body-sm text-text-muted">
          {t('home.landing.body', lang)}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/marche/produits"
            className={`inline-flex h-11 items-center rounded-[10px] bg-brand-blue-600 px-5 text-body-sm font-semibold text-white transition-colors hover:bg-brand-blue-600/90 ${FOCUS_RING}`}
          >
            {t('marche.toggle.find_products', lang)}
          </Link>
          <Link
            href="/marche/services"
            className={`inline-flex h-11 items-center rounded-[10px] border border-border-strong bg-white px-5 text-body-sm font-semibold text-text-primary transition-colors hover:border-text-muted ${FOCUS_RING}`}
          >
            {t('marche.toggle.find_services', lang)}
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
