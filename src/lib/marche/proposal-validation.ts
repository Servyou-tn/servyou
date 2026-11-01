import { isHttpUrl } from '@/lib/freelancer/http-url'
import { hasUserinfo } from '@/lib/social/platforms'
import {
  PROPOSAL_LINKS_MAX,
  PROPOSAL_LINK_LABEL_MAX,
  PROPOSAL_LINK_URL_MAX,
  PROPOSAL_MESSAGE_MAX,
  PROPOSAL_MESSAGE_MIN,
  PROPOSAL_PRICE_LIMIT,
  PROPOSAL_SKILLS_MAX,
  PROPOSAL_SKILL_MAX,
  PROPOSAL_TIMEFRAME_MAX,
} from '@/lib/job-constants'
import { skillKey } from './skills-match'

// H12 proposal validation (docs/design/h9-h13-measurements.md D-H12-5). Pure and shared: the form runs it for instant
// field errors and the server action runs the SAME function before any write, so a client pass cannot become a server
// reject the user never saw coming. The DB re-checks everything (job_responses CHECKs + triggers) — this is not the gate.
//
// Errors are i18n KEYS, never resolved text (a language switch re-translates a stored error).

export type ProposalLinkInput = { label: string; url: string }

/** What the form holds / sends. Everything is a string the user typed, not yet parsed. */
export type ProposalInput = {
  jobPostId: string
  message: string
  links: ProposalLinkInput[]
  /** « 1500 » · « 1500,5 » · « » (empty = « Selon budget »). */
  price: string
  timeframe: string
  skills: string[]
}

export type ProposalErrors = {
  message?: string
  /** Index-aligned with the INPUT rows (empty rows are skipped, so their slot is undefined). */
  links?: (string | undefined)[]
  price?: string
  timeframe?: string
  skills?: string
}

/** The cleaned value the action writes. */
export type ProposalValue = {
  message: string
  links: { url: string; label?: string }[]
  price: number | null
  timeframe: string | null
  skills: string[]
}

export type ProposalValidation = { ok: true; value: ProposalValue } | { ok: false; errors: ProposalErrors }

const PRICE_RE = /^\d+(\.\d{1,2})?$/

// The DB measures char_length (code points); JS `.length` counts UTF-16 units, so ten emoji read as 20. Count code points.
const len = (s: string) => Array.from(s).length

export function validateProposal(input: Pick<ProposalInput, 'message' | 'links' | 'price' | 'timeframe' | 'skills'>): ProposalValidation {
  const errors: ProposalErrors = {}

  const message = input.message.trim()
  if (message === '') errors.message = 'proposal.error.message_required'
  else if (len(message) < PROPOSAL_MESSAGE_MIN) errors.message = 'proposal.error.message_short'
  else if (len(message) > PROPOSAL_MESSAGE_MAX) errors.message = 'proposal.error.message_long'

  // Links: a row with neither a label nor a URL is simply empty and skipped; a row with a label but no URL is an error.
  const links: { url: string; label?: string }[] = []
  const linkErrors: (string | undefined)[] = []
  const seen = new Set<string>()
  let usedRows = 0
  for (const row of input.links) {
    const url = row.url.trim()
    const label = row.label.trim()
    if (url === '' && label === '') {
      linkErrors.push(undefined)
      continue
    }
    usedRows += 1
    let err: string | undefined
    // The DB trigger requires ^https?://[^[:space:]]+$ — a URL with any whitespace inside is refused there, so refuse it here.
    // user:password@ is refused like any non-address: `https://github.com@evil.io` opens evil.io (links kit, founder Oct 31).
    if (url === '' || !isHttpUrl(url) || /\s/.test(url) || hasUserinfo(url)) err = 'proposal.error.link_url'
    else if (len(url) > PROPOSAL_LINK_URL_MAX) err = 'proposal.error.link_url_long'
    else if (len(label) > PROPOSAL_LINK_LABEL_MAX) err = 'proposal.error.link_label_long'
    else if (seen.has(url.toLowerCase())) err = 'proposal.error.link_duplicate'
    linkErrors.push(err)
    if (!err) {
      seen.add(url.toLowerCase())
      links.push(label ? { url, label } : { url })
    }
  }
  if (usedRows > PROPOSAL_LINKS_MAX) linkErrors.push('proposal.error.links_max')
  if (linkErrors.some(Boolean)) errors.links = linkErrors

  let price: number | null = null
  const priceRaw = input.price.trim().replace(',', '.')
  if (priceRaw !== '') {
    const n = Number(priceRaw)
    if (!PRICE_RE.test(priceRaw) || !Number.isFinite(n) || n < 0 || n >= PROPOSAL_PRICE_LIMIT) errors.price = 'proposal.error.price_invalid'
    else price = n
  }

  const timeframe = input.timeframe.trim()
  if (len(timeframe) > PROPOSAL_TIMEFRAME_MAX) errors.timeframe = 'proposal.error.timeframe_long'

  const skills: string[] = []
  const skillSeen = new Set<string>()
  for (const raw of input.skills) {
    const s = raw.trim()
    const key = skillKey(s)
    if (!key || skillSeen.has(key)) continue
    skillSeen.add(key)
    if (len(s) > PROPOSAL_SKILL_MAX) {
      errors.skills = 'proposal.error.skills_invalid'
      continue
    }
    skills.push(s)
  }
  if (skills.length > PROPOSAL_SKILLS_MAX) errors.skills = 'proposal.error.skills_max'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { message, links, price, timeframe: timeframe === '' ? null : timeframe, skills } }
}
