'use client'

import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// Owner-facing notice shown when admin has moderated the owner's content
// (admin_hidden_at IS NOT NULL). Tells the owner their content is masked and to
// contact support — it NEVER shows admin_hidden_reason (that stays admin-internal).
// Client component mirroring SuspendedBanner (PR-L): rendered inside the client-side
// owner dashboards/edit pages, which already use useLang().
type Variant = 'shop' | 'freelancer_profile' | 'product' | 'service' | 'job_post'

// `alert` defaults to true (role="alert", one assertive announcement — correct for a single
// page-level banner on a detail page). Pass `alert={false}` on a list surface where N moderated
// rows would otherwise fire N assertive announcements for what is, to the user, one glanceable
// state per row (PR-B, AnnonceCard's list usage).
export function ModerationBanner({ variant, alert = true }: { variant: Variant; alert?: boolean }) {
  const lang = useLang()
  return (
    <div
      className="mb-4 flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      role={alert ? 'alert' : undefined}
    >
      <svg
        className="mt-0.5 h-4 w-4 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <span>{t(`owner.moderation_banner.${variant}`, lang)}</span>
    </div>
  )
}
