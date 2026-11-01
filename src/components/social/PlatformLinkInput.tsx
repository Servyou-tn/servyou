'use client'

import { Input, type InputProps } from '@/components/ui/input'
import { PlatformIcon } from './PlatformIcon'
import { detectPlatform, type PlatformId } from '@/lib/social/platforms'

// The DS Input for ONE address, with the detected platform's glyph in the field's start slot (`iconStart`) as you type: paste a GitHub link and the
// GitHub mark appears, a LinkedIn link and it turns into LinkedIn, anything else is the globe. `hint` is the platform a row was PRE-SET to (a
// « + LinkedIn » button): its glyph shows while the field is still empty. The address is LTR whatever the page direction.
export function PlatformLinkInput({ hint = null, value, ...props }: Omit<InputProps, 'iconStart'> & { hint?: PlatformId | null }) {
  const text = typeof value === 'string' ? value : ''
  const detected = detectPlatform(text)
  const shown = text.trim() === '' ? hint : detected // the hint only speaks for an EMPTY field — a typed address is what it is
  const known = shown !== null && shown !== 'website'
  return (
    <Input
      dir="ltr"
      type="text"
      inputMode="url"
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      value={value}
      iconStart={
        <span className={known ? 'text-text-secondary' : 'text-text-muted'}>
          <PlatformIcon platform={shown} />
        </span>
      }
      {...props}
    />
  )
}
