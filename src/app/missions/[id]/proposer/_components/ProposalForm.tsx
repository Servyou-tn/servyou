'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Copy } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { InlineNotice } from '@/components/missions/InlineNotice'
import { SkillsPicker } from '@/components/missions/SkillsPicker'
import { FOCUS_RING } from '@/components/layout/styles'
import { t, tn } from '@/lib/i18n'
import { MAX_ACTIVE_RESPONSES_PER_FREELANCER, MAX_RESPONSES_PER_POST, PROPOSAL_MESSAGE_MAX, PROPOSAL_MESSAGE_MIN, PROPOSAL_SKILLS_MAX, PROPOSAL_TIMEFRAME_MAX } from '@/lib/job-constants'
import { formatJobBudget, hasJobBudget } from '@/lib/marche/format-job-budget'
import { FIELD_FAILURES, TERMINAL_FAILURES, type ProposalFailure } from '@/lib/marche/proposal-errors'
import { normalizeUrl } from '@/lib/social/platforms'
import { validateProposal, type ProposalErrors, type ProposalLinkInput } from '@/lib/marche/proposal-validation'
import { splitSkills } from '@/lib/marche/skills-match'
import { LinksField } from './LinksField'
import { submitProposalAction } from '../actions'

// H12 form-panel — Figma 350:12032 (docs/design/h9-h13-measurements.md §3.2): surface/base, 1 px border/subtle, radius xl,
// pad 24, gap 20. Field order is the design's: message → links → skills → price → délai → submit → caption.
//
// STATE IS CONTROLLED, and errors are i18n KEYS. A failed server action resets an uncontrolled form (design note), and a
// resolved string would not re-translate when the language is switched mid-form — so nothing here stores text a user can
// read except what they typed.
//
// Failures (D-H13-3): the action returns a typed reason. Field failures land on their field; a TERMINAL failure (post
// full / filled / deleted / expired / unavailable, the 5-proposal cap, own post, suspended, no profile) renders an amber
// notice IN PLACE, makes the form read-only and keeps the message visible with a copy button — a failed insert must never
// cost the freelancer what they wrote; anything else is an amber « Réessayer » with the input intact.

type FormProps = {
  jobPostId: string
  clientFirstName: string
  budgetMin: number | null
  budgetMax: number | null
  requiredSkills: string[]
  mySkills: string[]
}

export function ProposalForm({ jobPostId, clientFirstName, budgetMin, budgetMax, requiredSkills, mySkills }: FormProps) {
  const lang = useLang()
  const [pending, startTransition] = useTransition()
  const sections = splitSkills(requiredSkills, mySkills)

  const [message, setMessage] = useState('')
  const [links, setLinks] = useState<ProposalLinkInput[]>([{ label: '', url: '' }])
  const [skills, setSkills] = useState<string[]>(sections.preselected)
  const [price, setPrice] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [errors, setErrors] = useState<ProposalErrors>({})
  const [failure, setFailure] = useState<ProposalFailure | null>(null)

  const locked = failure !== null && TERMINAL_FAILURES.has(failure)
  const err = (key: string | undefined) => (key ? t(key, lang, { min: PROPOSAL_MESSAGE_MIN, max: PROPOSAL_MESSAGE_MAX }) : undefined)

  function applyFieldFailure(reason: ProposalFailure) {
    if (reason === 'invalid_links') {
      // The DB refused the links payload as a whole: mark the first row that has a URL (or the first row).
      const at = Math.max(0, links.findIndex((l) => l.url.trim() !== ''))
      setErrors({ links: links.map((_, i) => (i === at ? 'proposal.error.links_invalid' : undefined)) })
    }
    if (reason === 'too_many_skills') setErrors({ skills: 'proposal.error.skills_max' })
    if (reason === 'invalid_message') setErrors({ message: 'proposal.error.message_short' })
    if (reason === 'invalid_price') setErrors({ price: 'proposal.error.price_invalid' })
    if (reason === 'invalid_timeframe') setErrors({ timeframe: 'proposal.error.timeframe_long' })
  }

  function submit() {
    // « behance.net/aya » is sent as https://behance.net/aya — the DB wants a scheme, a person typing an address does not.
    const sendLinks = links.map((l) => ({ ...l, url: normalizeUrl(l.url) }))
    const v = validateProposal({ message, links: sendLinks, price, timeframe, skills })
    if (!v.ok) {
      setErrors(v.errors)
      setFailure(null)
      return
    }
    setErrors({})
    setFailure(null)
    startTransition(async () => {
      let res: Awaited<ReturnType<typeof submitProposalAction>> | undefined
      try {
        res = await submitProposalAction({ jobPostId, message, links: sendLinks, price, timeframe, skills })
      } catch (e) {
        // A rejected call (network down, a 5xx) would otherwise reach the error boundary and unmount the form with everything
        // typed. NEXT_REDIRECT never lands here: Next handles the success redirect itself.
        console.error('[ProposalForm] submit rejected:', e instanceof Error ? e.message : String(e))
        setFailure('technical')
        return
      }
      // Success redirects server-side (never resolves here); only failures come back.
      if (!res || res.ok) return
      if (res.kind === 'invalid') {
        setErrors(res.errors)
        return
      }
      if (FIELD_FAILURES.has(res.reason)) {
        applyFieldFailure(res.reason)
        return
      }
      setFailure(res.reason)
    })
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message)
      toast.success(t('proposal.fail.copied', lang))
    } catch {
      toast.error(t('proposal.fail.copy_error', lang))
    }
  }

  const name = clientFirstName || t('proposal.form.client_fallback', lang)
  const budgetCaption = hasJobBudget(budgetMin, budgetMax)
    ? t('proposal.form.price_caption_budget', lang, { budget: formatJobBudget(budgetMin, budgetMax, lang) })
    : t('proposal.form.price_caption_none', lang)
  const showSkills = sections.required.length + sections.others.length > 0

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!locked) submit()
      }}
      className="flex flex-col gap-5 rounded-xl border border-border-subtle bg-surface-base p-6"
    >
      {failure ? <FailureNotice reason={failure} onRetry={submit} retrying={pending} /> : null}

      <Textarea
        label={t('proposal.form.message_label', lang)}
        placeholder={t('proposal.form.message_ph', lang)}
        helper={t('proposal.form.message_helper', lang, { min: PROPOSAL_MESSAGE_MIN })}
        error={err(errors.message)}
        value={message}
        maxLength={PROPOSAL_MESSAGE_MAX}
        counter
        disabled={locked}
        onChange={(e) => setMessage(e.target.value)}
      />

      <LinksField
        rows={links}
        onChange={setLinks}
        errors={errors.links}
        disabled={locked}
        texts={{
          label: t('proposal.form.links_label', lang),
          helper: t('proposal.form.links_helper', lang),
          labelPlaceholder: t('proposal.form.link_label_ph', lang),
          urlPlaceholder: t('proposal.form.link_url_ph', lang),
          labelAria: (n) => t('proposal.form.link_label_aria', lang, { n }),
          urlAria: (n) => t('proposal.form.link_url_aria', lang, { n }),
          add: t('proposal.form.link_add', lang),
          remove: (n) => t('proposal.form.link_remove', lang, { n }),
          maxReached: t('proposal.form.links_max', lang),
          error: (key) => t(key, lang),
        }}
      />

      {showSkills ? (
        <SkillsPicker
          sections={[
            { id: 'required', label: t('proposal.form.skills_required', lang), options: sections.required },
            { id: 'others', label: t('proposal.form.skills_others', lang), options: sections.others },
          ]}
          value={skills}
          onChange={setSkills}
          max={PROPOSAL_SKILLS_MAX}
          disabled={locked}
          label={t('proposal.form.skills_label', lang)}
          helper={t('proposal.form.skills_helper', lang)}
          placeholder={t('proposal.form.skills_ph', lang)}
          selectedLabel={(n) => tn('proposal.form.skills_selected', lang, n)}
          removeLabel={(skill) => t('proposal.form.skills_remove', lang, { name: skill })}
          searchPlaceholder={t('proposal.form.skills_search', lang)}
          emptyLabel={t('proposal.form.skills_empty', lang)}
          error={err(errors.skills)}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <Input
          label={t('proposal.form.price_label', lang)}
          type="text"
          inputMode="decimal"
          dir="ltr"
          placeholder="0"
          suffix="TND"
          maxLength={12}
          value={price}
          disabled={locked}
          error={err(errors.price)}
          onChange={(e) => setPrice(e.target.value)}
        />
        <p className="text-caption text-text-muted">{budgetCaption}</p>
      </div>

      <Input
        label={t('proposal.form.timeframe_label', lang)}
        placeholder={t('proposal.form.timeframe_ph', lang)}
        helper={t('proposal.form.timeframe_helper', lang)}
        maxLength={PROPOSAL_TIMEFRAME_MAX}
        value={timeframe}
        disabled={locked}
        error={err(errors.timeframe)}
        onChange={(e) => setTimeframe(e.target.value)}
      />

      <Button type="submit" className="w-full" loading={pending} disabled={locked}>
        {t('missiondetail.cta.send', lang)}
      </Button>

      <p className="text-center text-caption text-text-muted">{t('proposal.form.footer', lang, { name })}</p>

      {locked ? <PreservedMessage message={message} onCopy={copyMessage} /> : null}
    </form>
  )
}

// ── failure notice ───────────────────────────────────────────────────────────────────────────────────

const WAY_FORWARD: Partial<Record<ProposalFailure, { href: string; key: string }[]>> = {
  job_full: [{ href: '/trouver-des-missions', key: 'proposal.fail.see_others' }, { href: '/mes-propositions', key: 'proposal.fail.my_proposals' }],
  job_filled: [{ href: '/trouver-des-missions', key: 'proposal.fail.see_others' }, { href: '/mes-propositions', key: 'proposal.fail.my_proposals' }],
  job_deleted: [{ href: '/trouver-des-missions', key: 'proposal.fail.see_others' }, { href: '/mes-propositions', key: 'proposal.fail.my_proposals' }],
  job_expired: [{ href: '/trouver-des-missions', key: 'proposal.fail.see_others' }, { href: '/mes-propositions', key: 'proposal.fail.my_proposals' }],
  job_unavailable: [{ href: '/trouver-des-missions', key: 'proposal.fail.see_others' }, { href: '/mes-propositions', key: 'proposal.fail.my_proposals' }],
  cap_active: [{ href: '/mes-propositions', key: 'proposal.fail.manage' }],
  own_post: [{ href: '/trouver-des-missions', key: 'proposal.fail.see_others' }],
  no_profile: [{ href: '/devenir-freelance', key: 'proposal.fail.complete_profile' }],
}

function FailureNotice({ reason, onRetry, retrying }: { reason: ProposalFailure; onRetry: () => void; retrying: boolean }) {
  const lang = useLang()
  const links = WAY_FORWARD[reason] ?? []
  const vars = { max: MAX_ACTIVE_RESPONSES_PER_FREELANCER, full: MAX_RESPONSES_PER_POST }
  return (
    <InlineNotice
      title={t(`proposal.fail.${reason}.title`, lang, vars)}
      actions={
        reason === 'technical' ? (
          <Button type="button" variant="secondary" size="sm" loading={retrying} onClick={onRetry}>
            {t('proposal.fail.retry', lang)}
          </Button>
        ) : (
          links.map((l) => (
            <Link key={l.href + l.key} href={l.href} className={`rounded-sm text-body-sm font-semibold text-brand-blue-600 hover:underline ${FOCUS_RING}`}>
              {t(l.key, lang)}
            </Link>
          ))
        )
      }
    >
      {t(`proposal.fail.${reason}.body`, lang, vars)}
    </InlineNotice>
  )
}

function PreservedMessage({ message, onCopy }: { message: string; onCopy: () => void }) {
  const lang = useLang()
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-subtle p-4">
      <p className="text-caption font-semibold tracking-[0.48px] text-text-muted uppercase">{t('proposal.fail.preserved', lang)}</p>
      <p className="max-h-40 overflow-y-auto rounded-lg bg-surface-sunken p-3 text-body-sm whitespace-pre-line text-text-secondary [overflow-wrap:anywhere]">
        {message}
      </p>
      <Button type="button" variant="secondary" size="sm" className="self-start" iconStart={<Copy aria-hidden="true" />} onClick={onCopy}>
        {t('proposal.fail.copy', lang)}
      </Button>
    </div>
  )
}
