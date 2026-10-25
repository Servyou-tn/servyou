import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { CircleCheckBig } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { requireFreelancer } from '@/lib/auth/require-seller'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Service publié — Servyou' }

const ROUTE = '/mes-services/creer/succes'

// H6 « Publier mon service » → success (ruling D33). H6 has no success frame; this is H2's measured
// success screen (Figma 468:20536, src/app/mon-profil-freelance/creer/succes/page.tsx) with the service's
// own copy and CTAs: 96px success circle + 48px check-circle, H1, one line, « Voir mon service » (D2) and
// « Aller à mes services » (H5).
//
// The wizard REPLACES itself with this page (router.replace), so Back skips the spent wizard. GUARD: the
// `service` param must be the caller's own ACTIVE service — anything else (no param, a malformed id,
// someone else's service, a draft, a paused one) goes to H5, which is the right place for all of them.
// Revisiting it later is harmless: nothing here is sensitive or goes stale.

const ServiceParam = z.string().uuid()

export default async function ServicePublishedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ service }, { topBarUser, freelancerProfile }] = await Promise.all([searchParams, requireFreelancer(ROUTE)])
  const parsed = ServiceParam.safeParse(service)
  if (!freelancerProfile || !parsed.success) redirect('/mes-services')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_listings')
    .select('id')
    .eq('id', parsed.data)
    .eq('freelancer_profile_id', freelancerProfile.id)
    .eq('status', 'active')
    .maybeSingle()
  if (error) {
    console.error('[creer/succes] service fetch failed:', error.message, error.code, error.details)
    throw new Error('service fetch failed while guarding /mes-services/creer/succes')
  }
  if (!data) redirect('/mes-services')

  const lang = await getLang()
  const linkClasses = (variant: 'primary' | 'secondary') =>
    cn(BUTTON_BASE, BUTTON_SIZE.lg, VARIANT_BASE[variant], VARIANT_STATE[variant], 'w-full sm:w-auto')

  return (
    <AppShell user={topBarUser}>
      <div className="flex justify-center">
        <div className="flex w-full max-w-[760px] flex-col items-center gap-4 rounded-card border border-border-subtle bg-surface-base p-8 text-center sm:p-12">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-success-50">
            <CircleCheckBig className="h-12 w-12 text-success-500" aria-hidden="true" />
          </span>

          <h1 className="text-2xl font-semibold leading-[30px] text-brand-blue-800">
            {t('service.wizard.succes.title', lang)}
          </h1>

          <p className="max-w-[420px] text-[15px] leading-6 text-text-muted">
            {t('service.wizard.succes.subline', lang)}
          </p>

          <div className="mt-2 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Link href={`/services/${data.id}`} className={linkClasses('secondary')}>
              {t('service.wizard.succes.view', lang)}
            </Link>
            <Link href="/mes-services" className={linkClasses('primary')}>
              {t('service.wizard.succes.list', lang)}
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
