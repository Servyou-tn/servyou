# Admin PR-5 — Vue d'ensemble (J1 + M1), Statistiques (J8), Commandes (J9), Journal on the RPC (J11)

Frames: the founder's exports `docs/design/admin-j1-overview`, `admin-m375-overview`, `admin-j8-stats`,
`admin-j9-orders`, `admin-j11-log` (no Figma MCP read used). Data: the live RPCs from migration
`20261106093535_admin_dashboard_stats` (`docs/discovery/admin-dashboard-stats.md`, D1–D12).

## What reads what

| Surface | Source |
|---|---|
| Sidebar pills | `admin_dashboard_stats(7).queue`. Signalements = `reports_open`. Litiges = `disputes_open`. Commandes = `orders_blocked`. Demandes = deletions + exports + new messages. |
| J1 queue, tiles, cities | `admin_dashboard_stats(7)`. The layout and the page share one call per request (React `cache`). |
| J1 « Commandes récentes » | `admin_list_orders(p_limit 5, p_days null)` (D12) |
| J1 « Dernières actions » | `admin_list_audit_log(p_limit 3, p_days null)` (D12) |
| J8 | `admin_dashboard_stats(7 / 30 / 90)` through `?periode=` |
| J9 | `admin_list_orders` + `admin_count_orders`. Same filters, so the tab badges and the rows agree. Paged in the database. |
| J11 | `admin_list_audit_log`. It replaces the direct table read and the per-table label resolver. |

The RPC's jsonb is checked with a local zod schema (`src/app/admin/_lib/dashboard.ts`) until Agent A's
`src/lib/admin/dashboard-stats.ts` lands. If the shape drifts, the read counts as failed: the page shows its error state and
no pill, never a 0.

## Honesty rules applied

- A % delta shows only when the previous value is ≠ 0.
- A « pts » delta shows only when both periods had orders.
- A null median is « — » with no delta.
- A rate over 0 orders is « — ».
- A null amount (order before the price snapshot, D10) is « — ».
- Snapshots (active sellers D4, sellers without orders D6, loyal buyers D5) get a subtitle, never a delta.
- « Visites et conversion de la recherche » stays the drawn empty-state line.

## Deltas from the frames (numbered for the founder)

- **D-OS-1 « Commandes » sidebar pill.** The brief lists three pills, but the frames draw a 4th on Commandes (« 3 »).
  It shows `orders_blocked`. Keep it?
- **D-OS-2 Delta colour follows the sign, as drawn.** ↑ is green and ↓ is red, even for a delay or a
  cancellation rate, where a drop is good news (J1 « Délai d'acceptation ↓ 40 % » is red in the frame). Switch to
  good/bad colouring?
- **D-OS-3 No « Exporter CSV » (brief).** J8 and J9 draw the button. The old J8 count page's
  `CsvExportButton` + `actions.ts` (+ test) are no longer rendered but are kept. Delete them, or keep them for a later export PR
  (D11 pages through the same RPCs)?
- **D-OS-4 No « Voir » column on J9.** There is no admin order page to open. The frame's 40 px column is left out.
- **D-OS-5 Queue lines carry counts, not one item.** The RPC returns counts and the oldest date. The frame's sublines name
  one item (« « iPhone 15 Pro… » · signalé par Sami R. », « Commande #A4F729 · ouvert par l'acheteur »,
  « « Comment ouvrir une boutique ? » · Leila M. »). Built sublines:

  | Line | Subline |
  |---|---|
  | « arnaque » | « Motif « arnaque » : à examiner en premier » |
  | Reports, disputes, contact | « le plus ancien : il y a … » |
  | Deletions | « À traiter sous 48 h · il reste N h » |
  | Blocked | The full J9 definition (pending > 48 h **or** arrived > 7 days), not « sans réponse du vendeur » only |

  « Signalement grave : arnaque » counts the open `fake_scam` reports; « N signalements ouverts » counts the rest. A report
  therefore never shows twice, and its oldest date is that of all open reports.
- **D-OS-6 An « export de données » queue line.** The frame has no such line, but the brief's Demandes pill counts exports, so
  the queue shows them too and the pill and the list agree. « Tout voir » (queue header) is left out: there is no
  single page for every line.
- **D-OS-7 Real Arabic and French plurals** (« 1 vendeur · 1 commande »). The frame writes « 1 vendeurs ».
- **D-OS-8 J8 « Par ville » last column = « Commandes ».** The frame says « Reçues », but `by_city.orders` counts
  orders created in the period by buyer city (D9), not received ones.
- **D-OS-9 J8 category table shows every category with activity**, sorted by activity (the frame draws 5). Balance
  pill thresholds per the brief (demand = orders + job posts, D2):

  | Condition | Label | Tone |
  |---|---|---|
  | demand ≥ 2 × listings | Manque d'offre | warning |
  | listings ≥ 2 × demand | Manque de demande | blue |
  | otherwise | Équilibré | success |
- **D-OS-10 Two delta formats on the median tiles.** J1 « Délai d'acceptation » shows a % change and J8
  « Délai 1ʳᵉ proposition » an absolute one (« 3 h »), as each frame draws.
- **D-OS-11 J9 « Montant » → « Montant déclaré »** (brief: amounts are « déclaré »). There is no delivery, phone or e-mail
  column; the RPC returns none.
- **D-OS-12 « Depuis » bands.** Hours under 72 h (« 52 h »), then days (« 8 j »). J1's « 2 j » for a 48–71 h case
  therefore reads « 5x h ».
- **D-OS-13 « Mis à jour … »** is relative to the render (« à l'instant » on a fresh load) plus the RPC's
  `generated_at` stamp. « Actualiser » re-renders the page.
- **D-OS-14 Journal search is the RPC's**: note, target label and the raw action code. Before, it also matched the
  translated action label and the admin's name. An action group (several codes) has no RPC parameter, so with a
  group selected the page reads the newest 200 matches and pages them itself.
- **D-OS-15 Layout below 1440.**
  - At 1100 the tile rows go 2 × 2 and the paired panels stack: the frame's 4-up tile is too narrow for « 1 240 TND ».
  - J9 shows a card per order below 1280 (the 8-column table needs ~1 000 px; at 1100 the content is 796).
  - M1 (375) has no second tile row and no rail, as drawn.

## Verification

- **Fixture route:** a temporary `/fixture-admin`, deleted before commit, fed the real builders (`overview-vm`,
  `stats-vm`, `commandes/_lib/rows`) with RPC-shaped sample data.
- **Screens checked:** FR + AR at 1440, 1100 and 375. No horizontal scroll.
- **Not checked:** the signed-in routes were not browser-checked; there is no admin gate session. Click through the preview.
