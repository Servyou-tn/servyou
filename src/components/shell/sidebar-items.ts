import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Briefcase,
  Handshake,
  Send,
  Compass,
  Store,
  Package,
  Heart,
  BarChart3,
  Settings,
  HelpCircle,
} from 'lucide-react'

// The role-conditional sidebar IA (founder direction 2026-06-27, supersedes the example item
// list in design system Section 6.1). Strict single role: a consumer (seller_type null) and a
// shop owner share the Découvrir & Outils sections; a freelancer additionally gets Mes activités.
// HIDDEN here on purpose: Messages (Phase 3, no chat yet) and the "Passer à Premium" CTA (no
// pricing page) — they reappear when those surfaces ship.
export type ShellRole = 'consumer' | 'freelancer' | 'shop_owner'
export type SidebarItemDef = { key: string; href: string; icon: LucideIcon }
export type SidebarSectionDef = { labelKey: string; items: SidebarItemDef[] }

// ── Découvrir & achats — shared by every role ──
const DISCOVER: SidebarSectionDef = {
  labelKey: 'shell.sidebar.section.discover',
  items: [
    { key: 'shell.sidebar.marketplace', href: '/marche/produits', icon: Store },
    { key: 'shell.sidebar.orders', href: '/mes-commandes', icon: Package },
    { key: 'shell.sidebar.favorites', href: '/mes-favoris', icon: Heart },
  ],
}

// ── Outils & compte — shared by every role ──
const TOOLS: SidebarSectionDef = {
  labelKey: 'shell.sidebar.section.tools',
  items: [
    { key: 'shell.sidebar.statistics', href: '/statistiques', icon: BarChart3 },
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

export function sidebarSectionsForRole(role: ShellRole): SidebarSectionDef[] {
  if (role === 'freelancer') return [ACTIVITIES, DISCOVER, TOOLS]
  return [DISCOVER, TOOLS] // consumer + shop_owner fallback
}
