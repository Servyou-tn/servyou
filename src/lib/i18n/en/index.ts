import type { PluralVariants } from '../plurals'
import * as common from './common'
import * as freelancer from './freelancer'
import * as shop from './shop'

// The English dictionary = the three owner files merged (see ownership.ts). They never share a key.
export const en: Record<string, string> = { ...common.strings, ...freelancer.strings, ...shop.strings }
export const enPlurals: Record<string, PluralVariants> = { ...common.plurals, ...freelancer.plurals, ...shop.plurals }
