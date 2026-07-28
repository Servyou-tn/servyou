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

// The role-conditional sidebar IA (founder direction 2026-06-27, supersedes the example item
// list in design system Section 6.1). Strict single role: a consumer (seller_type null) and a
// shop owner share the Découvrir & Outils sections; a freelancer additionally gets Mes activités.
// HIDDEN here on purpose: Messages (Phase 3, no chat yet) and the "Passer à Premium" CTA (no
// pricing page) — they reappear when those surfaces ship.
export type ShellRole = 'consumer' | 'freelancer' | 'shop_owner'
export type SidebarItemDef = {
  key: string
  href: string
  icon: LucideIcon
  // Nav entry whose page is not built yet: renders non-navigable with a "Bientôt" badge.
  disabled?: boolean
}
export type SidebarSectionDef = { labelKey: string; items: SidebarItemDef[] }

// ── Découvrir & achats — shared by every role ──
const DISCOVER: SidebarSectionDef = {
  labelKey: 'shell.sidebar.section.discover',
  items: [
    // /marche (redirects to the produits engine) so the item lights on BOTH marketplace
    // engines — /marche/produits and /marche/services — via the isActiveRoute prefix match.
    { key: 'shell.sidebar.marketplace', href: '/marche', icon: Store },
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
