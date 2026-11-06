# Admin PR-2 — Utilisateurs (J2) + Utilisateur détail (J3) — deltas

Frames: Figma « NOV 4 — Admin » — dumps `docs/design/admin-j2-users-*`, `admin-j3-user-*` (on disk, untracked). No Figma MCP
read used. No 375 frame for J2/J3: cards and stacked filters below lg.

## Measured vs built (DOM probe, fixture route, 1440)

| Element | Frame | Built |
|---|---|---|
| J2 tabs | 100 · 135 · 146 · 133 · 143 × 44, badges | 99 · 135 · 145 · 133 · 142 × 44 |
| J2 filters | search FILL h44 · 3 selects 190×40, gap 12 | same |
| J2 table | thead 38, rows 67, cols fill·120·100·100·120·190·40 | rows 67, same columns |
| J3 header | pad 24, gap 20, avatar 56, name 24 Bold, pills, meta 14 | 1121×108 (frame 1136×107, scrollbar) |
| J3 tiles | 4 × 272×196, pad 24, gap 16, icon 48, value 28 Bold blue-800 | 4 × 268×198 |
| J3 two columns | main FILL + rail 360, gap 24; panels pad 24, title 18 Semi Bold | same |

## Diff table (frame ≠ build)

| # | What | Class | Why |
|---|---|---|---|
| 1 | « Exporter CSV » (J2) | DATA | No users export exists, and one would be a new PII export (e-mail, phone). Left out; Q1. |
| 2 | « vu il y a 3 h » (J3 meta) | DATA | Last sign-in lives in auth (service role only). Left out. |
| 3 | Role pill « Acheteur » | DIFFERENT | The built label « Consommateur » is kept (the render test pins it). The tab reads « Acheteurs » (new). Q2. |
| 4 | « 18+ vérifié à l'inscription » | DIFFERENT | False for buyers: the DB enforces 16+ to buy and 18+ only at the seller switch. Shows an age band from the date of birth (« 18 ans ou plus » / « 16 – 17 ans »), never the date. Q3. |
| 5 | Journal « Boutique transférée vers ce compte » | DATA | No such audit action exists; real actions map to labels (hide/unhide by prefix), unknown → « Action d'administration ». |
| 6 | Stat-tile icons (all « inbox ») | as drawn | Kept as drawn. |
| 7 | Tile 3 « Produits » | as drawn + extended | Shop → Produits; freelancer → Services; others → Annonces (job posts). Visible = not admin-hidden. |
| 8 | « Signalements reçus » | DIFFERENT meaning | The built count was user-targeted reports only; the frame lists content reports. It now counts reports on the account AND on everything it owns. |
| 9 | Pagination left-aligned | DIFFERENT | The shared `Pagination` centres itself; unchanged (shared component). |
| 10 | Topbar placeholder / role « Admin » | DIFFERENT | Shared Topbar unchanged (same as PR-1). |

## Decisions (defaults applied — please rule)

- **D1** Tabs keep the built `?role=` param: `consumer` / `freelancer` / `shop_owner`, plus new `suspended`. `?role=admin` still filters (no drawn tab).
- **D2** Status precedence: Suspendu > Suppression demandée > Actif.
- **D3** « Activité » column = orders the account took part in, as buyer or seller.
- **D4** « Suspendre » opens a modal for the required reason (the action and DB function reject an empty reason). « Réactiver » keeps its confirm.
- **D5** Built items dropped by the frame:
  - Date of birth → replaced by the age band.
  - « Administrateur Oui/Non » → the « Administrateur » role pill.
  - « Signalements créés » → not shown.
  - Suspension date + reason → kept in Informations.
  - Public shop / freelance links → kept as the header's secondary button.
- **D6** J3 tabs:
  - Commandes: up to 50 per side.
  - Contenu: products / services / annonces with Visible / Masqué / Inactif.
  - Signalements: up to 50.
  - Journal: up to 50.

## Questions

1. Exporter CSV: do you want a users export (which columns — e-mail and phone are PII)?
2. « Acheteur » vs the built « Consommateur » pill — switch the pill too?
3. Age: is the band acceptable, or should it be removed?
