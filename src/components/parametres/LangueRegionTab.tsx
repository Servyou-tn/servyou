'use client'

import { useLang } from '@/components/LangProvider'
import { t, type Lang } from '@/lib/i18n'
import { SettingRow } from '@/components/ui/setting-row'

// Measured 423:17321 — the one working tab this PR. "Langue" writes profiles.language (via the
// parent's save action) AND the servyou_lang cookie on save (ParametresShell.handleSave) — the
// founder's ruling on the topbar-toggle/Paramètres duplication question the measurement raised.
//
// "Région" is two read-only rows, not Setting Row instances (no control, nothing to select) — a
// `ro-row` shape distinct from Setting Row in the Figma export itself. Inlined here rather than
// promoted to a shared component: used exactly twice, both on this one tab.
export function LangueRegionTab({ value, onChange }: { value: Lang; onChange: (next: Lang) => void }) {
  const lang = useLang()

  return (
    <div className="flex flex-col gap-8 rounded-xl border border-border-subtle bg-surface-base p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-text-primary">{t('parametres.langue.sectionTitle', lang)}</h2>
        <p className="text-sm text-text-secondary">{t('parametres.langue.sectionSubtitle', lang)}</p>
        <div className="pt-4">
          <SettingRow
            variant="select"
            label={t('parametres.lang.title', lang)}
            description={t('parametres.langue.rowDescription', lang)}
            value={value}
            onChange={(next) => onChange(next === 'ar' ? 'ar' : 'fr')}
            options={[
              { value: 'fr', label: 'Français' },
              { value: 'ar', label: 'العربية' },
            ]}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-text-primary">{t('parametres.region.sectionTitle', lang)}</h2>
        <p className="text-sm text-text-secondary">{t('parametres.region.sectionSubtitle', lang)}</p>
        <div className="flex flex-col divide-y divide-border-subtle pt-4">
          <ReadOnlyRow
            label={t('parametres.region.timezoneLabel', lang)}
            description={t('parametres.region.timezoneDescription', lang)}
            value={t('parametres.region.timezoneValue', lang)}
          />
          <ReadOnlyRow
            label={t('parametres.region.phoneFormatLabel', lang)}
            description={t('parametres.region.phoneFormatDescription', lang)}
            value={t('parametres.region.phoneFormatValue', lang)}
          />
        </div>
      </section>
    </div>
  )
}

// Both measured values (an IANA-style timezone id, a phone country code) are Latin/numeral
// technical strings — dir="ltr" so they don't reverse inside RTL text (reference_rtl_numeric_run_
// reversal: spaces/slashes/plus signs are bidi-neutral and take the surrounding run's direction).
function ReadOnlyRow({ label, description, value }: { label: string; description: string; value: string }) {
  return (
    <div className="flex min-h-[72px] w-full items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-base font-medium text-text-primary">{label}</p>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      <p dir="ltr" className="shrink-0 text-base text-text-primary">
        {value}
      </p>
    </div>
  )
}
