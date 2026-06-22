'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { User, Lock, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { createClient } from '@/lib/supabase/client'
import { isValidPhone } from '@/lib/phone'
import { isValidPassword, passwordStrength } from '@/lib/signup-validation'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { initials } from '@/components/listings/listing-utils'
import { updateProfileAction } from '@/app/mon-compte/actions'
import { DeleteAccountModal } from './DeleteAccountModal'
import type { CurrentProfile } from '@/lib/marche/mon-compte'

const labelCls = 'mb-1.5 block text-sm font-medium text-text-primary'
const fieldBase =
  'w-full rounded-xl border border-border-subtle bg-white px-4 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand-accent'

function formatDob(iso: string, lang: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso)
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-TN' : 'fr-TN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function MonCompteForm({ profile }: { profile: CurrentProfile }) {
  const lang = useLang()
  const [supabase] = useState(() => createClient())

  // ── Section 1: identity ──
  const [fullName, setFullName] = useState(profile.full_name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [language, setLanguage] = useState(profile.language)
  const [phoneError, setPhoneError] = useState<string | undefined>(undefined)
  const [savingProfile, startProfile] = useTransition()

  // ── Section 2: password ──
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwError, setPwError] = useState<string | undefined>(undefined)
  const [savingPw, setSavingPw] = useState(false)

  // ── Section 3: delete ──
  const [deleteOpen, setDeleteOpen] = useState(false)

  const ini = initials(profile.full_name)
  const strength = newPw ? passwordStrength(newPw) : null
  const strengthMeta = {
    weak: { w: 'w-1/3', bar: 'bg-red-500', label: t('monCompte.password.tooShort', lang), text: 'text-red-600' },
    medium: { w: 'w-2/3', bar: 'bg-amber-500', label: t('monCompte.password.acceptable', lang), text: 'text-amber-600' },
    strong: { w: 'w-full', bar: 'bg-green-500', label: t('monCompte.password.secure', lang), text: 'text-green-600' },
  } as const

  function onProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) {
      document.getElementById('mc-fullName')?.focus()
      toast.error(t('monCompte.error.nameRequired', lang))
      return
    }
    if (phone.trim() && !isValidPhone(phone)) {
      setPhoneError(t('monCompte.error.phoneFormat', lang))
      document.getElementById('mc-phone')?.focus()
      return
    }
    setPhoneError(undefined)
    startProfile(async () => {
      const res = await updateProfileAction({ fullName, phone, city, language })
      if (res.ok) toast.success(t('monCompte.toast.profileUpdated', lang))
      else toast.error(res.error)
    })
  }

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPw || !newPw || !confirmPw) {
      setPwError(t('monCompte.password.required', lang))
      return
    }
    if (!isValidPassword(newPw)) {
      setPwError(t('monCompte.password.invalid', lang))
      return
    }
    if (newPw !== confirmPw) {
      setPwError(t('monCompte.password.mismatch', lang))
      return
    }
    setPwError(undefined)
    setSavingPw(true)
    // Verify the current password first (updateUser alone wouldn't check it).
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPw,
    })
    if (signInErr) {
      setSavingPw(false)
      toast.error(t('monCompte.password.error', lang))
      return
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: newPw })
    setSavingPw(false)
    if (updErr) {
      toast.error(t('monCompte.password.error', lang))
      return
    }
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    toast.success(t('monCompte.toast.passwordUpdated', lang))
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t('monCompte.title', lang)}</h1>
        <p className="mt-1 text-base text-text-muted">{t('monCompte.subtitle', lang)}</p>
      </div>

      {/* ── Section 1: Informations personnelles ── */}
      <form onSubmit={onProfileSubmit} className="card-premium outline-brand mb-6 rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-brand-accent" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-text-primary">{t('monCompte.section.info', lang)}</h2>
        </div>

        <div className="space-y-4">
          {/* Photo (disabled — no upload pipeline / no avatar column yet) */}
          <div className="flex items-center gap-4">
            <span
              className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-brand-primary text-2xl font-semibold text-white"
              aria-hidden="true"
            >
              {ini}
            </span>
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-muted opacity-60"
            >
              {t('monCompte.photo.change', lang)}
              <span className="text-xs">({t('monCompte.comingSoon', lang)})</span>
            </button>
          </div>

          {/* Nom complet */}
          <div>
            <label htmlFor="mc-fullName" className={labelCls}>
              {t('monCompte.field.fullName', lang)} <span className="text-red-500">*</span>
            </label>
            <input
              id="mc-fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={cn(fieldBase, FOCUS_RING)}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label htmlFor="mc-email" className={labelCls}>
              {t('monCompte.field.email', lang)}
            </label>
            <input
              id="mc-email"
              type="email"
              value={profile.email}
              readOnly
              disabled
              className={cn(fieldBase, 'cursor-not-allowed bg-slate-50 text-text-muted')}
            />
            <p className="mt-1 text-xs text-text-muted">{t('monCompte.field.emailHelp', lang)}</p>
          </div>

          {/* Téléphone */}
          <div>
            <label htmlFor="mc-phone" className={labelCls}>
              {t('monCompte.field.phone', lang)}
            </label>
            <input
              id="mc-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() =>
                setPhoneError(
                  phone.trim() && !isValidPhone(phone) ? t('monCompte.error.phoneFormat', lang) : undefined,
                )
              }
              placeholder={t('monCompte.field.phone_ph', lang)}
              className={cn(
                fieldBase,
                FOCUS_RING,
                phoneError && 'border-red-500 ring-2 ring-red-500/30',
              )}
            />
            {phoneError ? (
              <p className="mt-1 flex items-center gap-1 text-sm text-red-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {phoneError}
              </p>
            ) : (
              <p className="mt-1 text-xs text-text-muted">{t('monCompte.field.phoneHelp', lang)}</p>
            )}
          </div>

          {/* Date de naissance (read-only) */}
          <div>
            <label htmlFor="mc-dob" className={labelCls}>
              {t('monCompte.field.dob', lang)}
            </label>
            <input
              id="mc-dob"
              type="text"
              value={formatDob(profile.date_of_birth, lang)}
              readOnly
              disabled
              className={cn(fieldBase, 'cursor-not-allowed bg-slate-50 text-text-muted')}
            />
            <p className="mt-1 text-xs text-text-muted">{t('monCompte.field.dobHelp', lang)}</p>
          </div>

          {/* Ville */}
          <div>
            <label htmlFor="mc-city" className={labelCls}>
              {t('monCompte.field.city', lang)}
            </label>
            <select
              id="mc-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={cn(fieldBase, FOCUS_RING)}
            >
              <option value="">{t('monCompte.field.city_ph', lang)}</option>
              {GOVERNORATES.map((g) => (
                <option key={g.value} value={g.value}>
                  {lang === 'ar' ? g.ar : g.fr}
                </option>
              ))}
            </select>
          </div>

          {/* Langue */}
          <div>
            <label htmlFor="mc-language" className={labelCls}>
              {t('monCompte.field.language', lang)}
            </label>
            <select
              id="mc-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={cn(fieldBase, FOCUS_RING)}
            >
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
            <p className="mt-1 text-xs text-text-muted">{t('monCompte.field.languageHelp', lang)}</p>
          </div>

          <div>
            <button
              type="submit"
              disabled={savingProfile}
              className={cn(
                'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-accent px-6 text-sm font-semibold text-white shadow-md transition-all duration-200 ease-out hover:bg-brand-accent-light hover:shadow-lg disabled:opacity-60',
                FOCUS_RING,
              )}
            >
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {savingProfile ? t('monCompte.saving', lang) : t('monCompte.save', lang)}
            </button>
          </div>
        </div>
      </form>

      {/* ── Section 2: Changer mon mot de passe ── */}
      <form onSubmit={onPasswordSubmit} className="card-premium outline-brand mb-6 rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-brand-accent" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-text-primary">{t('monCompte.section.password', lang)}</h2>
        </div>

        <div className="space-y-4">
          <PasswordField
            id="mc-currentPw"
            label={t('monCompte.field.currentPassword', lang)}
            value={currentPw}
            onChange={setCurrentPw}
            autoComplete="current-password"
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
          />

          <div>
            <PasswordField
              id="mc-newPw"
              label={t('monCompte.field.newPassword', lang)}
              value={newPw}
              onChange={setNewPw}
              autoComplete="new-password"
              show={showNew}
              onToggle={() => setShowNew((v) => !v)}
            />
            {strength && (
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn('h-full rounded-full transition-all', strengthMeta[strength].w, strengthMeta[strength].bar)} />
                </div>
                <p className={cn('mt-1 text-xs', strengthMeta[strength].text)}>{strengthMeta[strength].label}</p>
              </div>
            )}
          </div>

          <div>
            <PasswordField
              id="mc-confirmPw"
              label={t('monCompte.field.confirmPassword', lang)}
              value={confirmPw}
              onChange={setConfirmPw}
              autoComplete="new-password"
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              onBlur={() =>
                setPwError(confirmPw && confirmPw !== newPw ? t('monCompte.password.mismatch', lang) : undefined)
              }
            />
          </div>

          {pwError && (
            <p className="flex items-center gap-1 text-sm text-red-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {pwError}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={savingPw}
              className={cn(
                'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border-subtle bg-white px-6 text-sm font-medium text-text-primary transition-colors hover:bg-slate-50 disabled:opacity-60',
                FOCUS_RING,
              )}
            >
              {savingPw && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {savingPw ? t('monCompte.password.submitting', lang) : t('monCompte.password.submit', lang)}
            </button>
          </div>
        </div>
      </form>

      {/* ── Section 3: Supprimer mon compte ── */}
      <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-red-900">{t('monCompte.section.delete', lang)}</h2>
        </div>
        <p className="text-sm text-red-800">{t('monCompte.delete.explain', lang)}</p>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className={cn(
            'mt-4 inline-flex h-11 items-center rounded-full border border-red-300 bg-white px-6 text-sm font-medium text-red-700 transition-colors hover:bg-red-100',
            FOCUS_RING,
          )}
        >
          {t('monCompte.delete.request', lang)}
        </button>
      </div>

      {deleteOpen && <DeleteAccountModal onClose={() => setDeleteOpen(false)} />}
    </div>
  )
}

// Module-level so it isn't re-created each render (no-unstable-nested-components).
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  show,
  onToggle,
  onBlur,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  show: boolean
  onToggle: () => void
  onBlur?: () => void
}) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn(fieldBase, 'pe-11', FOCUS_RING)}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="absolute inset-y-0 end-2 flex items-center px-2 text-text-muted hover:text-text-primary"
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
