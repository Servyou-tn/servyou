# `DashboardSidebar.tsx` has a stale `/mes-missions` href — left alone, dead code
- **What:** `src/components/dashboard/shell/DashboardSidebar.tsx:29` still hrefs `/mes-missions`
  (surfaced by `feat/annonces-vocab-rename`'s route move to `/mes-annonces`). Traced its mount
  chain: it's rendered only by `DashboardShellClient.tsx`, which itself has **zero render call
  sites anywhere in `src`** — same orphaned legacy-shell family as `DashboardRightRail.tsx` and
  `ActiveMissionsWidget.tsx`, both deleted in that PR for the same reason. This one wasn't named
  in that PR's scope, so it was left in place rather than decided on unilaterally.
- **Why not just fix the href (it costs nothing):** it would make dead code look maintained. The
  href is harmless regardless — `/mes-missions` 308s to `/mes-annonces` (`next.config.ts`), so even
  if this component were somehow mounted, nothing would 404. Fixing the string without addressing
  that the component has no live caller papers over the real question, which is whether this whole
  legacy `DashboardSidebar`/`DashboardShellClient` tree should be deleted outright.
- **Trigger:** the next PR that touches this legacy dashboard-shell family (or a dedicated
  dead-code sweep) — decide delete-outright vs. keep-and-fix-the-href then, with the founder.
