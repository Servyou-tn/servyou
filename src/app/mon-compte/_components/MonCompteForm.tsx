'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusPill } from '@/components/ui/status-pill'
import { FOCUS_RING } from '@/components/layout/styles'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { updateProfileAction, type AccountActionField } from '@/app/mon-compte/actions'
import type { CurrentProfile, DeletionContext } from '@/lib/marche/mon-compte'
import { resolveRole } from '@/lib/roles'
import { t, type Lang } from '@/lib/i18n'
import { AvatarUploadCard } from './AvatarUploadCard'
import { ChangePasswordModal } from './ChangePasswordModal'
import { DeleteAccountModal } from './DeleteAccountModal'

// I1 « Mon compte » — Figma 724:63872 (1440) / 728:64216 (375), docs/design/i1-k-measurements.md.
// Three panels in a centred 720 column + a save bar. Editable: full_name, city, phone (+ the avatar,
// which saves on its own). Language is I2's: it is passed through unchanged. Email and date of birth
// are locked at the column grants, so email is read-only here (D10).

const PANEL = 'flex w-full flex-col gap-5 rounded-xl border border-border-subtle bg-surface-base p-6'
const PANEL_HEADING = 'text-xl font-semibold text-text-primary'
const SELECT_FIELD =
  'h-11 w-full rounded-lg border border-border-strong bg-surface-base px-4 text-base text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600 focus-visible:ring-offset-2'

// profiles.phone is stored canonical (+216XXXXXXXX); the field shows the 8 local digits after a fixed +216.
const toLocalPhone = (stored: string | null) => (stored ?? '').replace(/^\+216/, '')

export function MonCompteForm({
  profile,
  avatarUrl,
  deletion,
  lang,
}: {
  profile: CurrentProfile
  avatarUrl: string | null
  deletion: DeletionContext
  lang: Lang
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [saved, setSaved] = useState({
    fullName: profile.full_name,
    city: profile.city ?? '',
    phone: toLocalPhone(profile.phone),
  })
  const [fullName, setFullName] = useState(saved.fullName)
  const [city, setCity] = useState(saved.city)
  const [phone, setPhone] = useState(saved.phone)
  const [fieldError, setFieldError] = useState<{ field: AccountActionField; text: string } | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isDirty = fullName !== saved.fullName || city !== saved.city || phone !== saved.phone
  const errorFor = (f: AccountActionField) => (fieldError?.field === f ? fieldError.text : undefined)

  const role = resolveRole(profile)
  const accountType = role === 'freelancer' ? 'freelance' : role === 'shop_owner' ? 'boutique' : 'client'

  function cancel() {
    setFullName(saved.fullName)
    setCity(saved.city)
    setPhone(saved.phone)
    setFieldError(null)
  }

  function save() {
    setFieldError(null)
    startTransition(async () => {
      // Language is I2's: not sent, so this save never touches it.
      const res = await updateProfileAction({ fullName, phone, city })
      if (!res.ok) {
        if (res.field) setFieldError({ field: res.field, text: res.error })
        else toast.error(res.error)
        return
      }
      setSaved({ fullName: fullName.trim(), city, phone: phone.trim() })
      setFullName(fullName.trim())
      setPhone(phone.trim())
      toast.success(t('monCompte.toast.profileUpdated', lang))
      // The top bar shows the name.
      router.refresh()
    })
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
        <section className={PANEL} aria-labelledby="account-profile-title">
          <h2 id="account-profile-title" className={PANEL_HEADING}>
            {t('monCompte.section.profile', lang)}
          </h2>

          <AvatarUploadCard avatarUrl={avatarUrl} fullName={fullName || profile.full_name} lang={lang} />

          <Input
            className="max-w-70"
            label={t('monCompte.field.fullName', lang)}
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errorFor('fullName')}
          />

          <div className="flex max-w-70 flex-col gap-2">
            <label htmlFor="account-city" className="text-sm font-medium text-text-secondary">
              {t('monCompte.field.city', lang)}
            </label>
            <select
              id="account-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-invalid={errorFor('city') ? true : undefined}
              className={SELECT_FIELD}
            >
              <option value="">{t('monCompte.field.city_ph', lang)}</option>
              {GOVERNORATES.map((g) => (
                <option key={g.value} value={g.value}>
                  {lang === 'ar' ? g.ar : g.fr}
                </option>
              ))}
            </select>
            {errorFor('city') && <p className="text-sm text-danger-500">{errorFor('city')}</p>}
          </div>

          <div className="flex min-h-25 items-center justify-between gap-4 py-1">
            <p className="text-sm text-text-secondary">{t('monCompte.field.accountType', lang)}</p>
            <div className="flex items-center gap-3">
              {role === null && (
                <Link href="/devenir-vendeur" className={`rounded text-sm font-semibold text-brand-blue-600 hover:underline ${FOCUS_RING}`}>
                  {t('monCompte.accountType.becomeSeller', lang)}
                </Link>
              )}
              <StatusPill status={accountType}>{t(`monCompte.accountType.${accountType}`, lang)}</StatusPill>
            </div>
          </div>
        </section>

        <section className={PANEL} aria-labelledby="account-security-title">
          <h2 id="account-security-title" className={PANEL_HEADING}>
            {t('monCompte.section.security', lang)}
          </h2>

          <Input
            className="max-w-70"
            label={t('monCompte.field.email', lang)}
            type="email"
            dir="ltr"
            readOnly
            value={profile.email}
            helper={t('monCompte.field.emailHelp', lang)}
          />

          <Input
            className="max-w-70"
            label={t('monCompte.field.phone', lang)}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            dir="ltr"
            maxLength={16}
            placeholder={t('monCompte.field.phone_ph', lang)}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            helper={t('monCompte.field.phoneHelp', lang)}
            error={errorFor('phone')}
            iconStart={
              // dir="ltr" keeps « +216 | » reading in that order (RTL flipped it to « 216+ »), and
              // rtl:order-last puts it on the left of the digits, where a phone number is read.
              <span dir="ltr" className="flex shrink-0 items-center gap-2 text-base text-text-secondary rtl:order-last">
                +216
                <span aria-hidden="true" className="h-5 w-px bg-border-subtle" />
              </span>
            }
          />

          <hr className="w-full max-w-80 border-border-subtle" />

          <div className="flex min-h-25 flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-text-primary">{t('monCompte.password.row', lang)}</p>
            <Button type="button" variant="secondary" size="md" onClick={() => setPasswordOpen(true)}>
              {t('monCompte.password.change', lang)}
            </Button>
          </div>
        </section>

        <section className="flex w-full flex-col items-start gap-3 rounded-xl border-2 border-danger-500 bg-surface-base p-6" aria-labelledby="account-delete-title">
          <h2 id="account-delete-title" className="text-[15px] font-semibold text-danger-700">
            {t('monCompte.section.delete', lang)}
          </h2>
          <p className="text-sm text-text-muted">
            {deletion.pending ? t('monCompte.delete.pendingNote', lang) : t('monCompte.delete.explain', lang)}
          </p>
          {deletion.pending ? (
            <Button type="button" variant="danger" size="md" disabled>
              {t('monCompte.delete.pending', lang)}
            </Button>
          ) : (
            <Button type="button" variant="danger" size="md" onClick={() => setDeleteOpen(true)}>
              {t('monCompte.section.delete', lang)}
            </Button>
          )}
        </section>
      </div>

      {/* Save bar — 724:63911. Desktop: caption left, Annuler + Enregistrer right, centred on the
          720 column. 375 (728:64244): stacked full-width, Enregistrer FIRST. */}
      <div className="mt-8 border-t border-border-subtle py-5">
        <div className="mx-auto flex w-full max-w-180 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-text-muted" aria-live="polite">
            {isDirty && (
              <>
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-warning-500" />
                {t('monCompte.footer.dirty', lang)}
              </>
            )}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
            <Button type="button" variant="primary" size="lg" onClick={save} loading={pending} disabled={!isDirty}>
              {t('monCompte.save', lang)}
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={cancel} disabled={pending || !isDirty}>
              {t('monCompte.footer.cancel', lang)}
            </Button>
          </div>
        </div>
      </div>

      {passwordOpen && <ChangePasswordModal lang={lang} onClose={() => setPasswordOpen(false)} />}
      {deleteOpen && <DeleteAccountModal lang={lang} openOrders={deletion.openOrders} onClose={() => setDeleteOpen(false)} />}
    </>
  )
}
