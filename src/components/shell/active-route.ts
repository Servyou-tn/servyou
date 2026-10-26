// Longest-prefix active match for the app-shell sidebar. An item is active when the pathname
// IS its href or sits beneath it (so /mes-commandes/123 keeps "Mes commandes" lit). Kept local
// to the shell so it never couples to the dormant DashboardShell family.
export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

// An item is active on its own href OR on any of its `activeOn` prefixes (sidebar-items.ts SidebarItemDef.activeOn) —
// « Trouver des missions » stays lit on /missions/[id] (Figma H10/H12/H13).
export function isItemActive(pathname: string, item: { href: string; activeOn?: string[] }): boolean {
  return isActiveRoute(pathname, item.href) || (item.activeOn ?? []).some((prefix) => isActiveRoute(pathname, prefix))
}
