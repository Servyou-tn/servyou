# D4 — Profil freelance public (`feat/d4-public-profile`, 2026-09-05)

## `FreelancerShareButton` is now at its documented third consumer — promote to shared
- `src/components/produits/ShareLinkButton.tsx` (D1) and `src/app/boutique/[id]/_components/
  ShopShareButton.tsx` (D3) already share one plain copy-link pattern:
  `navigator.clipboard.writeText(window.location.href)`, a busy-state `Button`, and a success/error
  toast. `src/app/freelance/[id]/_components/FreelancerShareButton.tsx` (D4) is the third
  independent copy of that same pattern — same rule this file already used for `Stepper` above
  ("promote at third consumer").
- **Not promoted here.** Promoting means picking a shared location (`src/components/ui`, per the
  Stepper precedent) and repointing D1's and D3's existing imports at it — a cross-cutting edit to
  two already-shipped surfaces from inside a D4 PR, which "one PR, one focus" pushes back on. A
  page build (D4) is not the place to widen into that refactor.
- **Trigger:** a fourth consumer, or a dedicated component-consolidation pass.
