'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { createFreelancerReportAction } from '../actions'
import { FREELANCER_REPORT_REASONS, type FreelancerReportReason } from '../report-reasons'

// D4's report trigger — the measured hero's kebab (icon-more-vertical) beside Partager. Mirrors
// ShopReportModal.tsx exactly: reports.target_type already carries 'freelancer_profile', this is
// the first caller to exercise it. AUTH — D4 is a public route, typically reached logged out; the
// trigger opens the sign-in flow instead of the form, same ?next= pattern as every other guarded
// destination (isLoggedIn comes from the page's own server fetch, no client re-check needed).
export function FreelancerReportModal({
  freelancerProfileId,
  freelancerName,
  isLoggedIn,
}: {
  freelancerProfileId: string
  freelancerName: string
  isLoggedIn: boolean
}) {
  const lang = useLang()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState<FreelancerReportReason | ''>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = !submitting && reason !== ''

  function open() {
    if (!isLoggedIn) {
      router.push(`/connexion?next=${encodeURIComponent(`/freelance/${freelancerProfileId}`)}`)
      return
    }
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
    setReason('')
    setDescription('')
    setSubmitting(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    const res = await createFreelancerReportAction({ freelancerProfileId, reason, description })
    if (!res.ok) {
      toast.error(res.error)
      setSubmitting(false)
      return
    }
    toast.success(t('report.freelancer.success', lang))
    close()
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={t('freelance.public.report_trigger', lang)}
        className={`rounded-md text-body-sm text-text-muted transition-colors hover:text-text-secondary ${FOCUS_RING}`}
      >
        {t('freelance.public.report_trigger', lang)}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={submit} className="w-full max-w-[480px] rounded-2xl bg-surface-base shadow-lg">
            <div className="flex items-center justify-between px-6 pb-4 pt-6">
              <h2 className="text-xl font-semibold leading-[26px] text-text-primary">{t('report.freelancer.title', lang)}</h2>
              <button
                type="button"
                onClick={close}
                aria-label={t('report.freelancer.cancel', lang)}
                className={`rounded-md p-1 text-text-muted transition-colors hover:text-text-primary ${FOCUS_RING}`}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-6 pb-6">
              <p className="text-body-sm leading-[21px] text-text-secondary">
                {t('report.freelancer.subtitle', lang, { name: freelancerName })}
              </p>

              <div className="flex flex-col gap-2">
                <label htmlFor="freelancer-report-reason" className="flex items-center gap-0.5 text-body-sm font-medium text-text-secondary">
                  {t('report.freelancer.reason_label', lang)}
                  <span className="text-danger-500">*</span>
                </label>
                <select
                  id="freelancer-report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as FreelancerReportReason | '')}
                  required
                  className={`h-11 w-full rounded-lg border border-border-strong bg-surface-base px-4 text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`}
                >
                  <option value="">{t('report.freelancer.reason_placeholder', lang)}</option>
                  {FREELANCER_REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`report.freelancer.reason_${r}`, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="freelancer-report-description" className="text-body-sm font-medium text-text-secondary">
                  {t('report.freelancer.description_label', lang)}
                </label>
                <textarea
                  id="freelancer-report-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('report.freelancer.description_placeholder', lang)}
                  rows={4}
                  maxLength={500}
                  className={`w-full rounded-lg border border-border-strong bg-surface-base px-4 py-3 text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 rounded-b-2xl bg-surface-subtle px-6 pb-6 pt-4">
              <Button type="button" variant="ghost" onClick={close} disabled={submitting}>
                {t('report.freelancer.cancel', lang)}
              </Button>
              <Button type="submit" variant="danger" loading={submitting} disabled={reason === ''}>
                {t('report.freelancer.submit', lang)}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
