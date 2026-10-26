import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertCircle, Compass, Info, X } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Pagination } from '@/components/shared/Pagination'
import { MissionCard } from '@/components/missions/MissionCard'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { requireFreelancer } from '@/lib/auth/require-seller'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t, tn } from '@/lib/i18n'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { MAX_ACTIVE_RESPONSES_PER_FREELANCER } from '@/lib/job-constants'
import { cn } from '@/lib/utils'
import {
  BUDGET_BUCKETS,
  buildMissionsHref,
  MISSION_SORTS,
  MISSIONS_PER_PAGE,
  parseMissionParams,
} from '@/lib/marche/missions'
import { getMissionBoard, getMyProfileSkills, getServiceSectors } from '@/lib/marche/missions-query'
import { MissionSelect } from './_components/MissionSelect'
import { RemoteToggle } from './_components/RemoteToggle'

export const metadata: Metadata = { title: 'Trouver des missions — Servyou' }

const ROUTE = '/trouver-des-missions'

// H9 « Trouver des missions » — Figma 311:10534, measured in docs/design/h9-h13-measurements.md §1 (PR-1 of the
// outbound-mission series: this board + H10 detail; the proposal form H12/H13 and H11 follow). Until now this
// route was a ComingSoon placeholder.
//
// Architect rulings applied (§10.2): D-H9-1 chip start-aligned · D-H9-2 no « /mois » · D-H9-3 the board hides my
// own posts, posts I already answered, full (10/10), expired and moderated ones · D-H9-4 filter option sets ·
// D-H9-5 sort options · D-H9-6 « Nouveau » < 48 h · D-H9-7 12 per page.
// ⚑ NO MOBILE FRAME — below `xl` the grid (3 → 2 → 1 across) and the filter stack are derived.
export default async function TrouverDesMissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const lang = await getLang()
  const { userId, topBarUser, freelancerProfile } = await requireFreelancer(ROUTE)
  const supabase = await createClient()

  const [sectors, mySkills] = await Promise.all([
    getServiceSectors(supabase),
    freelancerProfile ? getMyProfileSkills(supabase, freelancerProfile.id) : Promise.resolve([] as string[]),
  ])

  const parsed = parseMissionParams(sp)
  // An unknown category slug is dropped rather than filtering to nothing.
  const sector = parsed.categorie ? sectors.find((s) => s.slug === parsed.categorie) : undefined
  const filters = { ...parsed, categorie: sector?.slug ?? null }

  const board = await getMissionBoard(userId, filters, sector?.id ?? null)

  const href = (patch: Parameters<typeof buildMissionsHref>[2] = {}) => buildMissionsHref(ROUTE, filters, patch)
  const sectorName = (s: { nameFr: string; nameAr: string }) => (lang === 'ar' ? s.nameAr : s.nameFr)
  const cityLabel = (value: string) => {
    const g = GOVERNORATES.find((x) => x.value === value)
    return g ? (lang === 'ar' ? g.ar : g.fr) : value
  }

  const chips: { key: string; label: string; removeHref: string }[] = []
  if (sector) chips.push({ key: 'categorie', label: t('missionboard.chip.category', lang, { value: sectorName(sector) }), removeHref: href({ categorie: null }) })
  if (filters.ville) chips.push({ key: 'ville', label: t('missionboard.chip.city', lang, { value: cityLabel(filters.ville) }), removeHref: href({ ville: null }) })
  if (filters.budget) chips.push({ key: 'budget', label: t('missionboard.chip.budget', lang, { value: t(`missionboard.budget.${filters.budget}`, lang) }), removeHref: href({ budget: null }) })
  if (filters.competence) chips.push({ key: 'competence', label: t('missionboard.chip.skill', lang, { value: filters.competence }), removeHref: href({ competence: null }) })
  if (filters.teletravail) chips.push({ key: 'teletravail', label: t('missionboard.chip.remote', lang), removeHref: href({ teletravail: false }) })

  const atCap = board.activeResponses >= MAX_ACTIVE_RESPONSES_PER_FREELANCER
  const noProfile = !freelancerProfile

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        {/* ── page-header (311:10539): H1 32 Bold over a 16 muted line, the live count on the right ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 text-text-primary">{t('missionboard.title', lang)}</h1>
            <p className="text-body text-text-muted">{t('missionboard.subtitle', lang)}</p>
          </div>
          <p className="text-body font-semibold text-brand-blue-600">{tn('missionboard.count', lang, board.totalAvailable)}</p>
        </div>

        {/* ── awareness-bar (311:10812): blue/50, radius md, px 16 / py 12. At the 5-proposal cap it flips to the
             warning wording of spec 331:11979; with no freelancer profile it points at the profile instead. ── */}
        <div
          className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md px-4 py-3 ${
            atCap && !noProfile ? 'bg-warning-50' : 'bg-brand-blue-50'
          }`}
        >
          <p
            className={`flex items-center gap-2 text-body-sm font-medium ${
              atCap && !noProfile ? 'text-warning-700' : 'text-text-secondary'
            }`}
          >
            {atCap && !noProfile ? (
              <AlertCircle className="size-5 shrink-0 text-warning-700" aria-hidden="true" />
            ) : (
              <Info className="size-5 shrink-0 text-brand-blue-600" aria-hidden="true" />
            )}
            {noProfile
              ? t('missionboard.profile_missing', lang)
              : atCap
                ? t('missionboard.awareness_full', lang, { max: MAX_ACTIVE_RESPONSES_PER_FREELANCER })
                : tn('missionboard.awareness', lang, board.activeResponses, { max: MAX_ACTIVE_RESPONSES_PER_FREELANCER })}
          </p>
          <Link
            href={noProfile ? '/devenir-freelance' : '/mes-propositions'}
            className={`rounded-sm text-body-sm font-semibold text-brand-blue-600 hover:underline ${FOCUS_RING}`}
          >
            {noProfile ? t('missionboard.profile_missing_link', lang) : t('missionboard.awareness_link', lang)}
          </Link>
        </div>

        {/* ── filter-bar (311:10820): 4 selects (FILL, h 44) + the télétravail toggle ── */}
        <div
          role="group"
          aria-label={t('missionboard.filters_aria', lang)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:flex xl:items-center"
        >
          <MissionSelect
            className="xl:flex-1"
            label={t('missionboard.filter.category', lang)}
            placeholder={t('missionboard.filter.category', lang)}
            value={sector?.slug ?? null}
            allOption={{ label: t('missionboard.filter.all_category', lang), href: href({ categorie: null }) }}
            options={sectors.map((s) => ({ value: s.slug, label: sectorName(s), href: href({ categorie: s.slug }) }))}
          />
          <MissionSelect
            className="xl:flex-1"
            label={t('missionboard.filter.city', lang)}
            placeholder={t('missionboard.filter.city', lang)}
            value={filters.ville}
            allOption={{ label: t('missionboard.filter.all_city', lang), href: href({ ville: null }) }}
            options={GOVERNORATES.map((g) => ({ value: g.value, label: lang === 'ar' ? g.ar : g.fr, href: href({ ville: g.value }) }))}
          />
          <MissionSelect
            className="xl:flex-1"
            label={t('missionboard.filter.budget', lang)}
            placeholder={t('missionboard.filter.budget', lang)}
            value={filters.budget}
            allOption={{ label: t('missionboard.filter.all_budget', lang), href: href({ budget: null }) }}
            options={BUDGET_BUCKETS.map((b) => ({ value: b, label: t(`missionboard.budget.${b}`, lang), href: href({ budget: b }) }))}
          />
          <MissionSelect
            className="xl:flex-1"
            label={t('missionboard.filter.skills', lang)}
            placeholder={t('missionboard.filter.skills', lang)}
            value={filters.competence}
            disabled={mySkills.length === 0 && !filters.competence}
            allOption={{ label: t('missionboard.filter.all_skills', lang), href: href({ competence: null }) }}
            options={mySkills.map((s) => ({ value: s, label: s, href: href({ competence: s }) }))}
          />
          <RemoteToggle
            checked={filters.teletravail}
            label={t('missionboard.filter.remote', lang)}
            hrefOn={href({ teletravail: true })}
            hrefOff={href({ teletravail: false })}
          />
        </div>

        {/* ── sort-row (311:10871): active-filter chips ⟷ « Trier par » (FIXED 200) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ul className="flex min-w-0 flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <li key={chip.key}>
                <Link
                  href={chip.removeHref}
                  aria-label={t('missionboard.chip.remove', lang, { label: chip.label })}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full bg-brand-blue-50 py-1 ps-3 pe-2 text-body-sm font-medium text-brand-blue-600',
                    FOCUS_RING,
                  )}
                >
                  {chip.label}
                  <X className="size-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <MissionSelect
            className="w-full sm:w-[200px]"
            label={t('missionboard.sort_aria', lang)}
            placeholder={t('missionboard.sort.recent', lang)}
            alwaysSelected
            value={filters.tri === 'recent' ? null : filters.tri}
            allOption={{ label: t('missionboard.sort.recent', lang), href: href({ tri: 'recent' }) }}
            options={MISSION_SORTS.filter((s) => s !== 'recent').map((s) => ({
              value: s,
              label: t(`missionboard.sort.${s}`, lang),
              href: href({ tri: s }),
            }))}
          />
        </div>

        {/* ── mission-grid (311:10894) ── */}
        {board.missions.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-surface-base px-10 py-12 text-center">
            <span className="flex size-28 items-center justify-center rounded-full bg-surface-pill">
              <Compass className="size-16 text-icon-muted" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-2">
              <p className="text-h3 text-text-primary">
                {board.totalAvailable === 0 ? t('missionboard.empty_none_title', lang) : t('missionboard.empty_filtered_title', lang)}
              </p>
              <p className="text-body text-text-secondary">
                {board.totalAvailable === 0 ? t('missionboard.empty_none_body', lang) : t('missionboard.empty_filtered_body', lang)}
              </p>
            </div>
            {board.totalAvailable > 0 && chips.length > 0 ? (
              <Link href={ROUTE} className={cn(BUTTON_BASE, BUTTON_SIZE.md, VARIANT_BASE.secondary, VARIANT_STATE.secondary)}>
                {t('missionboard.reset_filters', lang)}
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {board.missions.map((mission) => (
              <li key={mission.id}>
                <MissionCard mission={mission} lang={lang} />
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={board.page}
          totalPages={board.totalPages}
          basePath={ROUTE}
          totalItems={board.totalCount}
          perPage={MISSIONS_PER_PAGE}
        />
      </div>
    </AppShell>
  )
}
