import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CircleCheckBig } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Button } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { getShellUser } from '@/lib/marche/shell-user'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Profil créé — Servyou' }

const ROUTE = '/mon-profil-freelance/creer/succes'

// H2 success — Figma 468:20536/468:20538, measured (96px success/100 circle + 48px check-circle
// + H2 + body + two CTAs). GUARD mirrors G2's succes/page.tsx exactly: freelancer_profiles
// existence is the only precondition — no profile means step 1 owns the right destination.
// BOOKMARK/REVISIT deliberately not prevented beyond that, same reasoning as G2's own page
// (g2-discovery.md §23): nothing here is sensitive or goes stale.
//
// "Voir mon profil public" is DISABLED, not linked — D4 (/freelance/[slug]) does not exist as a
// route at all (docs/design/h2-discovery.md §4a), and G2's own precedent for this exact situation
// (a CTA whose target didn't exist yet) was a disabled control with an explanatory note, not a
// link into a 404. `aria-describedby` ties the disabled button to the note for screen readers,
// mirroring how Input/Textarea already link their own helper text.
export default async function FreelancerProfileCreatedPage() {
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(ROUTE)}`)

  const supabase = await createClient()
  const owned = await resolveOwnedFreelancerProfileId(supabase, shell.id)
  if (!owned.ok) {
    if (owned.reason === 'query_failed') {
      throw new Error('freelancer profile fetch failed while guarding /mon-profil-freelance/creer/succes')
    }
    redirect('/mon-profil-freelance/creer')
  }

  const lang = await getLang()

  const primaryLinkClasses = `inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand-blue-600 px-4 text-base font-semibold text-text-inverse transition-colors hover:bg-brand-blue-700 active:bg-brand-blue-800 sm:w-auto ${FOCUS_RING}`

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex justify-center">
        <div className="flex w-full max-w-[760px] flex-col items-center gap-4 rounded-card border border-border-subtle bg-surface-base p-8 text-center sm:p-12">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-success-50">
            <CircleCheckBig className="h-12 w-12 text-success-500" aria-hidden="true" />
          </span>

          <h1 className="text-2xl font-semibold leading-[30px] text-brand-blue-800">
            {t('freelance.create.succes.title', lang)}
          </h1>

          <p className="max-w-[420px] text-[15px] leading-6 text-text-muted">
            {t('freelance.create.succes.subline', lang)}
          </p>

          <div className="mt-2 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Button
              variant="secondary"
              size="lg"
              disabled
              className="w-full sm:w-auto"
              aria-describedby="public-profile-note"
            >
              {t('freelance.view_public', lang)}
            </Button>
            <Link href="/tableau-de-bord" className={primaryLinkClasses}>
              {t('freelance.create.succes.cta_dashboard', lang)}
            </Link>
          </div>
          <p id="public-profile-note" className="text-sm text-text-muted">
            {t('freelance.create.succes.public_profile_note', lang)}
          </p>
        </div>
      </div>
    </AppShell>
  )
}
