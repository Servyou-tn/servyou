// Longest-prefix active match for the app-shell sidebar. An item is active when the pathname
// IS its href or sits beneath it (so /mes-commandes/123 keeps "Mes commandes" lit). Kept local
// to the shell so it never couples to the dormant DashboardShell family.
export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}
