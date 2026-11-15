// ServYou's own social accounts, in ONE place: the /contact « Réseaux sociaux » card and the landing footer link to them
// (founder decisions 2026-11-15, frontend audit C2). An account whose address is not known yet has `url: null` and is not
// shown anywhere: no icon pretends to be a link, no link goes to a guessed page.

export type SocialPlatform = 'facebook' | 'instagram'

type SocialAccountDef = {
  platform: SocialPlatform
  /** The platform's name — a brand, the same in every language. */
  name: string
  url: string | null
}

export type SocialAccount = SocialAccountDef & { url: string }

const ACCOUNTS: readonly SocialAccountDef[] = [
  // The page address is still to come from the founder (the brief carried a placeholder).
  { platform: 'facebook', name: 'Facebook', url: null },
  { platform: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/servyou.tn/' },
]

/** The accounts that have a real address, in display order (Facebook, then Instagram). */
export const SOCIAL_ACCOUNTS: readonly SocialAccount[] = ACCOUNTS.filter(
  (account): account is SocialAccount => account.url !== null,
)
