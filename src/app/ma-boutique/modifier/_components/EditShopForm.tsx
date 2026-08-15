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
import { LogoField } from '../../creer/_components/LogoField'
import { BannerField } from '../../creer/_components/BannerField'
import { updateShopAction, updateShopLogoAction, updateShopBannerAction, removeShopBannerAction } from '../actions'

// G3 "Modifier ma boutique" — identity-field edit (name, city, description, logo, banner). A
// SEPARATE component from CreateShopForm, not a mode-prop fork: chrome (breadcrumb target, no
// Stepper, one footer button vs two, action identity, post-submit destination) differs on four
// axes, and CreateFreelancerProfileForm's own `initial?` prop only ever drove FIELD VALUES, never
// chrome — it was never precedent for forcing this through a shared component. What genuinely is
// shared is reused UNMODIFIED: Input, Textarea, LogoField, BannerField, the governorate select.
//
// The other six accordions (type, livraison, horaires, adresse, paiement, catégories) already have
// a real edit surface at /ma-boutique/creer/configuration (#129) — this form does not touch them,
// it only links across.
//
// No StatusPill: shops.is_published does not exist, so there is no state to reflect. "Voir ma
// boutique" stays as a plain secondary link (not part of any draft/publish machine — D3 is
// unconditionally viewable regardless of this form's state).

const NAME_MAX = 100
const DESC_MIN = 50
const DESC_MAX = 2000

type Errors = { name?: string; city?: string; description?: string }

export type EditShopInitial = {
  name: string
  city: string
  description: string
  logoUrl: string | null
  bannerUrl: string | null
}

export function EditShopForm({ shopId, initial }: { shopId: string; initial: EditShopInitial }) {
  const lang = useLang()
  const router = useRouter()

  const [name, setName] = React.useState(initial.name)
  const [city, setCity] = React.useState(initial.city)
  const [description, setDescription] = React.useState(initial.description)

  // logoFile/bannerFile are non-null only for a NEWLY PICKED, not-yet-uploaded file. previewUrl
  // starts as the EXISTING stored URL (a real https:// URL, not a blob:) and both fields render it
  // identically — LogoField/BannerField only ever consume previewUrl, they don't care which kind
  // of URL it is.
  const [logoFile, setLogoFile] = React.useState<File | null>(null)
  const [logoPreview, setLogoPreview] = React.useState<string | null>(initial.logoUrl)
  const [bannerFile, setBannerFile] = React.useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = React.useState<string | null>(initial.bannerUrl)
  // True only when the owner removed an EXISTING stored banner with no replacement picked — the
  // signal that tells onSubmit to actually delete it server-side, not just clear local state.
  const [bannerRemoved, setBannerRemoved] = React.useState(false)

  const [errors, setErrors] = React.useState<Errors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  // Only ever revokes a blob: URL this component minted itself (via pickLogo/pickBanner) — the
  // initial stored URL is never a blob: and is never revoked.
  React.useEffect(() => {
    return () => {
      if (logoFile && logoPreview) URL.revokeObjectURL(logoPreview)
      if (bannerFile && bannerPreview) URL.revokeObjectURL(bannerPreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount-only cleanup, reading current state via closure would re-run this every render
  }, [])

  function pickLogo(file: File) {
    if (logoFile && logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function pickBanner(file: File) {
    if (bannerFile && bannerPreview) URL.revokeObjectURL(bannerPreview)
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
    setBannerRemoved(false) // a fresh pick supersedes any pending removal
  }

  // BannerField's single "Retirer l'image" affordance means two different things depending on
  // what is currently showing:
  //   - a local unsaved pick showing  -> X UNDOES the pick, reverting to the stored banner (or to
  //     empty if the shop never had one) — same semantics CreateShopForm gives it.
  //   - the stored banner showing     -> X means DELETE IT, so onSubmit must call
  //     removeShopBannerAction rather than silently no-op.
  function removeBanner() {
    if (bannerFile) {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview)
      setBannerFile(null)
      setBannerPreview(initial.bannerUrl)
      // Restoring the stored banner must also clear any EARLIER removal intent from this same
      // session (remove stored banner -> pick a file -> undo the pick) — otherwise the undo
      // silently leaves bannerRemoved=true while the UI shows the banner restored, and submit
      // deletes the very banner it just displayed as kept.
      setBannerRemoved(false)
      return
    }
    setBannerPreview(null)
    setBannerRemoved(true)
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

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setFormError(t('shop.create.error.form', lang))
      return
    }

    setPending(true)
    setFormError(null)

    const res = await updateShopAction({ name: name.trim(), city, description: description.trim() })
    if (!res.ok) {
      setPending(false)
      setFormError(res.error)
      if (res.field) setErrors((prev) => ({ ...prev, [res.field as keyof Errors]: res.error }))
      return
    }

    // Best-effort, sequential, non-blocking — same convention as CreateShopForm: a failed image
    // action leaves the identity fields saved rather than blocking the redirect.
    if (logoFile) {
      const fd = new FormData()
      fd.append('file', logoFile)
      const logoRes = await updateShopLogoAction(fd)
      if (!logoRes.ok) toast.error(logoRes.error)
    }
    if (bannerFile) {
      const fd = new FormData()
      fd.append('file', bannerFile)
      const bannerRes = await updateShopBannerAction(fd)
      if (!bannerRes.ok) toast.error(bannerRes.error)
    } else if (bannerRemoved) {
      const removeRes = await removeShopBannerAction()
      if (!removeRes.ok) toast.error(removeRes.error)
    }

    router.push('/tableau-de-bord-vendeur')
  }

  const selectField = `w-full rounded-lg border px-4 h-11 bg-surface-base text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`

  return (
    <form
      id="edit-shop-form"
      onSubmit={onSubmit}
      noValidate
      className="mx-auto flex w-full max-w-[760px] flex-col gap-6"
    >
      <div>
        <nav aria-label="Fil d'Ariane" className="mb-3">
          <ol className="flex items-center gap-1.5 text-sm text-text-muted">
            <li>
              <Link href="/tableau-de-bord-vendeur" className={`rounded ${FOCUS_RING}`}>
                {t('shop.edit.crumb_shop', lang)}
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center">
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </li>
            <li aria-current="page" className="font-medium text-text-primary">
              {t('shop.edit.crumb_current', lang)}
            </li>
          </ol>
        </nav>
        <h1 className="text-2xl font-semibold text-text-primary">{t('shop.edit.page_title', lang)}</h1>
        <p className="mt-1.5 text-sm text-text-muted">{t('shop.edit.page_subtitle', lang)}</p>
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

      {/* Link to the other six accordions — INFERRED, no frame drew a two-page split (G3 was
          designed assuming all fields lived on one page). /ma-boutique/creer/configuration
          already handles them (#129) and needs nothing from this form. */}
      <Link
        href="/ma-boutique/creer/configuration"
        className={`self-start rounded text-body-sm text-brand-blue-600 hover:underline ${FOCUS_RING}`}
      >
        {t('shop.edit.config_link', lang)}
      </Link>

      {formError && (
        <p role="alert" className="text-sm text-danger-500">
          {formError}
        </p>
      )}

      {/* Single primary save + a secondary "Voir ma boutique" link (D3 is unconditionally
          viewable — not gated on any publish state, since none exists). Ghost-button classes
          copied onto a Link, same improvised pattern tableau-de-bord-vendeur/page.tsx already
          uses where a Button-shaped control must navigate instead of submit. */}
      <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/boutique/${shopId}`}
          className={`relative inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg px-6 text-base font-semibold whitespace-nowrap text-brand-blue-600 transition-colors hover:bg-brand-blue-50 active:bg-brand-blue-100 motion-reduce:transition-none sm:w-auto ${FOCUS_RING}`}
        >
          {t('shop.edit.view_public', lang)}
        </Link>
        <Button type="submit" variant="primary" size="lg" loading={pending} className="w-full sm:w-auto">
          {pending ? t('shop.create.saving', lang) : t('shop.edit.save', lang)}
        </Button>
      </div>
    </form>
  )
}
