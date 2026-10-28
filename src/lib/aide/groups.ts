import type { Role } from '@/lib/roles'

// /aide — the help centre's content map (Figma I-Aide 449:17900, shop_owner config 558:38359, buyer
// config 449:18408). ONE route, three configurations by seller_type — conditional at the content level,
// like the sidebar, never three routes. Every user is a buyer, so the four UNIVERSAL groups always show;
// the role adds its own four groups in front of them.
//
// The copy lives in fr.ts / ar.ts under `aide.g.<id>.title` and `aide.g.<id>.q1..q3` / `a1..a3`: three
// questions per group, because the AccordionGroup component bakes exactly three (449:17899).

export type AideGroupId =
  | 'profil'
  | 'services'
  | 'engagements'
  | 'missions'
  | 'boutique'
  | 'produits'
  | 'commandes'
  | 'livraison'
  | 'acheter'
  | 'annonces'
  | 'securite'
  | 'compte'

// Group icon keys (mapped to lucide in the client). AIDE ICON RULE (design): a group's icon matches the
// sidebar / nav icon of the concept it documents.
export type AideIcon =
  | 'briefcase'
  | 'layers'
  | 'file-check'
  | 'search'
  | 'store'
  | 'package'
  | 'inbox'
  | 'truck'
  | 'shopping-bag'
  | 'megaphone'
  | 'shield'
  | 'user'

export const AIDE_GROUP_ICON: Record<AideGroupId, AideIcon> = {
  profil: 'briefcase',
  services: 'layers',
  engagements: 'file-check',
  missions: 'search',
  boutique: 'store',
  produits: 'package',
  commandes: 'inbox',
  livraison: 'truck',
  acheter: 'shopping-bag',
  annonces: 'megaphone',
  securite: 'shield',
  compte: 'user',
}

export const AIDE_QUESTIONS_PER_GROUP = 3

const UNIVERSAL: AideGroupId[] = ['acheter', 'annonces', 'securite', 'compte']

function assertNever(x: never): never {
  throw new Error(`aide: unhandled Role ${JSON.stringify(x)}`)
}

/** The groups a role sees, in display order (role groups first, universal groups after). */
export function aideGroupIdsForRole(role: Role): AideGroupId[] {
  switch (role) {
    case 'freelancer':
      return ['profil', 'services', 'engagements', 'missions', ...UNIVERSAL]
    case 'shop_owner':
      return ['boutique', 'produits', 'commandes', 'livraison', ...UNIVERSAL]
    case null:
      return [...UNIVERSAL]
    default:
      return assertNever(role)
  }
}
