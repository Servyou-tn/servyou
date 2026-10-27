import { AlertTriangle } from 'lucide-react'
import { CARD_SHADOW } from '@/components/layout/styles'
import { t, type Lang } from '@/lib/i18n'
import { RetryButton } from './RetryButton'

// « Impossible de charger ce contenu » — the inline error state for LIST pages whose loader failed
// (loader-error-surfacing plan, ruling 1): it sits inside the page's normal shell so the header and
// nav stay, instead of the misleading « no results ». Mirrors EmptyState's card, width and type;
// Figma Error State 179:12636 (spec in the plan, no read). The icon sits in a danger-tinted circle
// the size of EmptyState's 48px glyph; the only action is a secondary « Réessayer » that re-fetches
// the page (RetryButton is the one client leaf). Detail/form pages throw to the root error.tsx instead.
export function ErrorState({ lang }: { lang: Lang }) {
  return (
    <div role="alert" className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
      <div className="mx-auto max-w-md">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger-100 text-danger-500" aria-hidden="true">
          <AlertTriangle className="size-6" />
        </div>
        <p className="mt-4 text-base font-semibold text-text-primary">{t('system.loadError.title', lang)}</p>
        <p className="mt-2 text-body-sm text-text-muted">{t('system.loadError.body', lang)}</p>
        <div className="mt-6 flex justify-center">
          <RetryButton label={t('system.error.retry', lang)} />
        </div>
      </div>
    </div>
  )
}
