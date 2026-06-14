// Pure active-route matching for the dashboard sidebar. Kept render-free so it is
// unit-testable in isolation (see sidebar-active.test.ts). An item is active when
// the current path equals its href OR is a sub-route of it, so /mes-demandes/123
// still highlights the "Mes commandes" item.

export function isActiveRoute(currentPath: string, itemHref: string): boolean {
  if (itemHref === '/') return currentPath === '/'
  return currentPath === itemHref || currentPath.startsWith(itemHref + '/')
}
