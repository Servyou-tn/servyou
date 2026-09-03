# Tableau de bord freelance (H4) — discovery record

**Provenance — read this before trusting a number.** This file recovers a discovery pass that ran
earlier in the same working session as the H4 build (2026-09-03), against Figma frame `166:12086`
("Freelancer Dashboard", registry `figma-registry.md:347`) plus live schema/RLS reads on the
working tree. The pass closed with two `get_design_context` calls succeeding and the Figma monthly
quota (see [[reference_figma_mcp_monthly_quota]] in memory — Starter/View seat, 20 calls/month hard
cap) exhausted immediately after. **Quota exhaustion after the fact does not invalidate the two
measurements already taken** — they are tagged 📐 MEASURED below, same confidence as any other
`get_design_context` read this project has ever cited. Everything else in the stat row / Force du
profil / Ecosystem / Missions récentes sections was carried forward from two older memory passes
(`project_figma_dashboard_fixpass.md`, 2026-07-13; `project_figma_h4_parcours_stats_merge.md`,
2026-07-17) and was **re-verified live** against the current frame and the current schema/RLS in
this same pass — tagged 🧠✅ RE-VERIFIED, not stale. The Activité récente panel has no Figma content
at all (the frame draws only the header, `167:12333` — "Voir tout" link points at no real route) —
its shape is a **founder ruling off the event tables**, tagged 🔨 RULED, and is provisional: it gets
corrected against Figma if/when quota resets and the panel body is ever actually drawn.

This doc exists so a second `/clear` cannot erase this pass a second time. The original conversation
that produced parts of it was cleared before it was written down — that gap is the reason this file
is the FIRST commit-able artifact of the build, ahead of any code.

---

## 1. Stat row — FOUR tiles, not three

Frame order, `166:12086` → `167:1225x`:

| Node | Label | 📐/🧠 | Source |
|---|---|---|---|
| `167:12252` | Services actifs | 🧠✅ | `count(service_listings) where freelancer_profile_id = mine and status = 'active'` |
| `167:12260` | Engagements actifs | 🧠✅ | `count(orders) where seller_id = freelancer and order_type = 'service' and status not in ('received','cancelled')` |
| `167:12270` | Demandes en attente | 📐 **MEASURED** | same table, `status = 'pending'`. **Appeared in NO prior memory file** — found live this pass. The *label→status* mapping itself is an inference from the live status enum (`pending, accepted, prepared, dispatched, in_delivery, arrived, received, cancelled`) plus the G4 "Commandes à traiter" precedent, not a measured spec. Flagged as inferred in the PR body. |
| `167:12280` | Vues du profil · 30 jours | 📐 **MEASURED** (label text) | Renders **0, no delta**. See Ruling 1 — supersedes the older `project_figma_h4_parcours_stats_merge` note that this tile was seeded 342/↑18%. No `profile_views` table, no write path, nothing seeded. |

`StatTile` (`src/app/tableau-de-bord-vendeur/_components/StatTile.tsx`) has no `delta` prop at all,
so all four tiles being no-delta is a clean fit — **reused, duplicated locally** (its own comment:
promote to `src/components/ui` at the third consumer; H4 is the second). This is a deliberate
deviation from the Figma, which the 2026-07-13 pass described as "raw hand-built frames, NOT
StatTile instances" — logged, not chased, since no pixel spec for the hand-built version survived
that pass. Subtitles for tiles 1-3 have **no measured text** (never appeared in any pass) — they are
invented strings, flagged in the PR body same as the Demandes-en-attente mapping. Tile 4's subtitle
is `''` (period folded into the label — 2026-07-13 pass: "founder override A, no sub-label node").
`muted` is set true on tile 4: a blue-800 "0" reads as a measured fact, and Ruling 1 is explicit that
nothing here is measured or written yet.

## 2. Force du profil — checklist, exact copy from `167:12377` (📐 MEASURED)

| # | Copy | Backing | 📐/🔨 |
|---|---|---|---|
| 1 | "Photo de profil ajoutée" | `profiles.avatar_url IS NOT NULL` | 📐 |
| 2 | "Bio complétée" | `freelancer_profiles.bio` non-empty | 📐 |
| 3 | "Compétences renseignées" | `freelancer_skills` ≥ 1 row | 📐 |
| 4 | "Ajoutez 2 réalisations" | **no honest backing** — see Ruling 2 | 📐 copy / 🔨 behavior |

Denominator is **4**, not 3. Item 4 always renders NOT DONE and counts as unmet in the ring — a
freelancer with items 1-3 done shows **75%**, never 100%. Goes live when H3 ships
`freelancer_portfolio_items`. Items 1-3 query their real columns; nothing here is hardcoded true
because H2 enforces a minimum at creation, and no avatar gate exists at onboarding (checked — none
found this pass). The Figma MAIN ring elsewhere in the frame family reads 85%, a pre-existing
mismatch already logged 2026-07-17 and not re-chased here.

`Votre parcours` (`440:17758`) keeps its designed `vues > 0` gate and **does not render** — Vues du
profil is permanently 0 under Ruling 1, so the gate never opens. This is intentional, not a bug:
verification must assert Votre parcours is ABSENT, not present-and-empty.

## 3. Ecosystem widget — buildable now (🧠✅ RE-VERIFIED)

- Consumers: `count(public_profiles) where seller_type is null`. `public_profiles` (security-invoker
  false, bypasses base `profiles` RLS by design) is readable by `anon`/`authenticated` and — because
  it bypasses RLS — **also counts suspended profiles**; there is no suspension flag on the view to
  filter on. One line, not chased further.
- Boutiques: `count(shops)`, plain `{ count: 'exact', head: true }` — `shops` SELECT is `using (true)`
  for everyone. **Tension, stated not resolved:** migration `20260607160156`'s own comment says
  "public surfaces must filter `admin_hidden_at IS NULL`" for shops, but the report this doc recovers
  says "plain count." Implemented per the report (no `admin_hidden_at` filter) — flagged here as a
  follow-up if the founder wants moderated shops excluded from the ecosystem tile.
- `admin_overview_stats()` is `is_admin()`-gated and **not usable** from this surface.

## 4. Missions récentes (🧠✅ RE-VERIFIED)

`job_posts where status = 'open' and admin_hidden_at is null`, matched via `job_post_skills`
overlapping the freelancer's own `freelancer_skills`, `order by created_at desc limit 3`. RLS
verified clean on `job_posts` / `job_post_skills` / `freelancer_skills` for this read shape.

Match is **two round trips** (skills → matching post ids → posts) and both `skill` columns are free
text — **matching is exact, case- and accent-sensitive today**; near-miss/fuzzy matching is a
follow-up, not this PR. The "no match" fixture must use a genuinely non-overlapping skill set, not
just an empty list, or the test proves nothing.

No shared `ListRow` exists in code (Figma only) — built a dedicated `MissionRow.tsx`, following the
`ProductRow.tsx` precedent (route-local, hand-built markup, not a parameterized shared primitive).

**Link-destination rule applied three times in this build, stated once so the third reads as
deliberate:** *omit a link only when the destination route does not exist in code at all.*
- "Voir tout" (Activité récente) → omitted. No route for it, anywhere.
- "Voir mon profil public" (Actions rapides) → omitted. D4 (`/freelance/[slug]`) has no route
  directory at all.
- Missions récentes row + header link → **kept**, pointed at `/trouver-des-missions`. That route DOES
  exist (`src/app/trouver-des-missions/page.tsx`) — it currently renders a `ComingSoon` stub, but a
  stub is a real page, not a missing route. Different case from the first two; not linking would be
  inconsistent with the rule, not an application of it.

## 5. Actions rapides (🧠✅ RE-VERIFIED)

Copy the G4 array pattern (`tableau-de-bord-vendeur/page.tsx:79-84` and `:322-345`). Freelancer
destinations, omitting "Voir mon profil public" (D4 has no route — see the rule above).

## 6. Guard (📁 REPO, checked live)

No `requireFreelancer` exists — `require-seller.ts` exports only `requireShopOwner`. The current
`/tableau-de-bord` stub guards on `getShellUser()` alone: any authenticated user (consumer,
shop_owner) currently sees the freelancer ComingSoon stub. Built `requireFreelancer` in the same
file, same three-outcome shape (logged out → `/connexion?next=`, wrong/no role →
`/devenir-vendeur`, right role → context). Returns `freelancerProfile: { id, ... } | null` — **not
just `userId`** — because `service_listings` and `freelancer_skills` key on `freelancer_profile_id`,
not on the auth user id. `freelancerProfile: null` (a freelancer who never finished H2) is a real
state, parallel to G4's `shop: null`, and gets its own panel (mirrors `page.tsx:349-355`) rather than
crashing tiles or rendering silent zeros.

## 7. Workspace roots (📁 REPO, checked live)

Neither root has ever had a page — only the `creer/` (and `ma-boutique`'s `modifier/`) subroutes
exist. Live call sites that assume the root resolves: `roles.ts:76` (`roleWorkspacePath`, via
`verify-email.ts`), `ProfileAvatarMenu.tsx:133`/`:124`, `ma-boutique/creer/page.tsx:50`. Ruling 3:
bare-redirect page at both roots — `/mon-profil-freelance` → `/tableau-de-bord`, `/ma-boutique` →
`/tableau-de-bord-vendeur` — no auth check duplicated here; the target's own guard
(`requireFreelancer` / `requireShopOwner`) handles auth + role.

---

## Rulings (🔨 founder, this session)

1. **Vues du profil** — keep the tile, render 0, no delta, no table, no write path, nothing seeded.
   `Votre parcours` keeps its `vues > 0` gate and does not render. (Reverses the 2026-07-17 memory's
   seeded-342 placeholder.)
2. **"Ajoutez 2 réalisations"** always renders NOT DONE, counts as unmet in the 4-item ring. Do not
   re-copy it to match `portfolio_link` (that column is not the same thing as portfolio items). Do
   not drop it. Goes live when H3 ships `freelancer_portfolio_items`.
3. Workspace-root redirects, both directions (see §7 above). `verify-email.test.ts:16-18`'s pinned
   assertion values are unchanged (`nextDestinationAfterVerify` still resolves to
   `/mon-profil-freelance`); only the comment claiming that path "is still a 404" is now false and
   gets corrected in this PR, along with the matching stale comment at `ProfileAvatarMenu.tsx:104`.
4. Build `requireFreelancer` (see §6).
5. Demandes en attente: `status = 'pending'` mapping, flagged as inference in the PR body (see §1).
6. Dedicated `MissionRow.tsx` (see §4).
7. Actions rapides per G4, omitting the D4 link (see §5).
8. **Activité récente** — founder-ruled from the event tables, NOT Figma-measured (quota exhausted
   before the panel body was ever drawn). Marked provisional in code and in the PR description.
   4 rows, icon chip + one line + relative timestamp, newest first:

   | Source | Filter | Icon / tone | Copy | Secondary |
   |---|---|---|---|---|
   | `orders` insert (seller, service) | `seller_id = freelancer, order_type = 'service'`, keyed on `created_at` | `file-plus`, info | "Nouvelle demande de service" | service title |
   | `order_events` | `event_type = 'status_change'` ONLY — excludes `'created'`, which would double-report the same instant as the row above | `check-circle`; tone `received → success`, `cancelled → danger`, else `info` (not "success on terminal" as a blanket rule — a cancelled order is not a success) | "Engagement {status}" via `statusPillFor()` / `PILL_BASE` (`lib/orders/order-status.ts`) — **no invented strings**. Note: `statusPillFor('arrived','service')` yields "Travail livré", so "Engagement Travail livré" reads slightly oddly in French; flagged, not fixed — the string is shipped and locked elsewhere. | service title |
   | `job_responses` | `freelancer_id = auth.uid()` | `send`, indigo | "Réponse envoyée" | job post title |

   **Query shape correction from the naive reading of this ruling** (advisor catch, applied): a bare
   `.from('order_events')` is scoped by RLS to *either party* (`buyer_id = auth.uid() OR
   seller_id = auth.uid()`), so it would leak a freelancer's own purchases into their seller activity
   feed. Both (a) and (b) are read off ONE query — `.from('orders').eq('seller_id',
   userId).eq('order_type', 'service')` with an `order_events` embed — the same shape
   `seller-orders.ts:173-185` already proves; (a) reads `orders.created_at`, (b) filters the embed to
   `event_type === 'status_change'` in JS. Title resolution reuses the existing `item_title ??
   service_listings.title` fallback (`seller-orders.ts:230`), not a second implementation of it.

   Relative time via `tn()` (`lib/i18n/plurals.ts`) — new keys in `frPlurals`/`arPlurals`, plus a
   plain `t()` key for "hier." No date library added.

   Empty state: `PanelEmpty`'s pattern from `tableau-de-bord-vendeur/_components/Panel.tsx`,
   duplicated locally, not promoted — its own comment says promote at the third consumer; this is
   the second (`Panel`/`PanelEmpty` and `StatTile` are each being duplicated once here, for the same
   stated reason).

   "Voir tout" omitted, not fake-disabled (see the link-destination rule in §4).

No migration in this PR. Every panel above ships in one PR, not a slice.
