import type { PluralVariants } from '../plurals'

// English strings owned by the Shop agent (worktree servyou-wt-en-shop, branch feat/i18n-en-shop).
// Keys: exactly the French keys of fr.ts / plurals.ts that ownership.ts gives to « shop ». Same {placeholders} as French.
// A key missing here falls back to French (t / tn), so this file can fill up page by page.
export const strings: Record<string, string> = {}

export const plurals: Record<string, PluralVariants> = {}
