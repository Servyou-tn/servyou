import type { Metadata } from 'next'
import { localizedMetadata } from '@/lib/i18n/metadata'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, CircleCheckBig } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { FOCUS_RING } from '@/components/layout/styles'
import { getShellUser } from '@/lib/marche/shell-user'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { HitArea } from '@/components/ui/interactive-surface'

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata('meta.freelance_created')
}

const ROUTE = '/mon-profil-freelance/creer/succes'

// H2 success — Figma 468:20536/468:20538, measured (96px success/100 circle + 48px check-circle
// + H2 + body + two CTAs). GUARD mirrors G2's succes/page.tsx exactly: freelancer_profiles
// existence is the only precondition — no profile means step 1 owns the right destination.
// BOOKMARK/REVISIT deliberately not prevented beyond that, same reasoning as G2's own page
// (g2-discovery.md §23): nothing here is sensitive or goes stale.
//
// "Voir mon profil public" opens the owner's own /freelance/[id] (walk 2026-11-02 #18: it was a disabled « bientôt disponible »
// button although D4 exists and its owner can always open it). The copy is honest about visibility: freelancer_profiles.is_published
// is trigger-derived (≥ 1 active service), so until a service is published the page answers 404 to visitors — the subline says when
// it becomes visible, and the note that only the owner sees it for now. `aria-describedby` ties the link to that note.
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

  // Visible to clients yet? A failed read keeps the « not yet » copy (the honest default for a profile created seconds ago).
  const { data: published, error: publishedError } = await supabase
    .from('freelancer_profiles')
    .select('is_published')
    .eq('id', owned.freelancerProfileId)
    .maybeSingle()
  if (publishedError) {
    console.error('[freelance succes] is_published read failed:', publishedError.message, publishedError.code, publishedError.details)
  }
  const isVisible = published?.is_published === true

  const secondaryLinkClasses = `inline-flex h-12 w-full items-center justify-center rounded-lg border border-border-strong bg-surface-base px-5 text-base font-semibold text-text-primary transition-colors hover:bg-surface-subtle sm:w-auto ${FOCUS_RING}`
  const primaryLinkClasses = `max-lg:relative inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand-blue-600 px-4 text-base font-semibold text-text-inverse transition-colors hover:bg-brand-blue-700 active:bg-brand-blue-800 sm:w-auto ${FOCUS_RING}`

  return (
    <AppShell user={shell.topBarUser}>
      {/* Below lg (375 frame): the wizard's page header over the card — breadcrumb 14 Medium muted (gap 8, chevron 14),
          the page title 32 Bold / 38, the subtitle 14 secondary; the card 20 under it. The title is a <p>: the card's
          « … créé(e) ! » stays the page's one h1. */}
      <div className="mb-5 flex flex-col gap-2 lg:hidden">
        <nav aria-label={t('common.breadcrumb', lang)}>
          <ol className="flex items-center gap-2 text-sm font-medium text-text-muted">
            <li>
              <Link href="/devenir-vendeur/freelance" className={`rounded ${FOCUS_RING}`}>
                {t('freelance.create.crumb_devenir', lang)}
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </li>
            <li aria-current="page">{t('freelance.create.crumb_current', lang)}</li>
          </ol>
        </nav>
        <p className="text-[32px] font-bold leading-[38px] text-text-primary">{t('freelance.create.page_title', lang)}</p>
        <p className="text-sm text-text-secondary">{t('freelance.create.page_subtitle', lang)}</p>
      </div>
      <div className="flex justify-center">
        <div className="flex w-full max-w-[760px] flex-col items-center gap-4 rounded-card border border-border-subtle bg-surface-base p-8 text-center max-lg:gap-5 max-sm:px-4 max-sm:py-10 sm:p-12">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-success-50 max-lg:bg-success-100">
            <CircleCheckBig className="h-12 w-12 text-success-500" aria-hidden="true" />
          </span>

          <h1 className="text-2xl font-semibold leading-[30px] text-brand-blue-800 max-lg:font-bold max-lg:text-text-primary">
            {t('freelance.create.succes.title', lang)}
          </h1>

          <p className="max-w-[420px] text-[15px] leading-6 text-text-muted max-lg:text-base max-lg:leading-[26px] max-lg:text-text-secondary">
            {t(isVisible ? 'freelance.create.succes.subline_visible' : 'freelance.create.succes.subline', lang)}
          </p>

          <div className="mt-2 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href={`/freelance/${owned.freelancerProfileId}`}
              className={secondaryLinkClasses}
              aria-describedby={isVisible ? undefined : 'public-profile-note'}
            >
              {t('freelance.view_public', lang)}
            </Link>
            <Link href="/tableau-de-bord" className={primaryLinkClasses}>
              {t('freelance.create.succes.cta_dashboard', lang)}
              <HitArea size={40} axis="y" />
            </Link>
          </div>
          {!isVisible && (
            <p id="public-profile-note" className="text-sm text-text-muted">
              {t('freelance.create.succes.public_profile_note', lang)}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
