# 🔴 tailwind-merge cannot classify our custom `text-*` SIZE tokens, so `cn()` silently drops them

- **What:** `twMerge` recognises a font-size utility either by name (built-in `text-sm`, `text-xl`)
  or by an arbitrary value (`text-[12px]`). Our design-system sizes are **neither** — `text-h1`,
  `text-h3`, `text-body`, `text-body-sm`, `text-caption` are `@theme` utilities — so twMerge files
  them under the catch-all `text-*` **colour** group. Any `cn()` string that pairs a size token with
  a colour token therefore keeps only the later one, and the loser vanishes with no error, no lint
  failure and a green build. Reproducible in three lines:

  ```js
  twMerge('text-caption text-text-secondary')  // → 'text-text-secondary'   size lost
  twMerge('text-body-sm text-text-muted')      // → 'text-text-muted'       size lost
  twMerge('text-h3 text-text-primary')         // → 'text-text-primary'     size lost
  ```

- **Three instances have now SHIPPED**, which is why this is filed as a class and not a bug:
  1. a **size** evicted during the /marche/services rebuild (`text-body-sm`),
  2. a **colour** evicted on G9's WhatsApp label (`text-text-primary`, 1.69:1 contrast — an
     accessibility failure that reached production),
  3. a **size** again on `OrderRail`'s stepper labels — 12px labels rendered at the inherited 16px
     inside a 16px line box on **both** G9 and E3.
- **Full inventory (scanned across every `cn()` site in `src/`): 4** at last count, **+2 more found
  and closed 2026-09-06 during H5's fidelity pass** (DOM-verified live, not just grep — see H5's own
  entry above), **+1 sibling spotted while fixing those** (same file shape, a different route, not
  touched — one-PR-one-focus). Running total: **7**. Two were closed in `feat/orders-snapshot-wiring`
  because they were visible and one of them was a named G9 delta:
  | site | loses | state |
  |---|---|---|
  | `components/orders/OrderRail.tsx` label | `text-caption` (12→16) | ✅ **closed** — plain template |
  | `tableau-de-bord-vendeur/_components/Panel.tsx` link | `text-body-sm` (14→16) | ✅ **closed** — plain template |
  | `app/commandes-recues/page.tsx` tab | `text-body` | ⚠ **open — latent**, inherited size is also 16 so nothing renders wrong *today* |
  | `app/commandes-recues/_components/SortSelect.tsx` | `text-body` | ⚠ **open — latent**, same |
  | `mes-services/_components/ServicesList.tsx` table-header labels | `text-caption` (12→16) | ✅ **closed** 2026-09-06 — plain template (DOM-verified: `fontSize` 16px through `cn()`, 12px after) |
  | `mes-services/_components/ServiceRow.tsx` "Voir" link | `text-body-sm` (14→16) | ✅ **closed** 2026-09-06 — plain template (DOM-verified) |
  | `mes-produits/_components/ProductRow.tsx` "Modifier" link | `text-body-sm` (14→16, presumed) | ⚠ **open — not verified live, not fixed**. Byte-identical `cn()` string to ServiceRow's own "Voir" link, on an already-shipped G5 route — out of an H5 PR's scope. |
  The `⚠ open` rows are **landmines, not defects**: several are invisible only because 16px happens
  to be the inherited size. Any future change to the ancestor's size makes them wrong silently.
- **The local fix used, and why it is the right shape:** drop `cn()` and use a plain template
  string. Class ORDER is not a guard rail — reordering "fixes" it until the next edit reorders it
  back, and that is how instance 3 happened after instance 1 was understood. Removing the merge
  makes the collision **structurally impossible**. `cn()` remains correct wherever there is no
  size+colour pair (e.g. `OrderRail`'s circle: bg/border groups only). There is precedent:
  `TopbarSearch` swapped `cn()` for a template for exactly this reason.
- **Systemic fix — a founder decision, deliberately NOT built here.** Three options, cheapest last:
  1. **Extend twMerge's config** — `extendTailwindMerge({ extend: { classGroups: { 'font-size': [{ text: ['h1','h2','h3','h4','body','body-lg','body-sm','caption'] }] } } })` in `src/lib/utils.ts`. One
     edit, fixes every present and future site, and makes `cn()` behave as everyone already assumes.
     Risk: it changes merge behaviour app-wide, so it wants a VRT run over all 32 baselines.
  2. **A lint rule** — `eslint-rules/` already exists. Flag any `cn()` argument list containing both
     a size token and a `text-*` colour token. Catches new instances but fixes none, and cannot see
     through a variable.
  3. **Rename the tokens** so twMerge classifies them (e.g. `text-size-caption`). Most invasive —
     touches every call site in the app — and buys nothing option 1 does not.
  **Recommendation: option 1 plus option 2** — the config makes `cn()` correct, the lint rule stops
  anyone reintroducing the pattern in a component that does not use `cn()`.
- **Trigger:** the next DS/token pass that can afford a VRT re-baseline. Do it before the typography
  token pass, not after — that pass will touch every one of these strings.
