'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { StatusPill } from '@/components/ui/status-pill'
import { PlatformIcon } from '@/components/social/PlatformIcon'
import { useLang } from '@/components/LangProvider'
import { FOCUS_RING } from '@/components/layout/styles'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { SHOP_SOCIAL_COLUMNS, SHOP_SOCIAL_PLATFORMS, type ShopSocialPlatform } from '@/lib/shops/social-links'

export type ShopSocialValues = Record<ShopSocialPlatform, string>
export type ShopSocialErrors = Partial<Record<ShopSocialPlatform, string>>

// G3 « Réseaux sociaux (optionnel) » — the closed accordion at the end of the form (approved 2026-10-31: sl-g3-1440 / sl-g3-375 closed,
// sl-g3-open opened; docs/design/shop-social-links-measurements.md). Native <details>, like every accordion here. Not G2's AccordionSection:
// the frame's title is 20 Semi Bold (G2's 16), its body has no divider and pads 4 / 24 / 24 with a 16 gap, and at 375 the header stacks
// (title, then the pill + chevron row).
//   header — p 20 / 24 (375: 20 / 16), title 20 Semi Bold; pill « Optionnel » (grey) while all three are empty, « Complété » (green) once one is set.
//   body   — intro 14 / 21 text-secondary; per field: a label row (the platform's 18 icon + 14 Semi Bold text-primary, gap 8), then the 44 input,
//            8 apart; fields 16 apart. The address is LTR in both languages (founder ruling on the links kit).
// It opens by itself when one of its fields has an error, so a refused link is never hidden in a closed section.
const LABEL_KEY: Record<ShopSocialPlatform, string> = {
  facebook: 'shop.edit.social.facebook_label',
  instagram: 'shop.edit.social.instagram_label',
  tiktok: 'shop.edit.social.tiktok_label',
}
const PLACEHOLDER_KEY: Record<ShopSocialPlatform, string> = {
  facebook: 'shop.edit.social.facebook_ph',
  instagram: 'shop.edit.social.instagram_ph',
  tiktok: 'shop.edit.social.tiktok_ph',
}

export function SocialLinksSection({
  values,
  errors,
  onChange,
}: {
  values: ShopSocialValues
  errors: ShopSocialErrors
  onChange: (platform: ShopSocialPlatform, value: string) => void
}) {
  const lang = useLang()
  const complete = SHOP_SOCIAL_PLATFORMS.some((p) => values[p].trim() !== '')
  const hasError = SHOP_SOCIAL_PLATFORMS.some((p) => errors[p])
  // Opened imperatively when an error appears, never closed by code: an `open` prop would also CLOSE the section the moment the error clears.
  const ref = React.useRef<HTMLDetailsElement>(null)
  React.useEffect(() => {
    if (hasError && ref.current) ref.current.open = true
  }, [hasError])

  return (
    <details
      ref={ref}
      className="group rounded-card border border-border-subtle bg-surface-base [&_summary::-webkit-details-marker]:hidden"
    >
      <summary
        className={cn(
          'flex cursor-pointer gap-3 rounded-card px-4 py-5 max-sm:flex-col sm:items-center sm:justify-between sm:px-6',
          FOCUS_RING,
        )}
      >
        <span className="text-h3 leading-[26px] text-text-primary">{t('shop.edit.social.title', lang)}</span>
        <span className="flex shrink-0 items-center gap-3 max-sm:justify-between">
          <StatusPill status={complete ? 'complete' : 'optional'}>
            {t(complete ? 'shop.edit.social.badge_complete' : 'boutique.config.badge_optional', lang)}
          </StatusPill>
          <ChevronDown aria-hidden="true" className="size-5 text-text-muted transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="flex flex-col gap-4 px-4 pt-1 pb-6 sm:px-6">
        <p className="text-body-sm text-text-secondary">{t('shop.edit.social.intro', lang)}</p>
        {SHOP_SOCIAL_PLATFORMS.map((platform) => {
          const id = `shop-${SHOP_SOCIAL_COLUMNS[platform]}`
          return (
            <div key={platform} className="flex flex-col gap-2">
              <label htmlFor={id} className="flex w-fit items-center gap-2 text-body-sm font-semibold text-text-primary">
                <PlatformIcon platform={platform} className="size-4.5 shrink-0 text-text-secondary" />
                {t(LABEL_KEY[platform], lang)}
              </label>
              <Input
                id={id}
                dir="ltr"
                type="text"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={300}
                placeholder={t(PLACEHOLDER_KEY[platform], lang)}
                value={values[platform]}
                error={errors[platform]}
                onChange={(e) => onChange(platform, e.target.value)}
              />
            </div>
          )
        })}
      </div>
    </details>
  )
}
