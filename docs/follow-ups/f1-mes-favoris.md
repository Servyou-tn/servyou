# F1 Mes favoris (`feat/f1-favoris`, 2026-08-16)

## `BlurFade` (magicui) throws a React hydration-mismatch console error on every page that uses it — pre-existing, not introduced by this PR
- **What:** motion/react serializes `style.opacity`/`style.filter`/`style.transform` as numbers
  on the client but the SSR pass emits them as strings ("0" vs `0`, etc.), so React logs "A tree
  hydrated but some attributes of the server rendered HTML didn't match the client properties" —
  Next's dev overlay surfaces it as a "1 Issue" toast. Confirmed via CDP (`Console Error` +
  full component stack pointing at `src/components/magicui/blur-fade.tsx:75`).
- **Not specific to F1** — reproduced identically on `/marche/produits` (`ProductBrowseGrid` →
  `BlurFade`), which predates this PR and never touched `mes-favoris`. `ListingResults`
  (`src/components/listings/ListingResults.tsx`), reused here per Ruling 3, wraps every
  card in the same `BlurFade`, so `/mes-favoris` inherits the same warning — it did not create it.
  Matches the "BlurFade opacity-0 hydration false-positive" gotcha already on file from earlier
  visual-gate passes.
- **Not fixed here** — `BlurFade` is a shared entrance-animation primitive used across
  `/recherche`, `/categories/[slug]`, the consumer homepage, `/marche/produits`, `/marche/services`
  and now `/mes-favoris`; the fix belongs in `magicui/blur-fade.tsx` itself (likely coercing the
  animated style values to a consistent string/number shape before the first paint), not in any
  one caller.
- **Trigger:** a small, dedicated PR against `src/components/magicui/blur-fade.tsx`.

## `shared/PageHeader` silently absorbs the page's only `<h1>` on 6 other callers — headings audit needed

- **What:** this PR fixed the mechanical defect on `/mes-favoris` and `/mes-missions` — both
  imported `shared/PageHeader` (aliased `PageSubtitle`) alongside `marche/PageHeader`, but never
  passed `marche/PageHeader`'s `title`, so the animated *subtitle* component ended up rendering
  the page's only `<h1>`. Fixed via a new `as?: 'h1' | 'p'` prop (default `'h1'`) on
  `shared/PageHeader`, `as="p"` + a real `title` on both fixed pages. See
  `docs/design/f1-discovery.md` §1 for the full trace.
- **Not fixed — 6 other callers of `shared/PageHeader`, each a different shape, each needing its
  own Figma read to resolve (quota exhausted this cycle):**
  - `mes-missions/nouvelle/page.tsx`, `recherche/page.tsx`, `categories/[slug]/page.tsx`,
    `ConsumerHomepage.tsx` (`/`) — no `marche/PageHeader` import at all, so `shared/PageHeader` is
    the page's *only* heading, ever. `/recherche`'s only renders when a query has results (zero
    `<h1>` on the landing/empty state); `/categories/[slug]` shows a dynamic "{count} produits
    dans {category}" line instead of the category name as a static title; `/` (`ConsumerHomepage`)
    is explicitly a thin, un-measured landing (no Figma frame exists for it at all — see the
    "INFERRED" note at `ConsumerHomepage.tsx:18`). Whether any of the four needs a distinct static
    `<h1>` is a per-page Figma question, not something to infer.
  - `profil/page.tsx` and `parametres/page.tsx` — **duplicate `<h1>`s**, the opposite shape:
    `shared/PageHeader`'s subtitle renders one `<h1>`, and a second, separate `<h1>` already
    exists (`profil/page.tsx:24`; `ParametresForm.tsx:88`, reading `t('parametres.title')`).
    `/profil` is explicitly marked a temporary stub ("full profile surface returns in a
    follow-up commit") pending its own rebuild.
- **Why not widened here:** the founder's own instruction on this PR — "those are per-page Figma
  questions and the quota is gone; do not widen scope on inference." Fixing 6 more pages on a
  guess about what each one's frame actually specifies is exactly the inference this PR was told
  not to do.
- **Trigger:** a dedicated headings-audit PR once Figma quota resets — pull each of the frames that
  have one (ConsumerHomepage has none — see above), decide per page whether `shared/PageHeader`
  needs a sibling `marche/PageHeader` (or, for `profil`/`parametres`, whether the *existing*
  second `<h1>` should just win and `shared/PageHeader` there switch to `as="p"`), and fix all 6
  in that one pass so it doesn't fragment into six small PRs each re-deriving this same list.
- **🔴 ADDENDUM (2026-08-16) — `/mes-favoris` and `/mes-missions` no longer call
  `shared/PageHeader` at all.** A screenshot after this fix shipped showed both pages rendering
  *two* headers stacked (the `as="p"` subtitle band on top, the real `<h1>` below) — the `as` prop
  stopped the double-`<h1>` a11y defect but never addressed double-rendering. Founder ruling: drop
  the `PageSubtitle` call entirely on both pages, `marche/PageHeader`'s `title` stays as the sole
  heading. Basis: two independent founder reads of `718:60584` both describe a title only, no
  subtitle line; `/mes-missions` has no frame at all (see next entry) so matching its sibling is
  the right default over inventing a subtitle for it. `shared/PageHeader` itself is untouched —
  its `as` prop and its other 6 callers are unaffected; this only removes 2 of the 8 call sites,
  leaving 6.
- **🔴 `/mes-missions` has no Figma frame mapped at all** — `docs/reality-sync/master-matrix.md:133`
  lists it `NONE 🔴 Zone F gap`. Every heading decision made for this page (this PR's title string,
  the subtitle removal above) is inferred from its sibling `/mes-favoris`, not measured against
  any frame. Not a defect to fix — there's nothing to measure against — but any future claim that
  `/mes-missions`'s header is "correct" should be read as "consistent with `/mes-favoris`," not
  "Figma-verified."

## `shared/PageHeader`'s `emphasisWord` renders as a blue underlined span with no interactivity — reads as a dead link

- **What:** on every caller that passes `emphasisWord`, the matched substring gets
  `text-brand-blue-600` plus an animated `.ph-underline` bar drawn under it (`globals.css:269-289`)
  — visually identical to a link. The span carries no `href`, no `onClick`, is not focusable, and
  has no pointer cursor. Surfaced while investigating the `/mes-favoris` double-header stack (the
  subtitle band carrying this treatment was one of the two things founder-screenshotted); the
  band itself is now removed on `/mes-favoris` and `/mes-missions` (see addendum above), so this
  no longer applies to those two pages specifically — but the same treatment is still live on
  `shared/PageHeader`'s other 6 callers (`recherche`, `profil`, `parametres`,
  `mes-missions/nouvelle`, `ConsumerHomepage`, `categories/[slug]`), on 5 of which it renders
  directly on the page's actual `<h1>` text.
- **Not a ruled defect — logged as an open question.** This is `shared/PageHeader`'s core visual
  signature (`shared/PageHeader.tsx:3`, "Premium animated subtitle row"), not a one-off mistake;
  whether a non-interactive link-styled span on a page's main heading is acceptable is a
  component-level design call, not something to infer from one page's screenshot.
- **Trigger:** a founder ruling on `shared/PageHeader`'s emphasis treatment — either keep it
  (documented as intentional, not a link despite the visual read) or replace the blue+underline
  pairing with a non-link-coded accent (e.g. weight or a different color that isn't the interactive
  brand-blue).

## `SegmentedControl`'s solid blue pill vs. the quiet frame — founder-ruled for F1, four implementations still unconsolidated

- **What:** `/mes-favoris`'s tab switcher rendered `SegmentedControl`'s active state — a solid
  `bg-brand-blue-600` pill with white text and a Motion sliding-indicator animation. Figma
  `718:60584` draws the tabs as plain text labels with the active one on a subtle light
  background — quiet, low-contrast, no blue fill. Founder ruling: *"the switcher toggle buttons
  are not the same we build in figma, they should be like all the other pages."*
- **The "other pages" aren't one pattern — checked, not assumed.** `ProduitsLensToggle` (Figma
  `578:42513`), `ServicesLensToggle` (`661:53879`) and `OrdersTabs` (`709:59668`/`710:59947`) are
  all quiet (white active pill, no blue fill) but split on token: `ServicesLensToggle` and
  `OrdersTabs` both use `bg-surface-pill` + `shadow-sm`; `ProduitsLensToggle` alone uses
  `bg-surface-sunken` + `shadow-xs`. Two-vs-one, and the two don't average out to a third answer —
  one of the three is simply built on a different token pair than the other two. None of the three
  is a stateful client-rendered tab switcher either: `ProduitsLensToggle` and `OrdersTabs` are
  static server components (URL-driven / permanently-fixed selection), so "matches the siblings"
  is a claim about visual tokens, not about matching component architecture.
- **Fixed here, F1-local only, ruled by the frame itself, not by majority vote among the
  siblings:** `get_variable_defs` on `718:60584` returned `surface/sunken` (not `surface/pill`),
  `text/primary`, `text/secondary`, `radius/lg`=10, `radius/md`=8. That matches
  `ProduitsLensToggle`'s token pair, not `ServicesLensToggle`/`OrdersTabs`'s — which means those
  two may themselves be off, or were built against different frames with different tokens; that's
  unverified and out of scope here. `FavorisTabs` now renders bespoke markup on
  `ProduitsLensToggle`'s exact classes (`bg-surface-sunken` track, `bg-white` + `text-text-primary`
  + `shadow-xs` active pill, `text-text-secondary` otherwise) because those are the tokens the F1
  frame actually specifies. `SegmentedControl` itself was deliberately left untouched — no variant
  prop was added.
- **Not fixed — `SegmentedControl`'s other two callers were never checked against a frame at all:**
  `ParametresForm`'s FR/AR language toggle and `SharedSearchBar`'s Produits/Services search toggle
  (topbar, `/recherche`, `/marche`) both use `SegmentedControl` with no Figma citation next to
  either call site. Whether they're correct or also wrong — and whether `ServicesLensToggle`/
  `OrdersTabs`'s `surface-pill`/`shadow-sm` pair is right for their own frames or is itself a
  drift — is unknown without pulling all the frames together.
- **Why not consolidated here:** four separate implementations of one "pill toggle" idea, with at
  least one confirmed internal token disagreement among the three "quiet" ones, is a design-system
  consolidation question, not an F1 bug fix. Deciding whether `SegmentedControl` should become the
  one shared abstraction (and which token pair is actually correct) needs its own frame reads
  across all of `ParametresForm`, `SharedSearchBar`, `ProduitsLensToggle`, `ServicesLensToggle` and
  `OrdersTabs` together — scope this PR was told to stay out of.
- **Trigger:** a dedicated design-system PR: pull frames for `ParametresForm`'s and
  `SharedSearchBar`'s toggles, resolve the `surface-sunken`/`shadow-xs` vs. `surface-pill`/
  `shadow-sm` split against each one's own frame, decide whether `SegmentedControl`'s default
  needs to change (or the bespoke siblings fold into it), and fix all of it together so it doesn't
  fragment into per-page patches again.
