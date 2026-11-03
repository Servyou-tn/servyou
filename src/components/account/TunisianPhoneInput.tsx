'use client'

import { Input } from '@/components/ui/input'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// The « +216 | 8 chiffres » phone field, same markup as Mon compte's (MonCompteForm.tsx), for the two places that now
// ask for a seller's contact phone: the freelance profile wizard (step 1) and « Créer ma boutique ». The value is the 8
// local digits; the server action validates and normalizes it (isValidPhone / normalizePhone, src/lib/phone.ts).
export function TunisianPhoneInput({
  id,
  lang,
  value,
  onChange,
  error,
  helper,
  className,
}: {
  id: string
  lang: Lang
  value: string
  onChange: (value: string) => void
  error?: string
  helper: string
  className?: string
}) {
  return (
    <Input
      id={id}
      className={className}
      label={t('monCompte.field.phone', lang)}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      dir="ltr"
      maxLength={16}
      required
      placeholder={t('monCompte.field.phone_ph', lang)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      helper={helper}
      error={error}
      iconStart={
        // dir="ltr" keeps « +216 | » reading in that order (RTL flipped it to « 216+ »), and
        // rtl:order-last puts it on the left of the digits, where a phone number is read.
        <span dir="ltr" className="flex shrink-0 items-center gap-2 text-base text-text-secondary rtl:order-last">
          +216
          <span aria-hidden="true" className="h-5 w-px bg-border-subtle" />
        </span>
      }
    />
  )
}
