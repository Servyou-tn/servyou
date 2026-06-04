'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MAX_RESPONSES_PER_POST, MAX_ACTIVE_RESPONSES_PER_FREELANCER, JOB_POST_EXPIRY_DAYS } from '@/lib/job-constants'
import { isValidPhone, normalizePhone } from '@/lib/phone'
import { useLang } from './LangProvider'
import { t } from '@/lib/i18n'

type Props = {
  jobPostId: string
  jobPostTitle: string
  consumerPhone: string | null
  currentResponseCount: number
}

export function RespondForm({ jobPostId, jobPostTitle, consumerPhone, currentResponseCount }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [proposal, setProposal] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [capError, setCapError] = useState('')
  const [profilePhone, setProfilePhone] = useState<string | null>(null)
  const [phoneInput, setPhoneInput] = useState('')

  useEffect(() => {
    async function checkCaps() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('phone').eq('id', user.id).single()
      if (profileErr) console.error('[RespondForm] profile fetch error:', profileErr)
      setProfilePhone(profile?.phone ?? null)

      if (currentResponseCount >= MAX_RESPONSES_PER_POST) {
        setCapError(t('respond.cap_post_full', lang))
        return
      }

      const cutoff = new Date(Date.now() - JOB_POST_EXPIRY_DAYS * 86400000).toISOString()
      const { count } = await supabase
        .from('job_responses')
        .select('id', { count: 'exact', head: true })
        .eq('freelancer_id', user.id)

      const { data: activePosts } = await supabase
        .from('job_posts')
        .select('id')
        .eq('status', 'open')
        .gte('created_at', cutoff)

      const activeIds = (activePosts ?? []).map((p: { id: string }) => p.id)
      if (activeIds.length > 0) {
        const { count: activeCount } = await supabase
          .from('job_responses')
          .select('id', { count: 'exact', head: true })
          .eq('freelancer_id', user.id)
          .in('job_post_id', activeIds)

        if ((activeCount ?? 0) >= MAX_ACTIVE_RESPONSES_PER_FREELANCER) {
          setCapError(t('respond.cap_active_full', lang, { n: MAX_ACTIVE_RESPONSES_PER_FREELANCER }))
        }
      }

      void count
    }
    checkCaps()
  }, [jobPostId, currentResponseCount, lang])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (capError) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    if (!profilePhone) {
      if (!isValidPhone(phoneInput)) {
        setError(t('common.phone_format_error', lang))
        setSubmitting(false)
        return
      }
      const { error: phoneErr } = await supabase
        .from('profiles')
        .update({ phone: normalizePhone(phoneInput) })
        .eq('id', user.id)
      if (phoneErr) {
        console.error('[RespondForm] phone update error:', phoneErr)
        setError(t('common.phone_save_error', lang))
        setSubmitting(false)
        return
      }
    }

    const { error: insertErr } = await supabase
      .from('job_responses')
      .insert({
        job_post_id: jobPostId,
        freelancer_id: user.id,
        proposal_message: proposal.trim() || null,
      })

    setSubmitting(false)

    if (insertErr) {
      const msg = insertErr.message ?? ''
      if (msg.includes('maximum de réponses actives')) {
        setError(t('respond.error_cap_active', lang, { n: MAX_ACTIVE_RESPONSES_PER_FREELANCER }))
      } else if (msg.includes('nombre maximum de réponses')) {
        setError(t('respond.error_cap_post', lang))
      } else if (msg.includes('déjà répondu')) {
        setError(t('respond.error_already', lang))
      } else if (msg.includes('plus ouverte') || msg.includes('expiré')) {
        setError(t('respond.error_closed', lang))
      } else if (msg.includes('propre annonce')) {
        setError(t('respond.error_own', lang))
      } else {
        setError(t('respond.error_generic', lang))
      }
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    const phone = consumerPhone?.replace(/\s+/g, '')
    const waText = encodeURIComponent(
      t('job.whatsapp_responder_to_consumer', lang, { mission: jobPostTitle })
    )
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded px-4 py-3 text-sm text-green-700">
          {t('respond.success', lang)}
        </div>
        {phone ? (
          <a href={`https://wa.me/${phone}?text=${waText}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-medium text-sm px-4 py-2 rounded transition-colors">
            {t('respond.whatsapp_btn', lang)}
          </a>
        ) : (
          <p className="text-sm text-gray-500">{t('respond.no_phone', lang)}</p>
        )}
      </div>
    )
  }

  if (capError) {
    return (
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-4 py-3">
        {capError}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('respond.field_proposal', lang)}{' '}
          <span className="text-gray-400 text-xs">{t('respond.field_proposal_opt', lang)}</span>
        </label>
        <textarea rows={4} value={proposal} onChange={e => setProposal(e.target.value)}
          placeholder={t('respond.field_proposal_ph', lang)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {!profilePhone && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.phone_label', lang)} <span className="text-red-500">*</span>
          </label>
          <input type="tel" required value={phoneInput} onChange={e => setPhoneInput(e.target.value)}
            placeholder={t('common.phone_placeholder', lang)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <p className="text-xs text-gray-400 mt-1">
            {t('common.phone_helper_client', lang)}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}

      <button type="submit" disabled={submitting || (!profilePhone && !phoneInput.trim())}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
        {submitting ? t('respond.submitting', lang) : t('respond.submit', lang)}
      </button>
    </form>
  )
}
