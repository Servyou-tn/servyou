'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { SETTING_ROW_LIST, SettingRow } from '@/components/ui/setting-row'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'

// A7 « Personnaliser » — Figma 1478:35981 (480), docs/design/system-pages-cookie-measurements.md. Header « Paramètres des cookies » + ✕, three
// Setting Rows, footer « Refuser tout » (ghost) + « Enregistrer mes choix » (primary).
//   Essentiels   — « Toujours actif » (Supabase auth + Turnstile, listed)         [architect ruling R2; the frame draws an on-toggle]
//   Mesure d'audience — a toggle, OFF unless the visitor already said yes (nothing reads it today)
//   Préférences  — « Toujours actif » (servyou_lang, written only when the visitor picks a language)
// A real modal: scrim, scroll lock, Escape, Tab/Shift+Tab trap, focus restored to the opener — the same wiring as marche/ConfirmModal and
// mon-compte/ModalShell (a third copy: logged as a follow-up, promoted at the next consumer). Closing without saving changes nothing.
export function CookieSettingsModal({
  initialAudience,
  onSave,
  onClose,
}: {
  initialAudience: boolean
  onSave: (audience: boolean) => void
  onClose: () => void
}) {
  const lang = useLang()
  const [audience, setAudience] = useState(initialAudience)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      opener?.focus?.()
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-overlay-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-120 flex-col overflow-y-auto rounded-2xl bg-surface-base shadow-xl outline-none"
      >
        <div className="flex items-center justify-between gap-3 px-6 pb-4 pt-6">
          <h2 id="cookie-settings-title" className="text-h3 text-text-primary">
            {t('cookies.modal.title', lang)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('cookies.modal.close', lang)}
            className={cn('relative flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-subtle', FOCUS_RING)}
          >
            <X className="size-5" aria-hidden="true" />
            <span aria-hidden="true" className="absolute -inset-1" />
          </button>
        </div>

        <div className={cn('px-6 pb-6', SETTING_ROW_LIST)}>
          <SettingRow
            variant="status"
            label={t('cookies.cat.essential.label', lang)}
            description={t('cookies.cat.essential.desc', lang)}
            statusLabel={t('cookies.cat.always_on', lang)}
          />
          <SettingRow
            variant="toggle"
            label={t('cookies.cat.audience.label', lang)}
            description={t('cookies.cat.audience.desc', lang)}
            checked={audience}
            onCheckedChange={setAudience}
          />
          <SettingRow
            variant="status"
            label={t('cookies.cat.prefs.label', lang)}
            description={t('cookies.cat.prefs.desc', lang)}
            statusLabel={t('cookies.cat.always_on', lang)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 bg-surface-subtle px-6 pb-6 pt-4">
          <Button variant="ghost" onClick={() => onSave(false)}>
            {t('cookies.action.refuse_all', lang)}
          </Button>
          <Button variant="primary" onClick={() => onSave(audience)}>
            {t('cookies.action.save', lang)}
          </Button>
        </div>
      </div>
    </div>
  )
}
