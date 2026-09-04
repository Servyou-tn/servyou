'use client'

import { AlertCircle } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'

// 409:15513 "H3 — échec de validation" — warn-banner + per-field error-caption pattern.
// missing is the exact set validateForPublish() returns (freelancer-profile-edit.ts).
export function ValidationBanner({ missing, lang }: { missing: ('headline' | 'bio' | 'skills')[]; lang: Lang }) {
  if (missing.length === 0) return null
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger-500 bg-danger-50 p-4">
      <AlertCircle className="h-5 w-5 shrink-0 text-danger-500" aria-hidden="true" />
      <p className="text-sm text-danger-700">{t('freelance.edit.validation_banner', lang)}</p>
    </div>
  )
}

// Per-field caption, 409:15520's error-caption — "Le {champ} est requis pour publier votre
// profil." Rendered inline below the offending field, not just in the banner.
export function FieldError({ show, textKey, lang }: { show: boolean; textKey: string; lang: Lang }) {
  if (!show) return null
  return (
    <p role="alert" className="flex items-center gap-1.5 text-sm text-danger-500">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {t(textKey, lang)}
    </p>
  )
}
