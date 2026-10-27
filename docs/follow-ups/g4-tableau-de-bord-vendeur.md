# G4 — Tableau de bord vendeur (`feat/g4-seller-dashboard`, 2026-07-28)

## 🔴 Topbar overflows 56px at 375 — but only when LOGGED IN, on every AppShell route
- **Also reproduced on E1-product `/demander/[id]` and E2 `/demander/succes` (2026-08-10),
  authenticated via `scripts/gate/session.mjs`** — same 56px, same offending element
  (`div.flex.shrink-0.items-center.gap-4`), zero overlap with either page's own content (the
  overflowing elements are all inside the topbar's trailing cluster; nothing from the form, the
  summary, or the recap appears in the offender list). Both routes are auth-gated, so — same
  caveat the entry below already states for 12 other shell routes — they join the set that
  cannot be overflow-tested anonymously; the "logged out ⇒ 0 overflow" claim could not be
  re-confirmed on these two specifically, only inferred from every other page it holds on.
- **Measured on G4 and reproduced identically on the already-shipped `/marche/services`** (which has
  its own 375 Figma frame), so this is a shared-shell defect, not a G4 regression:
  `document.documentElement.scrollWidth` 431 vs `clientWidth` 375 → **56px (FR) / 53px (AR)**.
  Desktop 1440 is clean (0). Negative control: injecting a 9999px div moved the probe to 9624, so
  the 0-at-1440 and the 0-when-logged-out results are measurements, not a blind spot.
- **Culprit:** the topbar's trailing cluster `div.flex.shrink-0.items-center.gap-4` — the FR/AR
  `LanguageToggle` plus the user menu — measures 212px and is `shrink-0`, so at 375 it pushes the
  row past the viewport instead of compressing.
- **Why it was never caught:** logged OUT the same page measures **0 overflow** (the topbar renders
  a single "Se connecter" button instead of toggle + menu). The earlier audit's "380px 0-overflow,
  neg-control validated" finding was therefore correct *and* blind to this — it was measured
  anonymously, and 12 of the 20 shell routes cannot even be reached logged out.
- **Fix (own PR — shell-wide, not G4's to make):** let the cluster shrink (drop `shrink-0`, or hide
  the FR/AR toggle behind the mobile drawer below `sm`, which is where the language control already
  lives on mobile). Re-measure logged in at 375 in both locales afterwards.
- **Trigger:** next shell-touching PR, or before any seller page ships to mobile users.
- **✅ RESOLVED — `fix/appshell-topbar-and-pitch-pages`, 2026-08-13.** Neither of the two options
  above was taken — dropping `shrink-0` was explicitly rejected (would compress the avatar/bell/
  toggle unpredictably instead of the row reclaiming space) and hiding the FR/AR toggle changes
  what the row *offers*, not just what it costs. Fix instead: below `sm`, `Topbar.tsx`'s logo swaps
  the full wordmark (110px) for the icon-only S-mark (32px, the same asset the open drawer already
  uses) and the cluster's `gap-4` (16px) drops to `gap-2` (8px) — both revert at their breakpoint,
  nothing shrinks under pressure. Re-measured logged in, FR and AR, at 375: `scrollWidth ==
  clientWidth`, 0 overflow, on `/tableau-de-bord-vendeur`, `/marche/produits`, `/produits/[id]`,
  `/ma-boutique/creer`, plus the two newly-migrated `/devenir-vendeur/{boutique,freelance}` — AR
  confirmed via a throwaway `Network.setCookie(servyou_lang=ar)` runner (the exact gap the
  `authed.mjs` entry two sections up already logs; not fixed there, same "not this PR" call).
  Desktop 1024/1152/1279/1280/1366/1440 swept clean on the two migrated pages. **S4 (topbar 65px
  vs Figma's 64px) was NOT touched** — the founder's 2026-07-28 "rides with" note for that item
  is still open; this PR's scope was the 375px overflow specifically, not the 1px height delta.

## The ten seller pages have NO mobile Figma frames
- **G1-G9 + D3 are all desktop-only.** The registry holds **13 mobile (375) frames across 160 screen
  frames**, and every one belongs to a consumer/buyer surface: I1, marketplace services (+Freelances
  lens), E1, E2, E3 ×2, D2, F1 produits, K1-K4. D4 and H3 are desktop-only too, so the pattern is
  **the whole seller + profile world has no mobile design**, not a couple of oversights.
- **Consequence:** every below-`lg` value in `app/tableau-de-bord-vendeur/` is DERIVED, not measured,
  and each is flagged `derived:` in-code at its call site (single-column collapse, 1/2/4-up tile
  grid, stacked header, stacked action rows). A later mobile frame will very likely disagree with
  some of them, and that is a re-measure, not a bug report.
- **On a market that is 70%+ mobile**, this is worth sizing as one design batch rather than
  absorbing page-by-page across ten PRs.
- **Trigger:** before the seller world ships to real users.

## `/devenir-vendeur/freelance` joins the no-mobile-frame list — every responsive value INFERRED
- **`466:19958` ("Devenir freelance — 1440") is desktop-only**, same pattern as the ten seller
  pages above — this is effectively an eleventh. Full geometry in
  `docs/design/devenir-freelance-discovery.md`.
- **The value-cards row is the D1 hard-fit shape**: 3 × 229.33px + 2 × 16px gap = 720px, exactly
  the measured column width, zero slack. Built fluid (`BenefitGrid`'s new `columns=3` →
  `grid-cols-1 sm:grid-cols-3`), not fixed-px, specifically to avoid the D1/G1 overflow trap.
- **`sm` (640px) as the 1-up→3-up jump is INFERRED, not measured** — chosen to skip the
  intermediate 2-up step 4-column grids use (`md:grid-cols-2` before `lg:grid-cols-4`), since 3
  items split unevenly into 2 (a 2-then-1-orphan tablet state). No frame exists below 1440 to
  confirm or contradict this.
- **The hero's mobile shape (font-size steps, button wrap behavior) is also inferred** — carried
  from the pre-existing `RoleUpgradeHero` responsive values (`text-4xl md:text-5xl`, `flex-wrap`
  CTA row) rather than measured fresh, since the frame draws no responsive variant at all.
- **Trigger:** whenever this page (or boutique's sibling `555:37032`, likely the same shape) gets
  an actual mobile Figma frame — re-measure against it then, treat any disagreement as a
  re-measure, not a bug.

## `/devenir-vendeur/boutique` joins the same list — a twelfth, same shape as its sibling
- **`555:37032` ("Devenir vendeur (boutique) — 1440") is also desktop-only.** Full geometry in
  `docs/design/devenir-boutique-discovery.md`.
- **Same D1 hard-fit value-cards row**, same fix (`BenefitGrid`'s `columns={3}`), same `sm`
  1-up→3-up breakpoint chosen for the same reason (skips an uneven 2-up tablet step for 3
  items) — INFERRED, not measured, confirmed on this frame too, not re-derived independently.
- **Trigger:** same as the freelance entry above — whenever either sibling gets a real mobile
  frame, re-measure both together rather than reconciling them twice.

## Three buyer-side order transitions still write from client components
- `mes-commandes/_components/OrdersList.tsx:279` and `components/ReceiptConfirmButton.tsx:33`
  (both → `received`) and `components/CancelOrderModal.tsx:81` (cancel) call `supabase.update()`
  directly from `'use client'` components. They are **correct** — RLS plus
  `check_order_status_transition` enforce every rule server-side — but they bypass the standard
  that mutations go through a server action with Zod validation.
- **G4 sets the counter-pattern** (`app/tableau-de-bord-vendeur/actions.ts`: Zod parse → auth →
  ownership re-check → derived target status → DB trigger as final authority). Migrate the three to
  match; deliberately NOT touched in the G4 PR, per one-PR-one-focus.
- **Trigger:** the E3/buyer-orders PR that next touches those files.

## G4 diverges from its own specimen on "Bénéfice net" — deliberately
- Specimen `484:24205` mocks **"2 840 TND / Commandes livrées"**. Shipped code renders
  **"Bientôt disponible"** (muted) instead. `products` has no `delivery_fee`, so a true *net* figure
  cannot be computed, and printing revenue under a net-profit label would be a fabricated metric.
- Note this contradicts the older build note that the tile was already authored as a
  "Bientôt disponible" placeholder — the measured specimen shows a mocked number, so the FIGMA is
  what needs updating here, not the code.
- **Trigger:** the schema PR that adds `delivery_fee` (bundled with `shops.is_published` +
  `freelancer_profiles.is_published` + the order tracking number).

## ⚠ Tailwind's `leading-normal` is the ratio 1.5 — NOT CSS `line-height: normal`
- **The trap:** Figma emits `leading-[normal]` (the CSS keyword, ≈1.21 for Inter). Tailwind's
  `leading-normal` utility is the **ratio 1.5**. Same word, different value, no error either way.
- **Evidence (G4 delta P1):** on the 28px Bold glance-tile value, `leading-normal` computed to
  **42px** where Figma's `normal` is **≈34px** — **+8px per tile**, which pushed the measured tile
  from Figma's 196 to 248 and, combined with a wrapping string, stretched the whole 4-up grid row.
  `leading-[normal]` (bracketed) is the one that emits the keyword.
- **Rule:** when a Figma value reads `normal`, write `leading-[normal]`. Reserve bare
  `leading-normal` for when 1.5 is genuinely intended. Grep before copying either into a new
  component — this reads as a no-op diff and is worth 8px a line.
- **Trigger:** any component built from a Figma text style whose line-height is `normal`.

## S4 — topbar is 65px tall against Figma's 64, on every AppShell route
- `Topbar.tsx:35-36` puts `border-b` on the `<header>` *outside* an inner `div.h-16`, so the total
  is 64 + 1. The Figma Topbar instance (`475:21223`) is **64 total**.
- 1px, but it is on ~20 routes and it shifts every page's content down by a pixel against its frame.
- **Founder call (2026-07-28): this rides with the 375px topbar-overflow fix**, since both are the
  same component and re-measuring the topbar twice is waste. See the logged-in overflow item above.
- **Trigger:** the shared-shell PR that fixes the 375 overflow.

## P5 / P6 — the shipped type ramp's line-heights differ from Figma's
- Measured on G4: **H1 40 vs Figma 38**, **H3 28 vs Figma 26**. Both are the shipped `--text-*`
  tokens, so this is platform-wide, not a page defect — every H1 and H3 in the app is 2px taller
  than its frame.
- This is the already-documented "typography token gap": `scripts/tokens/build.mjs` deliberately
  does **not** emit typography (its header says so), because the Figma ramp is incomplete and the
  shipped weights/line-heights diverge. So the fix is not a one-line token edit — it needs the ramp
  reconciled in Figma first, then emitted, then a re-baseline of every VRT story.
- **Trigger:** the typography reconciliation PR. Do not patch per-page.
