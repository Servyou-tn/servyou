import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Briefcase,
  FileCheck2,
  Package,
  Eye,
  Users,
  User,
  Store as StoreIcon,
  Search,
  ShoppingBag,
  Plus,
} from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { requireFreelancer } from '@/lib/auth/require-seller'
import { getFreelancerDashboard, VUES_DU_PROFIL } from '@/lib/marche/freelancer-dashboard'
import { getLang } from '@/lib/i18n/server'
import { t, tn } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { StatTile } from './_components/StatTile'
import { Panel, PanelEmpty } from './_components/Panel'
import { MissionRow } from './_components/MissionRow'
import { ActiviteRecente } from './_components/ActiviteRecente'
import { ForceDuProfil } from './_components/ForceDuProfil'

export const metadata: Metadata = { title: 'Tableau de bord — Servyou' }

const ROUTE = '/tableau-de-bord'

// H4 « Tableau de bord freelance » — Figma 166:12086. Full provenance (measured / re-verified /
// founder-ruled, per field) lives in docs/design/h4-discovery.md, including §9 — a direct figma-
// cli CDP re-measurement that superseded several details this file used to get wrong (icon/colour
// pairings, spacing, the Ecosystem widget's structure). Read that file before changing a mapping
// here rather than re-deriving it from this page.
//
// Content order, oldest-established fact first: header -> stats (4 tiles) -> Ecosystem widget ->
// Missions récentes -> twoCol[ leftCol(Activité récente, Actions rapides) | rightCol(Force du
// profil) ]. "Votre parcours" keeps its vues > 0 gate (Ruling 1) — vues is permanently 0, so it
// never renders; deliberately absent from this JSX, not a hidden/empty placeholder — regardless of
// what the Figma frame itself seeds (it draws both fully, on 342-vues sample data).

export default async function TableauDeBordPage() {
  const lang = await getLang()
  const { topBarUser, freelancerProfile } = await requireFreelancer(ROUTE)
  const data = await getFreelancerDashboard(
    topBarUser.id,
    freelancerProfile?.id ?? null,
    topBarUser.avatar_url ?? null,
  )
  const firstName = (topBarUser.full_name ?? '').trim().split(/\s+/)[0] ?? ''

  // "Créer un service" has no destination (/mes-services has no /ajouter subroute — H6 never
  // shipped in code) — href: null renders an inert chip rather than a Link to a 404. "Voir mes
  // commandes" carries a real count badge (h4-discovery.md §9): the freelancer's own active
  // purchases (orders where THEY are the buyer), a genuinely new query added this pass since a
  // badge that never renders is a hole, not a scope violation.
  const quickActions = [
    { key: 'freelance.dashboard.createService', href: null, icon: Plus, badge: null },
    { key: 'shell.sidebar.findMissions', href: '/trouver-des-missions', icon: Search, badge: null },
    { key: 'freelance.dashboard.quick.buyProducts', href: '/marche/produits', icon: ShoppingBag, badge: null },
    {
      key: 'freelance.dashboard.quick.myOrders',
      href: '/mes-commandes',
      icon: Package,
      // Hidden at zero — no measured spec for the empty state, but a "0" badge is noise;
      // mirrors G4's own "count chip hidden at zero" convention (tableau-de-bord-vendeur).
      badge: data.activePurchasesCount > 0 ? data.activePurchasesCount : null,
    },
  ] as const

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        {/* ── Header — 📐 measured title/subtitle (h4-discovery.md §9), name interpolated. ──── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 text-text-primary">
              {t('freelance.dashboard.title', lang, { firstName })}
            </h1>
            <p className="text-body-sm text-text-secondary">{t('freelance.dashboard.subline', lang)}</p>
          </div>
          {/* INERT — no route exists to create a service yet (/mes-services has no /ajouter
              subroute; H6 never shipped in code). A real Link here would 404. Flip to a Link the
              moment that route lands. */}
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

        {/* ── Stat row — 272×159, pad 20, gap 12 (StatTile.tsx). Icon/colour per tile is
            📐 MEASURED (h4-discovery.md §9): services=blue, engagements=success, pending=warning,
            views=blue. None carry a delta. ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={t('freelance.dashboard.tile.services', lang)}
            value={String(data.servicesActifs)}
            subtitle={t('freelance.dashboard.tile.services_sub', lang)}
            icon={Briefcase}
            accent="blue"
          />
          <StatTile
            label={t('freelance.dashboard.tile.engagements', lang)}
            value={String(data.engagementsActifs)}
            subtitle={t('freelance.dashboard.tile.engagements_sub', lang)}
            icon={FileCheck2}
            accent="success"
          />
          <StatTile
            label={t('freelance.dashboard.tile.pending', lang)}
            value={String(data.demandesEnAttente)}
            subtitle={t('freelance.dashboard.tile.pending_sub', lang)}
            icon={Package}
            accent="warning"
          />
          {/* Vues du profil — Ruling 1: renders 0, no delta, no table, no write path, nothing
              seeded, regardless of the frame's own 342/↑18% seed. `muted` so the "0" reads as an
              honest unmeasured state, not a fact. */}
          <StatTile
            label={t('freelance.dashboard.tile.views', lang)}
            value={String(VUES_DU_PROFIL)}
            subtitle=""
            icon={Eye}
            accent="blue"
            muted
          />
        </div>

        {/* ── Ecosystem widget — ONE outer panel (1136×251, 20px padding) wrapping a row of
            [card, 48px connector, card, connector, card]. The inner cards carry NO border of
            their own — only this wrapper does. 📐 measured, h4-discovery.md §9. ─────────────── */}
        <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-5 sm:flex-row">
          {/* Card A — consumers. Chip glyph unmeasured (CLI couldn't resolve the nested instance
              ID) — Users is a best-reading choice, flagged per the founder's instruction not to
              spend another bridge call on it. Link target: the closest existing surface showing
              the freelancer's relationship to consumers; no dedicated "demandes" list route
              exists to link more precisely. */}
          <div className="flex min-h-[198px] flex-1 flex-col gap-2.5 rounded-xl bg-success-50 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-600">
              <Users className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            {/* tn(), not a plain key — reuses the already-correct one/other pluralization
                ("1 consommateur" / "24 consommateurs") rather than inventing a second string for
                the same count+noun shape the frame draws as one line. */}
            <p className="text-body font-bold text-text-primary">
              {tn('ecosysteme.consumers_count', lang, data.ecosystem.consumers)}
            </p>
            <p className="text-body-sm text-text-secondary">{t('ecosysteme.consumers_sub', lang)}</p>
            <div className="flex-1" aria-hidden="true" />
            <Link
              href="/mes-engagements"
              className={`w-fit rounded text-body-sm font-semibold text-success-700 hover:underline ${FOCUS_RING}`}
            >
              {t('ecosysteme.consumers_link', lang)}
            </Link>
          </div>

          {/* Connector — a 48px zone with a centered horizontal line, not a plain gap. */}
          <div className="hidden w-12 shrink-0 items-center justify-center sm:flex" aria-hidden="true">
            <div className="h-0.5 w-10 bg-border-strong" />
          </div>

          {/* Card B — the freelancer's own card, filled brand-blue. Chip glyph unmeasured; User
              (a person) is the best-reading choice for "Vous", flagged. */}
          <div className="flex min-h-[211px] flex-1 flex-col gap-2.5 rounded-xl bg-brand-blue-600 p-5 text-text-inverse">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white">
              <User className="h-5 w-5 text-brand-blue-600" aria-hidden="true" />
            </span>
            <p className="text-body font-bold">{t('ecosysteme.you_title', lang)}</p>
            <p className="text-body-sm text-brand-blue-100">{t('ecosysteme.you_body', lang)}</p>
            <div className="flex-1" aria-hidden="true" />
            <Link
              href="/mes-services"
              className={`inline-flex h-10 w-fit items-center justify-center rounded-lg border border-border-strong bg-white px-4 text-body-sm font-semibold text-brand-blue-700 transition-colors hover:bg-white/90 ${FOCUS_RING}`}
            >
              {t('shell.sidebar.services', lang)}
            </Link>
          </div>

          <div className="hidden w-12 shrink-0 items-center justify-center sm:flex" aria-hidden="true">
            <div className="h-0.5 w-10 bg-border-strong" />
          </div>

          {/* Card C — shops. Chip glyph unmeasured; Store is the best-reading choice, flagged.
              Link target: /marche/produits, the real route that carries the Produits/Boutiques
              toggle — not investigated deep enough to force the Boutiques tab via a query param. */}
          <div className="flex min-h-[198px] flex-1 flex-col gap-2.5 rounded-xl bg-warning-50 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-500">
              <StoreIcon className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <p className="text-body font-bold text-text-primary">
              {tn('ecosysteme.shops_count', lang, data.ecosystem.shops)}
            </p>
            <p className="text-body-sm text-text-secondary">{t('ecosysteme.shops_sub', lang)}</p>
            <div className="flex-1" aria-hidden="true" />
            <Link
              href="/marche/produits"
              className={`w-fit rounded text-body-sm font-semibold text-warning-700 hover:underline ${FOCUS_RING}`}
            >
              {t('ecosysteme.shops_link', lang)}
            </Link>
          </div>
        </div>

        {/* ── Missions récentes — 📐 title measured (h4-discovery.md §9). Kept linked to
            /trouver-des-missions: a real route (a ComingSoon stub today), not a missing one. ── */}
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
              {/* 56px chip / 24px glyph / bg-brand-blue-100, 📐 measured (h4-discovery.md §9). */}
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {quickActions.map((a) => {
                  const chip = (
                    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-blue-100">
                      <a.icon className="h-6 w-6 text-brand-blue-600" aria-hidden="true" />
                      {a.badge != null ? (
                        <span
                          className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue-600 px-1 text-caption font-semibold text-text-inverse"
                          aria-hidden="true"
                        >
                          {a.badge}
                        </span>
                      ) : null}
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
