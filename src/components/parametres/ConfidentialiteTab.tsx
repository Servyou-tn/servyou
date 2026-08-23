'use client'

import { useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { SettingRow } from '@/components/ui/setting-row'
import { ExportDataModal } from './ExportDataModal'
import type { CurrentProfile } from '@/lib/marche/mon-compte'

// Confidentialité tab, part 1: minimal on purpose (real content — Visibilité, the policy link, the
// deletion pointer — is part 2), EXCEPT this one row. Data export already has a real backend
// (requestDataExportAction → data_exports) and a working modal; CLAUDE.md's "once built, stays
// built" rule means it doesn't get to disappear while the rest of the tab waits. Section chrome
// (title + subtitle) is measured from 558:38977's "Données personnelles" section — that copy is
// role-neutral, unlike the row description the same frame measured (which says "boutique" and is
// shop_owner-only content out of scope here). The row itself reuses the existing, already-reviewed
// exportTitle/exportHelp copy instead.
export function ConfidentialiteTab({ profile }: { profile: CurrentProfile }) {
  const lang = useLang()
  const [exportOpen, setExportOpen] = useState(false)

  return (
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

      {exportOpen && <ExportDataModal email={profile.email} onClose={() => setExportOpen(false)} />}
    </div>
  )
}
