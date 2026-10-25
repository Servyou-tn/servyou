import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// page-header 459:18746 of the H6 wizard (docs/design/h6-measurements.md): breadcrumb (Medium 14 muted,
// chevron 14, gap 8) → H1 → subtitle (body-sm secondary), stacked gap 8. The frame draws « Mes services »
// unlinked; it links back to H5 here (G6 /mes-produits/ajouter precedent) since nothing else on the page
// leads back. Both crumbs keep the frame's muted colour.
//
// Shared by /mes-services/creer (H6) and /mes-services/[id]/modifier (H7), which adds the service's
// status pill beside the H1. Without a pill the markup is exactly the H6 one.
export function WizardPageIntro({
  lang,
  titleKey,
  subtitleKey,
  pill,
}: {
  lang: Lang
  titleKey: string
  subtitleKey: string
  pill?: ReactNode
}) {
  const title = <h1 className="text-h1 text-text-primary">{t(titleKey, lang)}</h1>
  return (
    <div className="flex flex-col gap-2">
      <nav aria-label={t('service.wizard.breadcrumb_aria', lang)}>
        <ol className="flex items-center gap-2 text-sm font-medium text-text-muted">
          <li>
            <Link href="/mes-services" className={cn('rounded hover:text-text-primary hover:underline', FOCUS_RING)}>
              {t('service.list_title', lang)}
            </Link>
          </li>
          <li aria-hidden="true" className="flex items-center">
            <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </li>
          <li aria-current="page">{t(titleKey, lang)}</li>
        </ol>
      </nav>
      {pill ? (
        <div className="flex flex-wrap items-center gap-3">
          {title}
          {pill}
        </div>
      ) : (
        title
      )}
      <p className="text-body-sm text-text-secondary">{t(subtitleKey, lang)}</p>
    </div>
  )
}
