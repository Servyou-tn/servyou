import {
  Code,
  Palette,
  LayoutTemplate,
  Megaphone,
  MessageCircle,
  PenLine,
  Languages,
  Clapperboard,
  Mic,
  Briefcase,
  UserRound,
  Target,
  ShoppingCart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Founder-ruled, NOT measured against Figma (2026-09-06, rekeyed 2026-09-07 for the 13-sector
// taxonomy cutover): `public.categories` has no icon column, so this map is a client-side lookup
// keyed to `categories.slug` values, sourced from the same `icon:` field on each sector in
// src/lib/taxonomy/service-categories.ts. A row's category is now always a SECTOR (the top-level
// 13, `parent_id is null`) — SellerServiceRow's categorySlug comes from service_listings.category_id,
// which after the taxonomy cutover migration can only be a leaf/root the freelancer picked at
// creation, and creation only offers sectors until H6 ships subcategory selection. Wrench stays
// the fallback for null/unmapped (a service filed under a subcategory once H6 exists, or any future
// sector added here without a matching icon import).
//
// Shared by H5's ServiceRow and H8's EngagementRow (the second consumer): both draw the category glyph of
// the same service. A plain module in src/components/shared (not in either route's private _components)
// so a Server Component can import it and neither route depends on the other.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'developpement-web-mobile': Code,
  'design-graphique-logo': Palette,
  'design-ui-ux': LayoutTemplate,
  'marketing-digital': Megaphone,
  'community-management': MessageCircle,
  'redaction-contenu': PenLine,
  traduction: Languages,
  'montage-video-motion': Clapperboard,
  'voix-off-doublage': Mic,
  'consulting-assistanat': Briefcase,
  'personal-branding': UserRound,
  'coaching-meta-ads': Target,
  'coaching-ecommerce': ShoppingCart,
}
