'use client'

import { useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { SettingRow, SETTING_ROW_LIST } from '@/components/ui/setting-row'
import { ExportDataModal } from './ExportDataModal'
import type { CurrentProfile } from '@/lib/marche/mon-compte'
import type { Role } from '@/lib/roles'

// Confidentialité tab, part 2. Données personnelles (export) ships from part 1 unchanged — real
// backend, kept per CLAUDE.md's "once built, stays built."
//
// Visibilité is new this PR, role-conditional (consumer gets no section — no public profile exists
// to index or suggest, so the tab is byte-identical to what shipped in part 1). Measured from
// 423:17277 (freelancer/base — "profil public D4" + "Freelancers similaires", both toggles ON) and
// 558:38977 (shop_owner clone — profil→boutique, D4→D3, Freelancers→Boutiques similaires; memory
// project_figma_aide_param_shop_support).
//
// ⚑ RENDERED AS THE MUTED "Bientôt disponible" PANEL, NOT live ToggleLocked-ON rows — a deliberate
// deviation from the PR brief's literal "if no backing column, ToggleLocked" instruction, flagged in
// the PR body. Checked before writing this: (1) `/freelance/[slug]` (the D4 public profile the
// freelancer copy promises to index) does not exist as a route AT ALL; (2) `/boutique/[id]` (D3)
// exists but has no visibility gate of any kind — it's unconditionally crawlable already, not
// "on because a toggle says so"; (3) neither `shops` nor `freelancer_profiles` has a backing column
// for either toggle; (4) no "similar shops/freelancers" suggestion block exists anywhere in the
// codebase for either page. A confident locked-ON toggle would promise SEO indexing of a page that
// doesn't exist and a discovery feature nobody built — the servyou-phase-aware-features failure mode
// this app avoids everywhere else (the Notifications "Notifications sur la plateforme" panel, the
// Comptes connectés placeholder). The muted treatment is the same honest pattern, applied here too.
//
// Copy drops the literal "D4"/"D3" that leaked into the measured text (an internal Figma page-code,
// not something a user should read) — symmetrical for both roles.
export function ConfidentialiteTab({ profile, role }: { profile: CurrentProfile; role: Role }) {
  const lang = useLang()
  const [exportOpen, setExportOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      {role !== null && (
        <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-subtle p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-text-secondary">
              {t('parametres.confidentialite.visibility.title', lang)}
            </h2>
            <span className="rounded-md bg-surface-sunken px-3 py-1 text-sm font-medium text-text-secondary">
              {t('marche.sidebar.coming_soon', lang)}
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            {t(`parametres.confidentialite.visibility.subtitle.${role}`, lang)}
          </p>
          <div className={SETTING_ROW_LIST + ' pt-4'}>
            <SettingRow
              variant="toggle-locked"
              label={t(`parametres.confidentialite.visibility.google.title.${role}`, lang)}
              description={t(`parametres.confidentialite.visibility.google.desc.${role}`, lang)}
            />
            <SettingRow
              variant="toggle-locked"
              label={t(`parametres.confidentialite.visibility.similar.title.${role}`, lang)}
              description={t(`parametres.confidentialite.visibility.similar.desc.${role}`, lang)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-base p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
        <h2 className="text-xl font-semibold text-text-primary">
          {t('parametres.confidentialite.dataSectionTitle', lang)}
        </h2>
        <p className="text-sm text-text-secondary">{t('parametres.confidentialite.dataSectionSubtitle', lang)}</p>
        <div className="pt-4">
          <SettingRow
            variant="link"
            label={t('parametres.privacy.exportTitle', lang)}
            description={t('parametres.privacy.exportHelp', lang)}
            actionLabel={t('parametres.confidentialite.exportAction', lang)}
            onAction={() => setExportOpen(true)}
          />
        </div>
      </div>

      {exportOpen && <ExportDataModal email={profile.email} onClose={() => setExportOpen(false)} />}
    </div>
  )
}
