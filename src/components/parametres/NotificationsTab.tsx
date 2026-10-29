'use client'

import { useRouter } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { SettingRow, SETTING_ROW_LIST } from '@/components/ui/setting-row'
import { notifVariant, rowsForRole, type NotifKey, type NotifPrefs } from '@/lib/notifications/prefs'
import type { Role } from '@/lib/roles'

// Notifications tab (B5) — Figma 424:17442 (freelancer, « état par défaut sauvegardé ») and 558:38878 (shop_owner). Two panels:
//   • « E-mails »: surface/base · border/subtle · r12 · pad 24 · gap 8 — a 20 Semi Bold title, a 14 secondary line, then the
//     rows (Setting Row, divided by the list wrapper). Rows depend on the role (`rowsForRole`); « Alertes de sécurité » is a
//     locked-ON row with no column behind it.
//   • « Notifications sur la plateforme »: the muted surface/subtle panel with the « Bientôt disponible » badge — the in-app
//     bell + drawer does not exist yet, so it is described, not faked (same honest treatment as Confidentialité's Visibilité).
// The tab owns NO state: the shell keeps the value, the saved value and the batched save bar (423:16882 / 558:38900).
//
// Copy is per role VARIANT only where the frames differ (commandes / avis / newsletter); « Propositions » and « Sécurité » read
// the same for everyone.
const VARIANT_ROWS = new Set<NotifKey>(['email_new_orders', 'email_reviews', 'email_newsletter'])

function rowCopyKey(key: NotifKey, variant: string): string {
  return VARIANT_ROWS.has(key)
    ? `parametres.notifications.${key}.${variant}`
    : `parametres.notifications.${key}`
}

export function NotificationsTab({
  role,
  value,
  onChange,
  disabled,
}: {
  role: Role
  /** null = the preferences could not be read: the toggles are NOT shown (defaults the user could save over their real choices). */
  value: NotifPrefs | null
  onChange: (key: NotifKey, next: boolean) => void
  disabled?: boolean
}) {
  const lang = useLang()
  const router = useRouter()
  const variant = notifVariant(role)
  const rows = rowsForRole(role)

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-base px-4 py-6 shadow-[0px_1px_1px_rgba(0,0,0,0.04)] lg:p-6">
        <h2 className="text-xl font-semibold text-text-primary">{t('parametres.notifications.emails.title', lang)}</h2>
        <p className="text-sm text-text-secondary">{t('parametres.notifications.emails.subtitle', lang)}</p>

        {value === null ? (
          <div role="alert" className="flex flex-col items-start gap-3 pt-4">
            <p className="text-sm text-text-secondary">{t('parametres.notifications.load_error', lang)}</p>
            <Button type="button" variant="secondary" size="md" onClick={() => router.refresh()}>
              {t('system.error.retry', lang)}
            </Button>
          </div>
        ) : (
          <div className={`${SETTING_ROW_LIST} pt-4`}>
            {rows.map((row) =>
              row.kind === 'locked' ? (
                <SettingRow
                  key="security"
                  variant="toggle-locked"
                  label={t('parametres.notifications.security.label', lang)}
                  description={t('parametres.notifications.security.desc', lang)}
                />
              ) : (
                <SettingRow
                  key={row.key}
                  variant="toggle"
                  label={t(`${rowCopyKey(row.key, variant)}.label`, lang)}
                  description={t(`${rowCopyKey(row.key, variant)}.desc`, lang)}
                  checked={value[row.key]}
                  onCheckedChange={(next) => onChange(row.key, next)}
                  disabled={disabled}
                />
              ),
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-subtle px-4 py-6 shadow-[0px_1px_1px_rgba(0,0,0,0.04)] lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <h2 className="text-xl font-semibold text-text-secondary">{t('parametres.notifications.platform.title', lang)}</h2>
          <span className="rounded-md bg-surface-sunken px-3 py-1 text-center text-sm font-medium text-text-secondary lg:text-start">
            {t('marche.sidebar.coming_soon', lang)}
          </span>
        </div>
        <p className="text-sm text-text-secondary">{t('parametres.notifications.platform.body', lang)}</p>
      </section>
    </div>
  )
}
