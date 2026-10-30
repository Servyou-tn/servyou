import { MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import type { MyAnnonce } from '@/lib/marche/my-data'

// F3 « Mes annonces » — pure tab / search / sort / stats / paging over the consumer's own annonces (docs/design/mes-annonces-measurements.md,
// Figma 1476:27949). NO Supabase import (same split as proposals.ts): unit-testable, and `getMyAnnonces` stays the one read.
// The page filter bar is the H11 scaffold (tabs · search · sort), so the rules mirror it.

/** Rows per page — the frame draws 6; 10 matches H8 / H11. */
export const ANNONCES_PER_PAGE = 10

export const ANNONCE_TABS = ['all', 'active', 'closed'] as const
export type AnnonceTab = (typeof ANNONCE_TABS)[number]
export const DEFAULT_ANNONCE_TAB: AnnonceTab = 'all'

/** The frame draws no options (D8): newest first by default, then oldest, then most proposals. */
export const ANNONCE_SORTS = ['recent', 'oldest', 'responses'] as const
export type AnnonceSort = (typeof ANNONCE_SORTS)[number]
export const DEFAULT_ANNONCE_SORT: AnnonceSort = 'recent'

type Listed = Pick<MyAnnonce, 'display_status' | 'response_count' | 'created_at' | 'title' | 'category' | 'category_ar'>

export type AnnonceStats = {
  /** Every non-deleted annonce — « Publiées ». */
  published: number
  /** display_status 'open' — « Ouvertes n / published ». */
  open: number
  /** Sum of response_count — « Propositions reçues au total ». */
  proposals: number
  /** display_status 'filled' — « Pourvues ». */
  filled: number
}

export function annonceStats(all: readonly Listed[]): AnnonceStats {
  return {
    published: all.length,
    open: all.filter((a) => a.display_status === 'open').length,
    proposals: all.reduce((sum, a) => sum + a.response_count, 0),
    filled: all.filter((a) => a.display_status === 'filled').length,
  }
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** « Rechercher une annonce… » — the title or the category (French or Arabic name), accent- and case-insensitive. */
export function matchesAnnonceQuery(a: Pick<Listed, 'title' | 'category' | 'category_ar'>, q: string): boolean {
  const needle = fold(q.trim())
  if (!needle) return true
  return [a.title, a.category, a.category_ar].some((v) => v != null && fold(v).includes(needle))
}

function inTab(a: Pick<Listed, 'display_status'>, tab: AnnonceTab): boolean {
  if (tab === 'all') return true
  return tab === 'active' ? a.display_status === 'open' : a.display_status !== 'open'
}

export type AnnoncesPage<T extends Listed> = {
  annonces: T[]
  /** Rows matching the tab AND the search — what the caption counts and the pager pages over. */
  totalCount: number
  totalPages: number
  /** The page actually served (an out-of-range request is clamped). */
  page: number
  stats: AnnonceStats
}

/** Filter by tab and search, sort, slice one page. Stats always cover ALL annonces (a tile must not move with the tab). */
export function pageAnnonces<T extends Listed>(
  all: readonly T[],
  opts: { tab: AnnonceTab; q: string; sort: AnnonceSort; page: number },
): AnnoncesPage<T> {
  const filtered = all.filter((a) => inTab(a, opts.tab) && matchesAnnonceQuery(a, opts.q))
  const byDate = (a: T, b: T) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  const sorted = [...filtered].sort((a, b) => {
    if (opts.sort === 'oldest') return -byDate(a, b)
    if (opts.sort === 'responses') return b.response_count - a.response_count || byDate(a, b)
    return byDate(a, b)
  })
  const totalCount = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalCount / ANNONCES_PER_PAGE))
  // An integer whatever the URL said: `?page=1.5` would otherwise slice from row 5.
  const page = Math.min(Math.max(1, Math.floor(opts.page) || 1), totalPages)
  const start = (page - 1) * ANNONCES_PER_PAGE
  return {
    annonces: sorted.slice(start, start + ANNONCES_PER_PAGE),
    totalCount,
    totalPages,
    page,
    stats: annonceStats(all),
  }
}

/** The sub-line under « N propositions » — which i18n key, and whether it names the cap (« sur 10 maximum »). */
export function annonceProposalsNote(a: Pick<Listed, 'display_status' | 'response_count'>): {
  key: 'chosen' | 'none_kept' | 'waiting' | 'of_max'
  max?: number
} {
  if (a.display_status === 'filled') return { key: 'chosen' }
  if (a.display_status === 'expired') return { key: 'none_kept' }
  if (a.response_count === 0) return { key: 'waiting' }
  return { key: 'of_max', max: MAX_RESPONSES_PER_POST }
}
