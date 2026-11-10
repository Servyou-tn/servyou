// Who writes which English keys (founder decision 2026-11-10: English is the 3rd language; the work is split in three).
// A key belongs to the first owner whose prefix matches (`prefix` or `prefix.` + anything). Everything not listed is
// `common` (shared UI, landing, auth, settings, search, help, legal — written by the architect). Each agent owns a
// whole journey, both sides: the freelancer agent also has the client browsing services and posting missions, the shop
// agent also has the client browsing products and ordering. `admin` stays French (founder: admin is internal),
// so admin keys are never added to an English file — t() falls back to French for them.
// Each owner writes ONLY its own file in this folder: common.ts · freelancer.ts · shop.ts. That is what lets three
// branches run in parallel without touching the same lines.
export type EnOwner = 'common' | 'freelancer' | 'shop' | 'admin'

export const OWNER_PREFIXES: Record<Exclude<EnOwner, 'common'>, readonly string[]> = {
  admin: ['admin'],
  freelancer: [
    'freelance', 'service', 'proposal', 'propositions', 'engagements', 'missionboard', 'missiondetail', 'missions',
    'mission', 'missioncard', 'competition', 'respond', 'job', 'jobbudget', 'forceProfil', 'ecosysteme', 'activite',
    'dashboard', 'devenir.freelance',
    // the client side of the same journeys: browsing services and freelancers, posting a mission (annonce)
    'services', 'serviceDetail', 'freelances', 'freelancerCard', 'listing', 'annonce', 'annonces', 'mesannonces', 'poster',
  ],
  shop: [
    'seller', 'product', 'boutique', 'shop', 'owner', 'devenir.vendeur',
    // the buyer side of the same journeys: browsing products and shops, ordering, my orders, receipt, disputes
    'produits', 'boutiques', 'shopCard', 'buyerOrder', 'orders', 'mesCommandes', 'mescommandes', 'receipt', 'dispute',
  ],
}

const matches = (key: string, prefix: string) => key === prefix || key.startsWith(prefix + '.')

export function enOwnerOf(key: string): EnOwner {
  for (const owner of ['admin', 'freelancer', 'shop'] as const) {
    if (OWNER_PREFIXES[owner].some((p) => matches(key, p))) return owner
  }
  return 'common'
}
