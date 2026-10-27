# AppShell Topbar 375px fix + first MarcheLayout→AppShell migration step (`fix/appshell-topbar-and-pitch-pages`, 2026-08-13)

## AppShell Topbar 375px overflow — closed
Fixed the defect logged four separate times above (G9 partial, the E1-era entry, G4, G6) — see
those entries for the fix detail and re-measurement, not repeated here. One entry (G9
`/commandes-recues/[id]`) was a compound bug; only its topbar-cluster half is resolved, `OrderRail`
remains open. S4 (topbar 65px vs Figma's 64px, same component, founder-flagged to ride with this
fix) was deliberately **not** included — out of this PR's stated scope, still open.

## `/devenir-vendeur/{boutique,freelance}` migrated off `MarcheLayout` onto `AppShell` — 2 of 5 done
Reported separately (routing-defect audit, 2026-08-13): a click from the new `/devenir-vendeur`
role-choice screen (`AppShell`) into either pitch page landed on the **old** shell (`MarcheLayout`
— different sidebar, "Publier un projet" CTA, no shell parity). Both pages were confirmed 4-line
swaps (static content, `user` prop only, no `--marche-topbar-h` / `MarcheSidebar` dependency) and
migrated here. Verified live: identical sidebar + topbar across `/devenir-vendeur` →
`/devenir-vendeur/freelance` → `/devenir-vendeur/boutique` (screenshots, 1440 + 375), no "Publier un
projet", no "Mes missions" on any of the three.

**3 of 5 `MarcheLayout` routes remain:** `/` (`ConsumerHomepage`), `/recherche`,
`/categories/[slug]`. All three depend on the cross-engine Produits/Services toggle + stateful
URL-synced search that `AppShell`'s `Topbar` has no equivalent for (`TopbarSearch` is a stateless
box that always redirects to `/recherche`, carries no `q=` or type). Not a swap — needs a new
page-local component, and for `/` specifically a founder call first (does it stay a bespoke browse
surface, or fold into `/marche/produits`, which already has `AppShell` + its own lens toggle).
Scoped as a separate PR ("PR 2"), deliberately not started here.

**Still coupling `AppShell` to the shell it's meant to replace:** `TopBarUser` (type-only, 9 import
sites) still lives in `marche/ProfileAvatarMenu.tsx` — small, mechanical to move to
`lib/marche/shell-user.ts`, but blocked on all 5 routes being off `MarcheLayout` first (can't delete
`ProfileAvatarMenu` while `MarcheTopBar`/`MarcheLayout` still use it). `getInitials` is **already**
fully extracted to `components/ui/initials.ts` and consumed by both shells — the audit's "runtime
coupling" claim on that specific function is stale, not a remaining blocker.
