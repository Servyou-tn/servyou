import Link from 'next/link'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Button, BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { t, type Lang } from '@/lib/i18n'
import { MAX_ACTIVE_RESPONSES_PER_FREELANCER, MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import type { MissionCtaState } from '@/lib/marche/mission-cta'
import { relativeTimeLabel } from '@/app/tableau-de-bord/_components/relative-time'

// H10 CTA block (docs/design/h9-h13-measurements.md §2.1 node 323:11866 + §2.2 specimens 331:11979 / 331:12001).
// The page is read-and-decide, so the CTA states WHY a freelancer cannot respond before they open the form.
//
// PR-2: the two proposal CTAs are live links now (they were disabled « Bientôt disponible » in PR-1, D9, while H12 / H13 did
// not exist). « Envoyer ma proposition » → H12; « Voir ma proposition » → H13.
// D-H10-3: the reasons for 10/10, pourvue, expirée, supprimée/modérée, no profile and own post have no specimen; the copy is the
// architect-approved pattern (disabled primary + reason line + a way forward). The Arabic is a draft.

function Reason({ children, tone = 'warning' }: { children: React.ReactNode; tone?: 'warning' | 'muted' }) {
  return (
    <p className={`flex items-start gap-2 text-body-sm font-medium ${tone === 'warning' ? 'text-warning-700' : 'text-text-secondary'}`}>
      <AlertCircle className={`mt-0.5 size-4 shrink-0 ${tone === 'warning' ? 'text-warning-700' : 'text-text-muted'}`} aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

function WayForward({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`self-start rounded-sm text-body-sm font-semibold text-brand-blue-600 hover:underline ${FOCUS_RING}`}>
      {children}
    </Link>
  )
}

export function MissionCta({ state, missionId, answeredAt, lang }: { state: MissionCtaState; missionId: string; answeredAt: string | null; lang: Lang }) {
  if (state === 'can_respond') {
    return (
      <Link href={`/missions/${missionId}/proposer`} className={cn(BUTTON_BASE, BUTTON_SIZE.md, VARIANT_BASE.primary, VARIANT_STATE.primary, 'w-full')}>
        {t('missiondetail.cta.send', lang)}
        {/* Touch target: the visible button is 40 px, the hit area reaches 44 (what Button's md does). */}
        <span aria-hidden="true" className="absolute -inset-0.5" />
      </Link>
    )
  }

  if (state === 'answered') {
    return (
      <div className="flex flex-col gap-3">
        <p className="flex items-start gap-2 text-body-sm font-semibold text-success-700">
          <CheckCircle className="mt-0.5 size-4 shrink-0 text-success-500" aria-hidden="true" />
          <span>{t('missiondetail.cta.answered', lang)}</span>
        </p>
        <Link
          href={`/missions/${missionId}/proposition-envoyee`}
          className={cn(BUTTON_BASE, BUTTON_SIZE.md, VARIANT_BASE.secondary, VARIANT_STATE.secondary, 'w-full')}
        >
          {t('missiondetail.cta.view_mine', lang)}
          <span aria-hidden="true" className="absolute -inset-0.5" />
        </Link>
        {answeredAt ? (
          <p className="text-center text-caption text-text-muted">
            {t('missiondetail.cta.answered_at', lang, { when: lang === 'fr' ? lowerFirst(relativeTimeLabel(answeredAt, lang)) : relativeTimeLabel(answeredAt, lang) })}
          </p>
        ) : null}
      </div>
    )
  }

  // Every remaining state: the primary button is shown disabled (surface/sunken + text/muted) with the reason
  // beneath it, as in the « blocked » specimen.
  const blocked = (
    <Button disabled className="w-full">
      {t('missiondetail.cta.send', lang)}
    </Button>
  )

  switch (state) {
    case 'cap_active':
      return (
        <div className="flex flex-col gap-3">
          {blocked}
          <Reason>{t('missiondetail.cta.cap_active', lang, { max: MAX_ACTIVE_RESPONSES_PER_FREELANCER })}</Reason>
          <WayForward href="/mes-propositions">{t('missiondetail.cta.manage', lang)}</WayForward>
        </div>
      )
    case 'no_profile':
      return (
        <div className="flex flex-col gap-3">
          {blocked}
          <Reason>{t('missiondetail.cta.no_profile', lang)}</Reason>
          <WayForward href="/devenir-freelance">{t('missiondetail.cta.complete_profile', lang)}</WayForward>
        </div>
      )
    case 'own_post':
      return (
        <div className="flex flex-col gap-3">
          {blocked}
          <Reason tone="muted">{t('missiondetail.cta.own_post', lang)}</Reason>
        </div>
      )
    case 'full':
      return (
        <div className="flex flex-col gap-3">
          {blocked}
          <Reason>{t('missiondetail.cta.full', lang, { max: MAX_RESPONSES_PER_POST })}</Reason>
          <WayForward href="/trouver-des-missions">{t('missiondetail.cta.see_others', lang)}</WayForward>
        </div>
      )
    case 'filled':
    case 'expired':
    case 'closed':
      return (
        <div className="flex flex-col gap-3">
          {blocked}
          <Reason>{t(`missiondetail.cta.${state}`, lang)}</Reason>
          <WayForward href="/trouver-des-missions">{t('missiondetail.cta.see_others', lang)}</WayForward>
        </div>
      )
  }
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLocaleLowerCase() + s.slice(1)
}

