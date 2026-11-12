'use client'

import * as React from 'react'
import { Input, type InputProps } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PasswordRevealButton, PASSWORD_INPUT_ATTRS, usePasswordReveal } from './password-reveal'

// A password field = the design-system Input (unchanged, F3 primitive) + its show / hide eye in the trailing slot.
// Every prop goes through to Input; only `type` (owned here) and `iconEnd` (the eye) are taken. The id is generated the
// way Input generates it, so the eye's aria-controls can point at the input.
//
// The eye is 44 × 44: the field is h-11 with a 1 px border, so the button overhangs its 42 px content box by 1 px top and
// bottom (nothing paints there — the field has no overflow clip without a suffix), and `-me-3` pulls it over the field's
// 16 px end padding so the glyph sits near the end edge. Edge's own reveal icon (::-ms-reveal) is hidden: never two eyes.
export function PasswordInput({ id, className, ...props }: Omit<InputProps, 'type' | 'iconEnd'>) {
  const reactId = React.useId()
  const inputId = id ?? `${reactId}-input`
  const { shown, toggle } = usePasswordReveal(inputId)
  return (
    <Input
      {...PASSWORD_INPUT_ATTRS}
      {...props}
      id={inputId}
      type={shown ? 'text' : 'password'}
      className={cn('[&_input::-ms-reveal]:hidden', className)}
      iconEnd={<PasswordRevealButton controls={inputId} shown={shown} onToggle={toggle} className="-me-3 rounded-lg" />}
    />
  )
}
