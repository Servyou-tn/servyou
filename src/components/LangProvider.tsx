'use client'

import { createContext, useContext } from 'react'
import { Direction } from 'radix-ui'
import type { Lang } from '@/lib/i18n'

const LangContext = createContext<Lang>('fr')

// The language, and with it Radix's reading direction. <html dir> alone does not reach Radix: its positioned parts
// (dropdown menus, popovers) read a React context, which defaults to LTR — so in Arabic every `align="end"` panel opened
// on the wrong side (the profile menu, the bell, the filter menus). Rendered once at the root (src/app/layout.tsx).
export function LangProvider({
  lang,
  children,
}: {
  lang: Lang
  children: React.ReactNode
}) {
  return (
    <LangContext.Provider value={lang}>
      <Direction.DirectionProvider dir={lang === 'ar' ? 'rtl' : 'ltr'}>{children}</Direction.DirectionProvider>
    </LangContext.Provider>
  )
}

export function useLang(): Lang {
  return useContext(LangContext)
}
