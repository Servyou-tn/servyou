// The H3 « Modifier mon profil » sections the dashboard's « Force du profil » checklist points at (`?section=…`): ONE list, so the link the
// dashboard builds and the page that opens the accordion can never drift. `photo` is the identity panel at the top (no accordion); the others
// are accordions — `liens` is « Confiance & liens », `bio` « À propos », `competences` « Compétences & langues », `realisations` « Portfolio ».
export const PROFILE_SECTIONS = ['photo', 'bio', 'competences', 'realisations', 'liens'] as const
export type ProfileSection = (typeof PROFILE_SECTIONS)[number]

export const EDIT_PROFILE_PATH = '/mon-profil-freelance/modifier'

export const profileSectionHref = (section: ProfileSection): string => `${EDIT_PROFILE_PATH}?section=${section}`

/** The `?section=` value, or null for anything that is not one of ours (never trusted into an id lookup). */
export function parseProfileSection(raw: string | string[] | undefined | null): ProfileSection | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return (PROFILE_SECTIONS as readonly string[]).includes(value ?? '') ? (value as ProfileSection) : null
}

/** The number of portfolio items « Ajoutez 2 réalisations » asks for — the dashboard checklist and H3's « Portfolio » pill read this ONE constant. */
export const PORTFOLIO_ITEMS_GOAL = 2

export const isPortfolioComplete = (itemCount: number): boolean => itemCount >= PORTFOLIO_ITEMS_GOAL
