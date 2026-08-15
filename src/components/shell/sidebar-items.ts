import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Briefcase,
  Handshake,
  Send,
  Compass,
  Store,
  Package,
  Inbox,
  Heart,
  Megaphone,
  Settings,
  HelpCircle,
} from 'lucide-react'
import { MARCHE_ENGINE_PATHS } from '@/lib/marche/marche-routing'

// The role-conditional sidebar IA (founder direction 2026-06-27, supersedes the example item
// list in design system Section 6.1). Strict single role: a consumer (seller_type null) and a
// shop owner share the Découvrir & Outils sections; a freelancer additionally gets Mes activités.
// HIDDEN here on purpose: Messages (Phase 3, no chat yet) and the "Passer à Premium" CTA (no
// pricing page) — they reappear when those surfaces ship.
//
// 🔴 REVERSAL (founder, 2026-08-15, PR feat/sidebar-marketplace-and-shell-migration): the
// 2026-06-27 ruling above was "flat, no nesting" — every item here was a leaf. Marketplace is now
// the one deliberate exception: it expands to Produits/Services sub-items. This is NOT drift back
// toward the superseded Section 6.1 example (which nested nearly everything); it is a single
// contained case, made with new information — the cross-engine Produits/Services toggle that used
// to live in the legacy marche top bar was retired in the same PR (no cross-engine toggle exists
// anywhere else now), so the sidebar had to become the thing that moves a visitor between the two
// marketplace engines. Full reasoning in docs/follow-ups.md's dated entry for this PR.
export type ShellRole = 'consumer' | 'freelancer' | 'shop_owner'
export type SidebarSubItemDef = { key: string; href: string }
export type SidebarItemDef = {
  key: string
  href: string
  icon: LucideIcon
  // Nav entry whose page is not built yet: renders non-navigable with a "Bientôt" badge.
  disabled?: boolean
  // The lone expandable-item case (Marketplace). Deliberately NOT a general nested-item model —
  // see the reversal note above and Sidebar.tsx's render loop, which special-cases this one field
  // rather than recursing.
  subItems?: SidebarSubItemDef[]
  // Only meaningful together with subItems: the route PREFIX that expands this item and is
  // "current" — distinct from `href` (the item's own navigation target). `href` picks ONE
  // default engine to navigate to (Produits); expansion must react to BOTH engines, so it cannot
  // be derived from `href` itself. Getting this wrong collapses the sub-items the instant a
  // visitor clicks into the Services engine — the exact case this field exists to keep open.
  expandOn?: string
}
export type SidebarSectionDef = { labelKey: string; items: SidebarItemDef[] }

// ── Découvrir & achats — shared by every role ──
const DISCOVER: SidebarSectionDef = {
  labelKey: 'shell.sidebar.section.discover',
  items: [
    // Navigates straight to the Produits engine (the canonical default); Services is reached via
    // the sub-item, not via this href. Expansion (isActiveRoute against expandOn, computed in
    // Sidebar.tsx) is what makes BOTH engines reachable, not this href's own prefix match.
    {
      key: 'shell.sidebar.marketplace',
      href: MARCHE_ENGINE_PATHS.product,
      icon: Store,
      expandOn: '/marche',
      subItems: [
        { key: 'common.products_section', href: MARCHE_ENGINE_PATHS.product },
        { key: 'common.services_section', href: MARCHE_ENGINE_PATHS.service },
      ],
    },
    { key: 'shell.sidebar.orders', href: '/mes-commandes', icon: Package },
    { key: 'shell.sidebar.favorites', href: '/mes-favoris', icon: Heart },
    // "Mes annonces" per Figma 611:45637 (110:3863). VOCAB DRIFT: the label is "Mes annonces"
    // but the job-posting list route is /mes-missions today — kept as-is (not renamed here);
    // reconcile annonces↔missions in a vocab pass (see docs/follow-ups.md).
    { key: 'shell.sidebar.listings', href: '/mes-missions', icon: Megaphone },
  ],
}

// ── Outils & compte — shared by every role. "Statistiques" removed: absent from the Figma
//    frame (611:45637). The /statistiques route still exists but is no longer linked from the
//    shell (its only nav entry) — reachable by URL until it gets its own IA decision. ──
const TOOLS: SidebarSectionDef = {
  labelKey: 'shell.sidebar.section.tools',
  items: [
    { key: 'shell.sidebar.settings', href: '/parametres', icon: Settings },
    { key: 'shell.sidebar.help', href: '/aide', icon: HelpCircle },
  ],
}

// ── Mes activités — freelancer only (all destinations are PR-DS-2 placeholders except the
//    dashboard, whose real page ships in PR-PAGE-DASHBOARD-FREELANCER) ──
const ACTIVITIES: SidebarSectionDef = {
  labelKey: 'shell.sidebar.section.activities',
  items: [
    { key: 'shell.sidebar.dashboard', href: '/tableau-de-bord', icon: LayoutDashboard },
    { key: 'shell.sidebar.services', href: '/mes-services', icon: Briefcase },
    { key: 'shell.sidebar.engagements', href: '/mes-engagements', icon: Handshake },
    { key: 'shell.sidebar.proposals', href: '/mes-propositions', icon: Send },
    { key: 'shell.sidebar.findMissions', href: '/trouver-des-missions', icon: Compass },
  ],
}

// ── Mes activités — shop_owner only (Figma 110:4066). Three items, matching the reconciled
//    shop_owner Sidebar variant: dashboard · products · received orders. "Ma boutique" and
//    "Statistiques" are deliberately absent from that variant — shop identity lives in the avatar
//    dropdown, and Stats is cancelled at MVP.
//
//    Mes produits (G5) and Commandes reçues (G8) are not built yet, so they ship DISABLED with a
//    "Bientôt" badge rather than linking to a 404 (founder call). Flip `disabled` off in the PR
//    that builds each page — the href is already correct. ──
const SHOP_ACTIVITIES: SidebarSectionDef = {
  labelKey: 'shell.sidebar.section.activities',
  items: [
    { key: 'shell.sidebar.dashboard', href: '/tableau-de-bord-vendeur', icon: LayoutDashboard },
    { key: 'shell.sidebar.products', href: '/mes-produits', icon: Package, disabled: true },
    { key: 'shell.sidebar.receivedOrders', href: '/commandes-recues', icon: Inbox },
  ],
}

export function sidebarSectionsForRole(role: ShellRole): SidebarSectionDef[] {
  if (role === 'freelancer') return [ACTIVITIES, DISCOVER, TOOLS]
  if (role === 'shop_owner') return [SHOP_ACTIVITIES, DISCOVER, TOOLS]
  return [DISCOVER, TOOLS] // consumer
}
