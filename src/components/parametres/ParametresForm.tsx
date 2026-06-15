'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Bell, Shield, Languages, Link2, Download } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { SegmentedControl, type SegmentedControlOption } from '@/components/ui/segmented-control'
import { updateProfileAction } from '@/app/mon-compte/actions'
import { ExportDataModal } from './ExportDataModal'
import type { CurrentProfile } from '@/lib/marche/mon-compte'

type Lang = 'fr' | 'ar'

// Disabled placeholder switch (the notification/visibility prefs have no backing columns
// and no sending system yet). Module-level so it isn't re-created each render.
function Toggle({ checked, label }: { checked: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled
      className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full bg-slate-100 opacity-50"
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-slate-300 shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

function ComingSoonBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-text-muted">{label}</span>
  )
}

export function ParametresForm({ profile }: { profile: CurrentProfile }) {
  const lang = useLang()
  const [selectedLang, setSelectedLang] = useState<Lang>(profile.language === 'ar' ? 'ar' : 'fr')
  const [, startLang] = useTransition()
  const [exportOpen, setExportOpen] = useState(false)

  const comingSoon = t('marche.sidebar.coming_soon', lang)

  const langOptions: SegmentedControlOption<Lang>[] = [
    { value: 'fr', label: 'Français' },
    { value: 'ar', label: 'العربية' },
  ]

  function onLanguageChange(next: Lang) {
    if (next === selectedLang) return
    const previous = selectedLang
    setSelectedLang(next)
    startLang(async () => {
      // Reuse updateProfileAction — it validates the full set, so pass the current
      // values for the unchanged fields and only vary language.
      const res = await updateProfileAction({
        fullName: profile.full_name,
        phone: profile.phone ?? '',
        city: profile.city ?? '',
        language: next,
      })
      if (res.ok) toast.success(t('parametres.lang.updated', lang))
      else {
        toast.error(res.error)
        setSelectedLang(previous)
      }
    })
  }

  const sectionHeader = 'mb-4 flex items-center gap-2'
  const sectionTitle = 'text-lg font-semibold text-text-primary'
  const card = 'card-premium outline-brand mb-6 rounded-2xl bg-white p-6'

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t('parametres.title', lang)}</h1>
        <p className="mt-1 text-base text-text-muted">{t('parametres.subtitle', lang)}</p>
      </div>

      {/* ── Section 1: Notifications (disabled placeholders) ── */}
      <section className={card}>
        <div className={sectionHeader}>
          <Bell className="h-5 w-5 text-brand-accent" aria-hidden="true" />
          <h2 className={sectionTitle}>{t('parametres.notif.title', lang)}</h2>
          <ComingSoonBadge label={comingSoon} />
        </div>
        <p className="mb-4 text-sm text-text-muted">{t('parametres.notif.help', lang)}</p>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{t('parametres.notif.orders', lang)}</p>
              <p className="mt-0.5 text-xs text-text-muted">{t('parametres.notif.ordersHelp', lang)}</p>
            </div>
            <Toggle checked={false} label={t('parametres.notif.orders', lang)} />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{t('parametres.notif.marketing', lang)}</p>
              <p className="mt-0.5 text-xs text-text-muted">{t('parametres.notif.marketingHelp', lang)}</p>
            </div>
            <Toggle checked={false} label={t('parametres.notif.marketing', lang)} />
          </div>
        </div>
      </section>

      {/* ── Section 2: Confidentialité ── */}
      <section className={card}>
        <div className={sectionHeader}>
          <Shield className="h-5 w-5 text-brand-accent" aria-hidden="true" />
          <h2 className={sectionTitle}>{t('parametres.privacy.title', lang)}</h2>
        </div>
        <p className="mb-6 text-sm text-text-muted">{t('parametres.privacy.help', lang)}</p>

        {/* A — Visibilité (disabled) */}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-text-primary">
              {t('parametres.privacy.visibilityTitle', lang)}
            </h3>
            <ComingSoonBadge label={comingSoon} />
          </div>
          <p className="mt-1 text-sm text-text-muted">{t('parametres.privacy.visibilityHelp', lang)}</p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-text-primary">
              {t('parametres.privacy.visibilityToggle', lang)}
            </p>
            <Toggle checked={false} label={t('parametres.privacy.visibilityToggle', lang)} />
          </div>
        </div>

        <div className="my-4 border-t border-border-subtle" />

        {/* B — Export de données (working) */}
        <div>
          <h3 className="text-base font-semibold text-text-primary">{t('parametres.privacy.exportTitle', lang)}</h3>
          <p className="mt-1 text-sm text-text-muted">{t('parametres.privacy.exportHelp', lang)}</p>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className={cn(
              'mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-border-subtle bg-white px-6 text-sm font-medium text-text-primary transition-colors hover:bg-slate-50',
              FOCUS_RING,
            )}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('parametres.privacy.exportBtn', lang)}
          </button>
        </div>
      </section>

      {/* ── Section 3: Langue (working) ── */}
      <section className={card}>
        <div className={sectionHeader}>
          <Languages className="h-5 w-5 text-brand-accent" aria-hidden="true" />
          <h2 className={sectionTitle}>{t('parametres.lang.title', lang)}</h2>
        </div>
        <p className="mb-4 text-sm text-text-muted">{t('parametres.lang.help', lang)}</p>
        <SegmentedControl
          options={langOptions}
          value={selectedLang}
          onChange={onLanguageChange}
          ariaLabel={t('parametres.lang.title', lang)}
        />
        <p className="mt-3 text-xs text-text-muted">{t('parametres.lang.effect', lang)}</p>
      </section>

      {/* ── Section 4: Comptes connectés (disabled placeholders) ── */}
      <section className={card}>
        <div className={sectionHeader}>
          <Link2 className="h-5 w-5 text-brand-accent" aria-hidden="true" />
          <h2 className={sectionTitle}>{t('parametres.social.title', lang)}</h2>
          <ComingSoonBadge label={comingSoon} />
        </div>
        <p className="mb-4 text-sm text-text-muted">{t('parametres.social.help', lang)}</p>

        <div className="space-y-3 opacity-60">
          {['Google', 'Facebook', 'Apple'].map((provider) => (
            <div key={provider} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text-primary">{provider}</p>
                <p className="text-xs text-text-muted">{t('parametres.social.notConnected', lang)}</p>
              </div>
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-full border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-muted"
              >
                {t('parametres.social.connect', lang)}
              </button>
            </div>
          ))}
        </div>
      </section>

      {exportOpen && <ExportDataModal email={profile.email} onClose={() => setExportOpen(false)} />}
    </div>
  )
}
