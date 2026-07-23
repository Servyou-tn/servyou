import { FOCUS_RING } from '@/components/layout/styles'

// Shared class strings for the auth-funnel forms (signup, signin, forgot-password,
// new-password). The navy AuthShell box holds white "windows" — inputs are white-bg
// with dark text; labels/helpers are light on the navy. Centralised here so every
// form field looks identical; copied verbatim from the original Step-2 markup.
export const display = 'font-[family-name:var(--font-display)]'

export const labelClass = `${display} mb-1.5 block text-sm font-semibold text-white`
export const helpClass = 'mt-1.5 text-[13px] leading-snug text-brand-blue-200'
export const errorClass = 'mt-1.5 text-sm text-red-300'

export const inputBase = `${display} w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]/70 ${FOCUS_RING}`

export const primaryBtn = `${display} inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-accent)] text-[15px] font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70 ${FOCUS_RING}`
