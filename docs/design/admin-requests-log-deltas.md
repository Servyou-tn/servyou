# Admin PR-4 — Demandes (J10 + 375) + Journal (J11) — deltas

Frames: Figma « NOV 4 — Admin » — dumps `docs/design/admin-j10-requests-*`, `admin-m375-requests-*`, `admin-j11-log-*` (on disk,
untracked). No Figma MCP read used.

## Measured vs built (DOM probe, fixture route)

| Element | Frame | Built |
|---|---|---|
| J10 tabs (1440) | « Suppression de compte » 240 × 44, badges | 239 × 44 |
| J10 tabs (375) | « Comptes » 127 · « Exports » 116 · « Contact » … | 126 · 115 · 116 |
| J10 card | pad 24 (375: 16), radius 12, quote box, 3 stats, indigo warning, buttons | as drawn; 375 = drawn mobile card |
| J11 table | thead 38, rows 71 | rows 71 |

## Diff table (frame ≠ build)

| # | What | Class | Why |
|---|---|---|---|
| 1 | J10 first tab shows deletion + contact + exports together | DIFFERENT | One kind per tab (as the 375 frame draws it); the other sections live in their own tabs. |
| 2 | « 1 (acceptée) » (orders in progress, by status) | DATA | The RPC returns the open-order count only. |
| 3 | Contact time « hier, 18:40 » | DIFFERENT | The built order-timeline stamp (« 05/11 18h40 »). |
| 4 | J11 « Exporter CSV » | DATA | No audit-log export exists; a new export is your call. Left out. |
| 5 | J11 « Boutique transférée · admin → Ahmed » | DATA | No such audit action; unknown codes read « Action d'administration », never the raw code. |
| 6 | J11 « #R-1039 sur « iPhone… » » | DATA | Reports show « Signalement #<8 hex> » (no report → content join in the journal). |

## Decisions (defaults applied — please rule)

- **D1** « Il reste N h » = the 48 h promise in the built copy (Mon compte, Paramètres, Contact), counted from the request time; past it → « En retard de N h » (danger).
- **D2** « Supprimer le compte » opens a modal that states the deletion is final (optional note) and calls Agent A's `approveDeletionRequest`. « Refuser » requires the reason (`RefusalInput`). « Marquer comme envoyé » / « Marquer comme traité » take an optional note.
- **D3** « Terminer la suppression »: an approved request whose user has no `complete_account_erasure` audit row (follow-up #2 of admin-deletion-auth.md) shows in the deletion tab with « Suppression non terminée »; the button re-runs `approveDeletionRequest`. A failed audit read hides those cards rather than claiming done.
- **D4** « Contacter / Répondre par e-mail » are `mailto:` links (no e-mail service yet); the address is format-checked.
- **D5** `export const maxDuration = 60` on `/admin/demandes` (admin-deletion-auth.md #4).
- **D6** J11 reads the last 500 audit rows of the period (default 30 days); action / target / period filters and search run on them. Admins CAN read `admin_audit_log` (is_admin() SELECT policy; only anon is revoked), so the table is live, not an empty placeholder.
- **D7** The sidebar's « Demandes » and « Journal » links are now active; « Demandes » has no count pill yet (Q2).

## Questions

1. D1: is 48 h the right deadline for all three kinds?
2. Should the sidebar « Demandes » pill count pending deletions + exports + new messages?
3. J11 « Exporter CSV »: wanted?
