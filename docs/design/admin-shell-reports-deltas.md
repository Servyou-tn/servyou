# Admin PR-1 — shell + Signalements (J5, J6, m375) — deltas

Frames: Figma « NOV 4 — Admin » (Screens page) — dumps `docs/design/admin-j5-reports-*`, `admin-j6-report-*`,
`admin-m375-reports-*` (on disk, untracked). No Figma MCP read used (0 / 20). Project doc
`claude/admin-dashboard-plan-2026-11-04.md` was not readable from Claude Code — not consulted.

## Measured vs built (DOM probe, fixture route, 1440 + 375)

| Element | Frame | Built |
|---|---|---|
| Sidebar | 240, blue-950, band 72, captions 41 (pad 16/12/8), rows 45 (pad 12, gap 12), siblings 4 apart; OUTILS & COMPTE = components (32 / 44) | same (captions 41, rows 45, Account rows 44) |
| Count pill | danger-500, pad 1/6, 12 Semi Bold | same |
| Topbar | 64, search FILL, FR/AR, bell, user | the existing shared Topbar, unchanged |
| Content pad | 32/32/48/32 · 375: 20/16/32/16 | same |
| H1 / subtitle | 32 Bold / 14 secondary, gap 4 | same (H1 line box 40 vs 38: token line-height) |
| Tabs | h44, px16, gap 8, 16 Semi Bold blue-600 + 2px bar / Medium muted, badge 16 | 118/123/92/88 × 44 (frame 119/123/92/89) |
| Filters | search FILL h44 · 3 selects 180×40, gap 12 | same (shared SortSelect, wrapper sizes it to 180) |
| Table | radius 12; thead pad 10/20, 12 Medium muted uppercase; rows 67, pad 14/20, gap 16; cols 190·fill·240·90·150·110 | thead 37, rows 67, same columns |
| Row CTA | sm 32, primary on row 1, secondary after; « Reprendre » for En cours | 87×32 / 89×32 |
| 375 header | 56, blue-950, lockup · indigo « Admin » tag · bell 22 · kebab 22 | 375×56 (32px buttons + 44px hit area) |
| 375 card | 343 wide, pad 16, gap 10, radius 12, md button full width | 343×198 (frame 199) |
| J6 | breadcrumb · H1 + pill · main FILL + rail 380, gap 24; panels pad 24 gap 16 radius 12; title 18 Semi Bold | same |

## Diff table (frame ≠ build)

| # | What | Class | Why |
|---|---|---|---|
| 1 | Sidebar: Commandes « 3 », Demandes « 2 » pills; bell « 2 » | DATA | No source yet (brief: only open reports + open disputes). Omitted, never faked. |
| 2 | « #R-1042 » | DATA | `reports` has no human number. Shows the first 8 hex of the uuid (« #3f2a1b9c »). |
| 3 | « pris en charge par Moatez », « En cours · Moatez » | DATA | `reports` stores no claimer. Left out; pill reads « En cours ». |
| 4 | « · à vérifier » (reporter with 4 reports) | DATA | No rule exists. Left out. |
| 5 | « 3 signalements reçus · 0 suspension » (owner) | DATA | No per-owner count yet. Owner panel shows suspension date + reason when suspended. |
| 6 | Reasons « Arnaque / Faux profil / Contenu inapproprié / Spam / Prix trompeur » | DATA | The DB has 4 reasons (fake_scam, offensive, wrong_category, other); their built labels are kept. Severity: fake_scam = danger, offensive = warning, the rest = info. |
| 7 | Type labels « Profil freelance », « Annonce » | DIFFERENT | Built labels kept (« Profil de freelance », « Offre d'emploi »). |
| 8 | Relative time « il y a 2 h », « il y a 1 j » | DIFFERENT | Shared `relativeTimeLabel` kept (« il y a 2h », « Hier », « il y a 3 jours »). |
| 9 | Topbar placeholder « Rechercher un utilisateur, une commande, une annonce… », role « Admin » | DIFFERENT | Shared Topbar/TopbarSearch/TopbarUserMenu unchanged (out of scope) → « Rechercher… », role from seller_type (« Client »). |
| 10 | Avatar placeholder glyph (topbar) | DATA | Real initials / photo. |
| 11 | Role « Acheteur », « Boutique » (J6 person lines) | DIFFERENT | Built role labels (« Client », « Vendeur », « Freelance »). |
| 12 | 375: no search / filters | as drawn | Hidden below lg; tabs scroll (Rejetés off-screen). |
| 13 | 375: language toggle + user menu | not drawn | Language toggle at the foot of the drawer; user menu not on mobile (see Q4). |
| 14 | J6 at 375 | no frame | Columns stack; content thumb hidden below sm; « Autres signalements » table scrolls. |

## Decisions (defaults applied — please rule)

- **D1** Brief says « COMPTE (Paramètres, Voir le site) »; every admin frame draws « OUTILS & COMPTE (Paramètres, Aide) ». Built the frame. Paramètres → /parametres, Aide → /aide. « Voir le site » is a one-line add.
- **D2** « Ouverts » lists open + claimed reports (the frame draws an « En cours » row inside it). Its badge counts open only, and matches the sidebar pill.
- **D3** « Suspendre l'utilisateur » on a content report suspends the content **owner** (shop owner / freelancer / job poster), using the existing `suspendReportedUser`. Your own account is never offered. Confirm dialog kept from the users page (« Confirmer la suspension… »).
- **D4** One decision note feeds all four buttons (Masquer = the hide reason, Suspendre = the suspension reason, Résoudre / Rejeter = the admin note). Buttons keep their frame colours; a blank note returns that action's own « required » error.
- **D5** « Prendre en charge » (claim) is not drawn but already built: kept as a small secondary button beside the status pill on open reports.
- **D6** Severity sort = fake_scam → offensive → wrong_category → other, then oldest first. Sort menu also offers « plus récents / plus anciens ».
- **D7** Unbuilt links (Contenu, Commandes, Demandes, Journal) stay visible and muted, non-navigable (« Bientôt » tooltip).

## Kept

Existing server actions (`signalements/actions.ts`) untouched · ClaimButton / UnhideButton / UnsuspendReportedUserButton
(restyled on the Button primitive) · shared Topbar, SidebarSection, SortSelect, StatusPill, Avatar, Button unchanged ·
requireAdmin gate unchanged (logged-out → 307 /connexion?next=/admin).

## Questions

1. **Privacy (D4):** the single note becomes the hide reason, which the **content owner** can read (`get_moderation_reason`), and the resolve note, which the **reporter** sees. Is one shared note acceptable, or should Masquer/Suspendre take a separate admin-only reason?
2. D1: frame (Aide) or brief (Voir le site)?
3. Should the claimer be stored (a `claimed_by` column, Agent A) so « pris en charge par … » and « En cours · Moatez » can show?
4. 375: where should the user menu (logout) live — in the drawer?
5. Report reference: is « #3f2a1b9c » acceptable, or do you want a sequential number (schema change)?
