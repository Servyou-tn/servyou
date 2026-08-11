'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/app/demander/[id]/_components/Textarea'
import { FOCUS_RING } from '@/components/layout/styles'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { createShopAction, uploadShopLogoAction, uploadShopBannerAction } from '../actions'
import { Stepper } from './Stepper'
import { LogoField } from './LogoField'
import { BannerField } from './BannerField'

// G2 step 1 "Bases" — Figma 555:37234/555:37236, measured in docs/design/g2-discovery.md.
//
// Images stay as client-held `File`s with `blob:` previews until submit — no network call while
// the user is filling the form. On submit: createShopAction inserts the shop (this is what BOTH
// footer buttons do, per the brief), then the two image actions upload one-per-call against the
// now-real shopId. Image failures are non-blocking (toast, not a blocked redirect) — the design
// measures both as optional, so a shop with no logo is an explicitly allowed outcome.

const NAME_MAX = 100
const DESC_MIN = 50
const DESC_MAX = 2000

type Errors = { name?: string; city?: string; description?: string }

export function CreateShopForm() {
  const lang = useLang()
  const router = useRouter()

  const [name, setName] = React.useState('')
  const [city, setCity] = React.useState('')
  const [description, setDescription] = React.useState('')

  const [logoFile, setLogoFile] = React.useState<File | null>(null)
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)
  const [bannerFile, setBannerFile] = React.useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = React.useState<string | null>(null)

  const [errors, setErrors] = React.useState<Errors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  // blob: URLs are minted per pick and must be released — either on replace or on unmount.
  React.useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
      if (bannerPreview) URL.revokeObjectURL(bannerPreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount-only cleanup, reading current state via closure would re-run this every render
  }, [])

  function pickLogo(file: File) {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function pickBanner(file: File) {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview)
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  function removeBanner() {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview)
    setBannerFile(null)
    setBannerPreview(null)
  }

  function validate(): Errors {
    const next: Errors = {}
    const trimmedName = name.trim()
    if (!trimmedName) next.name = t('shop.create.error.name_required', lang)
    else if (trimmedName.length > NAME_MAX) next.name = t('shop.create.error.name_max', lang, { max: NAME_MAX })

    if (!city) next.city = t('shop.create.error.city_required', lang)

    const trimmedDesc = description.trim()
    if (trimmedDesc.length < DESC_MIN) {
      next.description = t('shop.create.error.desc_min', lang, { min: DESC_MIN })
    } else if (trimmedDesc.length > DESC_MAX) {
      next.description = t('shop.create.error.desc_max', lang, { max: DESC_MAX })
    }
    return next
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return

    // Which button triggered this submit — read from the DOM submitter, not FormData (a disabled
    // submitter's name/value pair would be dropped from FormData, but this read happens
    // synchronously at click time, before `pending` disables anything).
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const intent = submitter?.dataset.intent === 'next' ? 'next' : 'draft'

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setFormError(t('shop.create.error.form', lang))
      return
    }

    setPending(true)
    setFormError(null)

    const res = await createShopAction({ name: name.trim(), city, description: description.trim() })
    if (!res.ok) {
      setPending(false)
      setFormError(res.error)
      if (res.field) setErrors((prev) => ({ ...prev, [res.field as keyof Errors]: res.error }))
      return
    }

    // Best-effort, sequential, non-blocking — a failed image upload leaves a shop with no logo/
    // banner (measured as an explicitly allowed state) rather than blocking the redirect.
    if (logoFile) {
      const fd = new FormData()
      fd.append('shopId', res.shopId)
      fd.append('file', logoFile)
      const logoRes = await uploadShopLogoAction(fd)
      if (!logoRes.ok) toast.error(logoRes.error)
    }
    if (bannerFile) {
      const fd = new FormData()
      fd.append('shopId', res.shopId)
      fd.append('file', bannerFile)
      const bannerRes = await uploadShopBannerAction(fd)
      if (!bannerRes.ok) toast.error(bannerRes.error)
    }

    // Stay pending through the navigation — the buttons must not go back to idle on a page that
    // is already being replaced. "Suivant" advances into step 2 (docs/design/g2-discovery.md §19 —
    // step 2 didn't exist when this file first shipped, Stepper.tsx's own comment flagged this as
    // the known gap); "Enregistrer et continuer plus tard" keeps its original destination.
    router.push(intent === 'next' ? '/ma-boutique/creer/configuration' : '/tableau-de-bord-vendeur')
  }

  const selectField = `w-full rounded-lg border px-4 h-11 bg-surface-base text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`

  return (
    <form
      id="create-shop-form"
      onSubmit={onSubmit}
      noValidate
      className="mx-auto flex w-full max-w-[760px] flex-col gap-6"
    >
      <div className="flex flex-col gap-6">
        <div>
          <nav aria-label="Fil d'Ariane" className="mb-3">
            <ol className="flex items-center gap-1.5 text-sm text-text-muted">
              <li>
                <Link href="/devenir-vendeur" className={`rounded ${FOCUS_RING}`}>
                  {t('shop.create.crumb_devenir', lang)}
                </Link>
              </li>
              <li aria-hidden="true" className="flex items-center">
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </li>
              <li aria-current="page" className="font-medium text-text-primary">
                {t('shop.create.crumb_current', lang)}
              </li>
            </ol>
          </nav>
          <h1 className="text-2xl font-semibold text-text-primary">{t('shop.create.page_title', lang)}</h1>
          <p className="mt-1.5 text-sm text-text-muted">{t('shop.create.page_subtitle', lang)}</p>
        </div>

        <Stepper
          steps={[
            { label: t('shop.create.step1_label', lang), state: 'active' },
            { label: t('shop.create.step2_label', lang), state: 'upcoming' },
          ]}
        />
      </div>

      <div className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-4 sm:p-6">
        <LogoField previewUrl={logoPreview} onPick={pickLogo} />

        <BannerField previewUrl={bannerPreview} onPick={pickBanner} onRemove={removeBanner} />

        <Input
          id="shop-name"
          label={t('shop.create.name_label', lang)}
          placeholder={t('shop.create.name_ph', lang)}
          helper={t('shop.create.name_helper', lang)}
          error={errors.name}
          required
          counter
          maxLength={NAME_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="shop-city" className="text-sm font-medium text-text-secondary">
            {t('shop.create.city_label', lang)}
            <span aria-hidden="true" className="text-danger-500"> *</span>
          </label>
          <select
            id="shop-city"
            aria-required="true"
            aria-invalid={errors.city ? true : undefined}
            aria-describedby={errors.city ? 'shop-city-error' : undefined}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={`${selectField} ${errors.city ? 'border-danger-500' : 'border-border-strong'}`}
          >
            <option value="">{t('shop.create.city_ph', lang)}</option>
            {GOVERNORATES.map((g) => (
              <option key={g.value} value={g.value}>
                {lang === 'ar' ? g.ar : g.fr}
              </option>
            ))}
          </select>
          {errors.city && (
            <p id="shop-city-error" className="text-sm text-danger-500">
              {errors.city}
            </p>
          )}
        </div>

        <Textarea
          id="shop-description"
          label={t('shop.create.desc_label', lang)}
          placeholder={t('shop.create.desc_ph', lang)}
          helper={t('shop.create.desc_helper', lang)}
          error={errors.description}
          required
          counter
          maxLength={DESC_MAX}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {formError && (
        <p role="alert" className="text-sm text-danger-500">
          {formError}
        </p>
      )}

      {/* Footer — flex-col-reverse below sm: puts the LAST DOM child (Suivant) on top when
          stacked, matching the founder's inferred rule for the unmeasured 375 case (no frame
          exists to check the 288+91px pair against 311px available). At sm: and above it becomes
          a normal row, matching the measured desktop layout (secondary start, Suivant end). */}
      <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" variant="secondary" size="lg" loading={pending} className="w-full sm:w-auto">
          {pending ? t('shop.create.submitting', lang) : t('shop.create.save_draft', lang)}
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={pending}
          data-intent="next"
          className="w-full sm:w-auto"
        >
          {pending ? t('shop.create.submitting', lang) : t('shop.create.next', lang)}
        </Button>
      </div>
    </form>
  )
}
