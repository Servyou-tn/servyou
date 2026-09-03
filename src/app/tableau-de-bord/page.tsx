import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Briefcase,
  Handshake,
  Compass,
  Inbox,
  Eye,
  Users,
  Store as StoreIcon,
  Search,
  User,
  ShoppingBag,
  Package,
  Plus,
} from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { requireFreelancer } from '@/lib/auth/require-seller'
import { getFreelancerDashboard, VUES_DU_PROFIL } from '@/lib/marche/freelancer-dashboard'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { StatTile } from './_components/StatTile'
import { Panel, PanelEmpty } from './_components/Panel'
import { MissionRow } from './_components/MissionRow'
import { ActiviteRecente } from './_components/ActiviteRecente'
import { ForceDuProfil } from './_components/ForceDuProfil'

export const metadata: Metadata = { title: 'Tableau de bord — Servyou' }

const ROUTE = '/tableau-de-bord'

// H4 « Tableau de bord freelance » — Figma 166:12086. Full provenance (measured / re-verified /
// founder-ruled, per field) lives in docs/design/h4-discovery.md; read that file before changing
// any mapping here rather than re-deriving it from this page.
//
// Content order, oldest-established fact first: header -> stats (4 tiles) -> Ecosystem widget ->
// Missions récentes -> twoCol[ leftCol(Activité récente, Actions rapides) | rightCol(Force du
// profil) ]. "Votre parcours" keeps its vues > 0 gate (Ruling 1) — vues is permanently 0, so it
// never renders; deliberately absent from this JSX, not a hidden/empty placeholder.

export default async function TableauDeBordPage() {
  const lang = await getLang()
  const { topBarUser, freelancerProfile } = await requireFreelancer(ROUTE)
  const data = await getFreelancerDashboard(
    topBarUser.id,
    freelancerProfile?.id ?? null,
    topBarUser.avatar_url ?? null,
  )

  // "Créer un service" has no destination (/mes-services has no /ajouter subroute — H6 never
  // shipped in code) — href: null renders an inert chip rather than a Link to a 404, same rule
  // as the header CTA above. "Voir mes commandes" would carry a count badge per the founder's
  // spec, but that count is the freelancer's OWN purchase history (orders where THEY are the
  // buyer) — a dataset this page has never queried and this pass adds no new query, so the badge
  // is omitted here and flagged in the report rather than fabricated.
  const quickActions = [
    { key: 'freelance.dashboard.createService', href: null, icon: Plus },
    { key: 'shell.sidebar.findMissions', href: '/trouver-des-missions', icon: Compass },
    { key: 'freelance.dashboard.quick.buyProducts', href: '/marche/produits', icon: ShoppingBag },
    { key: 'freelance.dashboard.quick.myOrders', href: '/mes-commandes', icon: Package },
  ] as const

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6 lg:gap-8">
        {/* ── Header ─────────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 text-text-primary">{t('freelance.dashboard.title', lang)}</h1>
            <p className="text-body-sm text-text-secondary">{t('freelance.dashboard.subline', lang)}</p>
          </div>
          {/* INERT — no route exists to create a service yet (/mes-services has no /ajouter
              subroute; H6 never shipped in code). A real Link here would 404. Flagged in the PR
              report; flip to a Link the moment that route lands. */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex h-10 w-fit shrink-0 cursor-not-allowed items-center justify-center gap-2 self-start rounded-lg bg-brand-blue-600/40 px-4 text-base font-semibold text-text-inverse opacity-70 sm:self-auto"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('freelance.dashboard.createService', lang)}
          </button>
        </div>

        {!freelancerProfile ? (
          // A freelancer (seller_type='freelancer') who never finished H2 step 1 — a real state,
          // parallel to G4's `!shop` panel. Only H2 can fix it, so this page does not crash or
          // render silent zeros for the profile-dependent tiles; it says so and points there.
          <Panel title={t('freelance.dashboard.noProfile.title', lang)}>
            <p className="text-body text-text-secondary">{t('freelance.dashboard.noProfile.body', lang)}</p>
            <Link
              href="/mon-profil-freelance/creer"
              className={`mt-2 inline-flex h-10 w-fit items-center justify-center rounded-lg bg-brand-blue-600 px-4 text-base font-semibold text-text-inverse transition-colors hover:bg-brand-blue-700 active:bg-brand-blue-800 motion-reduce:transition-none ${FOCUS_RING}`}
            >
              {t('freelance.dashboard.noProfile.cta', lang)}
            </Link>
          </Panel>
        ) : null}

        {/* ── Stat row — 4 tiles, none carry a delta (docs/design/h4-discovery.md §1) ──────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={t('freelance.dashboard.tile.services', lang)}
            value={String(data.servicesActifs)}
            subtitle={t('freelance.dashboard.tile.services_sub', lang)}
            icon={Briefcase}
            accent="neutral"
          />
          <StatTile
            label={t('freelance.dashboard.tile.engagements', lang)}
            value={String(data.engagementsActifs)}
            subtitle={t('freelance.dashboard.tile.engagements_sub', lang)}
            icon={Handshake}
            accent="indigo"
          />
          <StatTile
            label={t('freelance.dashboard.tile.pending', lang)}
            value={String(data.demandesEnAttente)}
            subtitle={t('freelance.dashboard.tile.pending_sub', lang)}
            icon={Inbox}
            accent="blue"
          />
          {/* Vues du profil — Ruling 1: renders 0, no delta, no table, no write path, nothing
              seeded. `muted` so the "0" reads as an honest unmeasured state, not a fact. */}
          <StatTile
            label={t('freelance.dashboard.tile.views', lang)}
            value={String(VUES_DU_PROFIL)}
            subtitle=""
            icon={Eye}
            accent="blue"
            muted
          />
        </div>

        {/* ── Ecosystem widget — 3 equal-width cards. Colours are the existing v2 semantic
            tokens (success/warning) plus brand-blue for the filled middle card; nothing new. ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card A — consumers, success/green surface. Link target: the closest existing
              surface showing the freelancer's relationship to consumers (their own engagements);
              no dedicated "demandes" list route exists to link more precisely. */}
          <div className="flex flex-col gap-3 rounded-xl border border-success-100 bg-success-50 p-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-[28px] font-bold leading-[normal] text-text-primary">
              {data.ecosystem.consumers}
            </p>
            <div className="flex flex-col gap-1">
              <p className="text-body-sm font-semibold text-text-primary">
                {t('ecosysteme.consumers_label', lang)}
              </p>
              <p className="text-body-sm text-text-secondary">{t('ecosysteme.consumers_sub', lang)}</p>
            </div>
            <Link
              href="/mes-engagements"
              className={`mt-auto w-fit rounded text-body-sm font-medium text-success-700 hover:underline ${FOCUS_RING}`}
            >
              {t('ecosysteme.consumers_link', lang)}
            </Link>
          </div>

          {/* Card B — the freelancer's own card, filled brand-blue, white text/button. */}
          <div className="flex flex-col gap-3 rounded-xl bg-brand-blue-600 p-6 text-text-inverse">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              <User className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-body font-bold">{t('ecosysteme.you_title', lang)}</p>
              <p className="text-body-sm text-white/90">{t('ecosysteme.you_body', lang)}</p>
            </div>
            <Link
              href="/mes-services"
              className={`mt-auto inline-flex h-9 w-fit items-center justify-center rounded-lg bg-white px-4 text-body-sm font-semibold text-brand-blue-700 transition-colors hover:bg-white/90 ${FOCUS_RING}`}
            >
              {t('shell.sidebar.services', lang)}
            </Link>
          </div>

          {/* Card C — shops, warning/amber surface. Link target: /marche/produits, the real
              route that carries the Produits/Boutiques toggle — not investigated deep enough to
              force the Boutiques tab specifically via a query param, flagged in the report. */}
          <div className="flex flex-col gap-3 rounded-xl border border-warning-100 bg-warning-50 p-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-100 text-warning-700">
              <StoreIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-[28px] font-bold leading-[normal] text-text-primary">
              {data.ecosystem.shops}
            </p>
            <div className="flex flex-col gap-1">
              <p className="text-body-sm font-semibold text-text-primary">
                {t('ecosysteme.shops_label', lang)}
              </p>
              <p className="text-body-sm text-text-secondary">{t('ecosysteme.shops_sub', lang)}</p>
            </div>
            <Link
              href="/marche/produits"
              className={`mt-auto w-fit rounded text-body-sm font-medium text-warning-700 hover:underline ${FOCUS_RING}`}
            >
              {t('ecosysteme.shops_link', lang)}
            </Link>
          </div>
        </div>

        {/* ── Missions récentes — kept linked to /trouver-des-missions: a real route (a
            ComingSoon stub today), not a missing one — see the link-destination rule in
            docs/design/h4-discovery.md §4. ───────────────────────────────────────────────── */}
        <Panel
          title={t('freelance.dashboard.missions.title', lang)}
          link={{ href: '/trouver-des-missions', label: t('freelance.dashboard.missions.link', lang) }}
        >
          {data.missions.length === 0 ? (
            <PanelEmpty
              icon={Search}
              title={t('freelance.dashboard.missions.empty_title', lang)}
              body={t('freelance.dashboard.missions.empty_body', lang)}
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border-subtle">
              {data.missions.map((m) => (
                <MissionRow key={m.id} mission={m} lang={lang} />
              ))}
            </ul>
          )}
        </Panel>

        {/* ── twoCol: leftCol(Activité récente, Actions rapides) | rightCol(Force du profil) ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <ActiviteRecente items={data.activite} lang={lang} />

            <Panel title={t('freelance.dashboard.quick.title', lang)}>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {quickActions.map((a) => {
                  const chip = (
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-blue-50">
                      <a.icon className="h-5 w-5 text-brand-blue-600" aria-hidden="true" />
                      {/* Count badge — spec'd on "Voir mes commandes" but no query for it exists
                          in this pass (see the quickActions comment above); slot kept empty
                          rather than filled with an invented number. */}
                    </span>
                  )
                  const label = (
                    <span className="text-center text-body-sm text-text-primary">{t(a.key, lang)}</span>
                  )
                  return (
                    <li key={a.key} className="flex">
                      {a.href ? (
                        <Link
                          href={a.href}
                          className={`flex flex-1 flex-col items-center gap-2 rounded-lg py-2 transition-colors hover:bg-surface-sunken ${FOCUS_RING}`}
                        >
                          {chip}
                          {label}
                        </Link>
                      ) : (
                        // INERT — see the quickActions comment above (no /mes-services/ajouter route).
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          className="flex flex-1 cursor-not-allowed flex-col items-center gap-2 rounded-lg py-2 opacity-60"
                        >
                          {chip}
                          {label}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Panel>
          </div>

          <ForceDuProfil checklist={data.checklist} lang={lang} />
        </div>
      </div>
    </AppShell>
  )
}
