# Mobile tap targets — 375 hit-box probe (`fix/mobile-hit-area`, 2026-11-06)

Rule (architect's audit `claude/hit-area-audit-2026-11-06.md`): below lg (1024) every tap target offers ≥ 44 × 44. Desktop
does not change by a pixel, and nothing painted changes on mobile either (invisible hit extension), so VRT baselines don't
move.

## Method

- **Probe.** For every visible `a[href]`, `button`, `[role=button|tab|switch|menuitem|checkbox|radio]`, `summary`,
  `select` and checkbox / radio, the probe walks out from the element's centre along each axis with `elementFromPoint`.
  It stops when the hit leaves the element (or one of its descendants), which gives the effective hit box.
  - A target passes at ≥ 44 on both axes. Width is capped at 81 by the 40 px walk, which is enough.
  - Points covered by another element count against the target, so a neighbour's extension that steals a tap shows up.
- **Setup.** Viewport 375 × 2400, FR, anonymous, local dev server.
- **Before** is this branch before the change. `<label for>` rows were removed from the before counts: the input itself is
  the target.
- **Static scan.** An AST scan of every `<button>` / `<a>` / `<Link>` / `<label>` opening tag whose className (class
  constants resolved) carries `h-5`…`h-10` / `size-5`…`size-10` with no 44 px override and no hit span.
  - Result: **0 left** (it listed 46 before; the insertion pass resolved constants further and fixed 59).

## Result

| Route (375 × 2400, FR) | Targets | Under 44 before | Under 44 after |
|---|---|---|---|
| `/` | 21 | 0 | 0 |
| `/marche/produits` | 32 | 5 | 0 |
| `/marche/services` | 22 | 5 | 0 |
| `/trouver-des-missions` | 5 | 2 | 1 |
| `/recherche?q=logo` | 11 | 7 | 1 |
| `/contact` | 18 | 14 | 9 |
| `/connexion` | 5 | 2 | 1 |
| `/inscription` | 5 | 1 | 0 |
| `/services/de5e0001-0000-4000-a…` | 13 | 5 | 0 |
| `/produits/09b0324d-788c-49e7-8…` | 16 | 4 | 0 |
| `/freelance/1b356f3c-7a4d-409f-…` | 14 | 5 | 0 |
| `/boutique/f4757d2d-705c-48c8-b…` | 28 | 4 | 0 |
| **Total** | **190** | **54** | **12** |

- `/trouver-des-missions` redirects an anonymous visitor to `/connexion`, so it repeats that page.
- The signed-in pages (dashboards, `mes-*`, `parametres`, admin) are covered by the static scan only. Minting a gate session
  writes to production auth, so it waits for the founder's OK.

### Every target that was under 44

| Route | Target | Box | Hit before | Hit after |
|---|---|---|---|---|
| `/marche/produits` | Servyou | 32x32 | 32x32 | ≥ 44 ✓ |
| `/marche/produits` | FR | 41x24 | 41x24 | ≥ 44 ✓ |
| `/marche/produits` | AR | 43x24 | 44x24 | ≥ 44 ✓ |
| `/marche/produits` | Produits | 79x36 | 79x36 | ≥ 44 ✓ |
| `/marche/produits` | Boutiques | 91x36 | 81x36 | ≥ 44 ✓ |
| `/marche/services` | Servyou | 32x32 | 32x32 | ≥ 44 ✓ |
| `/marche/services` | FR | 41x24 | 41x24 | ≥ 44 ✓ |
| `/marche/services` | AR | 43x24 | 44x24 | ≥ 44 ✓ |
| `/marche/services` | Services | 82x36 | 81x36 | ≥ 44 ✓ |
| `/marche/services` | Freelances | 97x36 | 81x36 | ≥ 44 ✓ |
| `/trouver-des-missions` | Mot de passe oublié ? | 146x17 | 81x18 | 81x42 |
| `/trouver-des-missions` | Créer un compte | 128x22 | 81x23 | ≥ 44 ✓ |
| `/recherche?q=logo` | Servyou | 32x32 | 32x32 | ≥ 44 ✓ |
| `/recherche?q=logo` | FR | 41x24 | 41x24 | ≥ 44 ✓ |
| `/recherche?q=logo` | AR | 43x24 | 44x24 | ≥ 44 ✓ |
| `/recherche?q=logo` | Automobile & Accessoires | 209x39 | 81x40 | ≥ 44 ✓ |
| `/recherche?q=logo` | Beauté & Soins | 134x39 | 81x40 | ≥ 44 ✓ |
| `/recherche?q=logo` | Électronique | 118x39 | 81x40 | ≥ 44 ✓ |
| `/recherche?q=logo` | Parcourir tout | 91x21 | 81x22 | 81x36 |
| `/contact` | FR | 41x24 | 41x24 | ≥ 44 ✓ |
| `/contact` | AR | 43x24 | 44x24 | ≥ 44 ✓ |
| `/contact` | bonjour@servyou.tn | 137x20 | 81x20 | ≥ 44 ✓ |
| `/contact` | bonjour@servyou.tn | 28x28 | 28x28 | ≥ 44 ✓ |
| `/contact` | +216 XX XXX XXX | 122x20 | 81x20 | ≥ 44 ✓ |
| `/contact` | Boutiques | 66x17 | 68x18 | 68x32 |
| `/contact` | Freelances | 72x17 | 74x18 | 74x32 |
| `/contact` | Missions | 58x17 | 60x18 | 60x32 |
| `/contact` | Catégories | 72x17 | 74x18 | 74x32 |
| `/contact` | À propos | 60x17 | 60x18 | 61x32 |
| `/contact` | Contact | 52x17 | 53x18 | 53x32 |
| `/contact` | FAQ | 27x17 | 28x18 | 28x32 |
| `/contact` | Conditions d'utilisation | 151x17 | 81x18 | 81x32 |
| `/contact` | Confidentialité | 96x17 | 81x18 | 81x32 |
| `/connexion` | Mot de passe oublié ? | 146x17 | 81x18 | 81x42 |
| `/connexion` | Créer un compte | 128x22 | 81x23 | ≥ 44 ✓ |
| `/inscription` | Se connecter | 102x22 | 81x23 | ≥ 44 ✓ |
| `/services/de5e0001-000` | Servyou | 32x32 | 32x32 | ≥ 44 ✓ |
| `/services/de5e0001-000` | FR | 41x24 | 41x24 | ≥ 44 ✓ |
| `/services/de5e0001-000` | AR | 43x24 | 44x24 | ≥ 44 ✓ |
| `/services/de5e0001-000` | Services | 75x16 | 76x16 | ≥ 44 ✓ |
| `/services/de5e0001-000` | Chargement… | 20x20 | 20x20 | ≥ 44 ✓ |
| `/produits/09b0324d-788` | Servyou | 32x32 | 32x32 | ≥ 44 ✓ |
| `/produits/09b0324d-788` | FR | 41x24 | 41x24 | ≥ 44 ✓ |
| `/produits/09b0324d-788` | AR | 43x24 | 44x24 | ≥ 44 ✓ |
| `/produits/09b0324d-788` | Produits | 73x16 | 74x16 | ≥ 44 ✓ |
| `/freelance/1b356f3c-7a` | Servyou | 32x32 | 32x32 | ≥ 44 ✓ |
| `/freelance/1b356f3c-7a` | FR | 41x24 | 41x24 | ≥ 44 ✓ |
| `/freelance/1b356f3c-7a` | AR | 43x24 | 44x24 | ≥ 44 ✓ |
| `/freelance/1b356f3c-7a` | Partager | 101x40 | 81x42 | ≥ 44 ✓ |
| `/freelance/1b356f3c-7a` | Demander un service2 | 196x32 | 81x32 | ≥ 44 ✓ |
| `/boutique/f4757d2d-705` | Servyou | 32x32 | 32x32 | ≥ 44 ✓ |
| `/boutique/f4757d2d-705` | FR | 41x24 | 41x24 | ≥ 44 ✓ |
| `/boutique/f4757d2d-705` | AR | 43x24 | 44x24 | ≥ 44 ✓ |
| `/boutique/f4757d2d-705` | Partager | 101x40 | 81x42 | ≥ 44 ✓ |

## What is left (12) — each needs a layout change, not an invisible extension

| Target | Hit after | Why it stops there |
|---|---|---|
| Footer links (9) | 32 | Rows are 17 px tall and 12 px apart (`space-y-3`). Each takes half the gap; 44 needs taller rows. |
| « Mot de passe oublié ? » | 42 | 12 px below the password field and 19 px above « Se connecter ». It takes 6 + 18 px, all the free space. |
| « Parcourir tout » (search, no results) | 36 | 12 px from the link above it in the column. |

## Painted pixels

Viewport screenshots before vs after, 8 routes × 375 and 1440:

| Result | Shots |
|---|---|
| Byte-identical | 10 of 16 |
| Same as the noise between two « after » runs (an image fading in, sub-pixel jitter; max channel delta 1–8) | 3 |
| Deterministic text anti-aliasing change on Windows Chrome | 3 |

The last 3 are the FR / AR toggle, « Créer un compte » and the /marche/services card text:
- Text under a target that now holds a hit span switches from subpixel to greyscale anti-aliasing. The largest channel
  delta is 41, on colour fringes only; nothing moves and nothing changes colour.
- `position: relative` alone changes nothing (0 px, tested). The overlay span is what triggers it.
- CI's Linux headless Chrome renders greyscale text anyway, and the Storybook VRT in CI is the gate.

All 1440 shots are identical or noise: every change is `max-lg:`.
