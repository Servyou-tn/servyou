'use client'

import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// Notifications + Comptes connectés, part 1: minimal and honest rather than porting the old
// hand-rolled rows forward (they described a shape the measured design doesn't match) or inventing
// new content (Comptes connectés' Google/Facebook/Apple rows were never measured — see the PR
// body). Reuses the same muted-panel treatment the Notifications tab's own "Bientôt disponible"
// specimen (423:17194) already established, generalized to "this whole tab is part 2" instead of
// the specific in-app bell+drawer note that panel was measured for.
export function PlaceholderTab({ title }: { title: string }) {
  const lang = useLang()

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-subtle p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-text-secondary">{title}</h2>
        <span className="rounded-md bg-surface-sunken px-3 py-1 text-sm font-medium text-text-secondary">
          {t('marche.sidebar.coming_soon', lang)}
        </span>
      </div>
      <p className="text-sm text-text-secondary">{t('parametres.placeholder.body', lang)}</p>
    </div>
  )
}
