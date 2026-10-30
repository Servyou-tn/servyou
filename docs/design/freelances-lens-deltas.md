# Freelances lens — diff + decisions

Measurements: `docs/design/freelances-lens-measurements.md`. Branch `feat/freelances-lens` (from origin/main 73b7af2). Priority from the founder, 2026-10-30.

## Diff
| # | Class | Frame | Was live |
|---|---|---|---|
| 1 | MISSING | the Freelances lens (toolbar, 2-up grid of Freelancer Cards, pagination) | a disabled « Freelances · Bientôt » segment on `/marche/services` |
| 2 | DIFFERENT | toggle: `surface/sunken` track, text-only segments | `surface/pill` track with Briefcase / Users glyphs |

## Decisions (numbered, reversible)
- **D1 The lens is `?vue=freelances` on `/marche/services`** — not `?lens=` and not its own route: it is the exact pattern of the shipped Boutiques lens (`?vue=boutiques` on `/marche/produits`), so the two marketplaces share one URL vocabulary. Shareable, back-button safe, no client state. It is independent of the C2 `?type=` rules (those belong to `/categories/[slug]`; `/marche/services` has no `type`). An unknown `vue` is the Services lens.
- **D2 Which freelancers: at least one ACTIVE, non-moderated service, AND `is_published = true` AND `admin_hidden_at IS NULL`, all stated explicitly.** `is_published` is derived from `status = 'active'` alone — it does not see a service an admin hid — so the visible-service set is the base (the same visibility `getFreelancerCards` counts: a card never says « 0 services ») and the profile flags are checked on top. RLS already hides unpublished, moderated and suspended profiles from a stranger — but its policy lets the OWNER, a buyer and a seller through (an admin sees everything), so without the explicit filters a freelancer would see their own unpublished profile in the marketplace. A suspended freelancer seen by an admin or a past buyer is gated by RLS alone, as on `/freelance/[id]`. Same read path and anon / authenticated client; no service-role read. The Ville options use the same set.
- **D3 The toggle follows the new frames on BOTH lenses:** sunken track, text only (segment widths 82 / 98 = text + 24), links, no « Bientôt ». The Services lens's own toggle changes look with it (pill track + glyphs → sunken + text), so the two lenses show one component. The 1440 frame draws **Services** selected although it is the Freelances page (the 375 frame has Freelances selected) — treated as a frame slip.
- **D4 Controls kept: search, Catégorie, Ville, sort.** **Dropped: Prix** (a freelancer has no price of their own — services do — and none is invented) and the frame's grid / list toggle (no list specimen). Catégorie = the SECTORS of the freelancer's ACTIVE, visible services (a freelancer has no sector column), listed with `getFilterCategoriesForType('service')`; picking one keeps the freelancers with at least one active service in that sector or one of its sub-categories. Ville = the free-text city of published freelancers.
- **D5 Sort = « Plus récents » (default) and « Nom (A–Z) ».** Nothing else has data: no rating exists, and years of experience is optional. Search matches the name, the headline or a skill, accent- and case-insensitively, every word required. City is compared on its trimmed value, so a listed city never returns nothing because of a stray space.
- **D6 Search placeholder is « Rechercher un freelance… »** — the frame's « Rechercher un service… » is the services bar copied over.
- **D7 Eight cards a page** (2-up × 4 rows, as drawn); the frame's caption « 1 à 12 sur 1 248 » is mock. The caption is the shared Pagination's, with the **real** total (« Affichage 1 à 8 sur 10 »).
- **D8 The existing `FreelancerCard` (the /mes-favoris card, F1) is reused unchanged**, heart included (`FavoriteHeart kind="freelancer"`; a guest is sent to `/connexion?next=/freelance/<id>`, nothing written). Differences from the frame that stay as F1 decided: the resting border is `border/subtle` (blue on hover; the frame's 2 px blue reads as a hover state leaking), and a card shows no skill chips when the freelancer has none — **none of the 10 current published profiles has a skill row**, so no chip row appears today although the frame draws one.
- **D9 Mobile: the same bar, wrapped.** The 375 frame draws only the shell's header search; the bar (search full width, Catégorie / Ville / sort beneath) is what the Boutiques lens ships and the only way to filter on a phone. Below `lg` the page also shows the « Marketplace » title like the other lenses.
- **D10 Empty states:** « Aucun freelance pour le moment » (nobody published) vs « Aucun freelance ne correspond à votre recherche » + « Réinitialiser les filtres » (filters caused it). A failed search shows the inline ErrorState — never the empty card.
- **D11 Switching lens drops the other lens's filters** (a price range means nothing to a freelancer); a stripped-only query (`%%`) filters nothing.
- **D12 The search box follows `q` without remounting the bar** (a chip / « Tout effacer » clears it; submitting keeps the focus and an open menu) — the Boutiques lens still remounts on every `q` change (logged).

## Arabic
New AR strings (`freelances.*`) are drafts, marked `REVIEW_AR_TRANSLATION`.

## Verification
- `tsc`, eslint on changed files, unit tests by path (search layer with a mocked client: visibility filters, the service-set base, sector / city (trimmed) / query / sort, paging clamp, id chunking, paging past 1000 rows, every lookup failing throws; toggle render; i18n parity). No live-DB suite.
- Browser (own isolated session, public READS only): FR + AR × 1440 + 375 on 10 real published freelancers; ville / query (name + headline) / sort / sector / paging / malformed sector / stripped query / empty state; signed-out heart → `/connexion?next=…`; toggle back to Services drops the filters. Signed-in heart state not exercised (no auth in this session).
- Figma MCP reads: 0.
