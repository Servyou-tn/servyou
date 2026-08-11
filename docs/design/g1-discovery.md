# G1 discovery — the shared seller entry (`/devenir-vendeur`)

**Provenance key:** 📐 MEASURED (from a `get_metadata` call, cited by node id) · 🧠 MEMORY/INFERRED (not in this file's two calls — carried from the Part B discovery report, code reading, or a judgment call, flagged as such).

**Figma calls spent in this build phase: 2.** `469:20636` (role-choice screen, the "right" column of frame `469:20560`) and `555:37196` ("G1 — refus moins de 18 ans", the age-gate refusal card). Both nodes are plain frames with direct text-node children (not instance-wrapped), so `get_metadata` returned real copy, not just bounds — unlike G2/D1's instance-nested-text limitation.

Founder ruling (verbatim, binding): **"469:20560 is a NEW shared page that comes before both role pitches. It is not a redesign of /devenir-vendeur's content and not a superseded draft."** This overturns the Part B discovery report's tentative reading (that `555:37032`, the boutique-specific pitch, might be "the real G1" per the ZONE-G numbering cross-reference).

## 📐 469:20636 — role-choice screen ("right" column)

Frame `469:20636` "right", 1200×880, sits beside an (unqueried) 240px sidebar — Topbar (1200×64) + content (1200×816).

```
content (1200×816)
└─ column (x=240, y=32, 720×744) — centered: 240px margin each side of the 1200 content area
   ├─ hero (720×99)
   │  ├─ "DEVENIR VENDEUR" — eyebrow, x=300.5 (centered), 119×17
   │  ├─ "Comment voulez-vous vendre ?" — h1, full width, 720×38
   │  └─ "Choisissez votre activité. Vous pourrez toujours ajouter l'autre plus tard." — subhead, 720×28
   ├─ choice-cards (y=131, 720×340) — TWO fixed 350px cards + 20px gap = 720 (exact column width, zero slack)
   │  ├─ choice-card "Freelance" (0,0, 350×340)
   │  │  ├─ icon frame (32,32, 56×56) → icon-briefcase (24×24, centered)
   │  │  ├─ "Freelance" — title (32,104, 94×26)
   │  │  ├─ "Vendez vos compétences et services. Développement, design, marketing, rédaction…" (32,146, 286×63)
   │  │  └─ points (32,225, 286×83) — 3 rows, each icon-check (16×16) + text, ~29px row pitch
   │  │     "Publiez vos services" / "Répondez aux missions" / "Construisez votre réputation"
   │  └─ choice-card "Boutique" (370,0, 350×340) — same anatomy
   │     icon-store · "Boutique" · "Vendez des produits en ligne. Artisanat, mode, électronique, tout ce que vous fabriquez ou revendez."
   │     points: "Créez votre boutique" / "Ajoutez vos produits" / "Gérez vos commandes"
   └─ age-gate (x=120, y=503, 480×241) — centered under the two cards ((720-480)/2=120)
      ├─ "Vous devez avoir 18 ans ou plus pour vendre sur Servyou." (24,24, 432×21)
      ├─ dob (24,61, 339×100)
      │  ├─ "Date de naissance : 12/05/1995 · 18 ans ou plus" (0,39.5, 315×21) — FIXED threshold phrase, not the user's computed age
      │  └─ icon-check-circle (323,42, 16×16) — visible
      └─ Button instance (24,177, 432×40) — no resolvable label/text (instance, get_metadata can't see inside it)
```

**No selection-state specimen exists for this frame** — no `G1—`/`H1—` children under `469:20560` in the registry showing a "card selected" variant, and neither `choice-card` has a radio/check affordance in its own tree (the only `icon-check` instances are inside `points`, i.e. the bullet list). Combined with the row summing to exactly 720 (a hard-fit, D1-shaped risk — see build notes) and each card having no internal CTA/button node (the whole card is the click target), the plain reading is: **cards are direct links**, not a select-then-continue radio group. The `age-gate` module's own `Button` (432×40) is scoped to that module (its width matches the module's own 480-48 inner content width, not the 720 card-row width) — it reads as the age-gate block's own element, not a "confirm card choice" action.

🧠 **Unresolved, not guessed:** the passing-state `Button` (469:20724) has no recoverable label. Symmetry with the failing card (555:37196, whose Button obviously needs an exit destination) suggests both frames reuse one `AgeGateCard` component with a shared trailing-button slot — but that doesn't resolve what the *passing* variant's button should say or do when the cards above it already provide complete navigation. **Not built.** Flagged for founder call.

## 📐 555:37196 — age-gate refusal card

Frame `555:37196` "age-gate", 496×294 (own frame, not nested in the choice layout — this is G1's dedicated refusal state, swapped in for the whole cards+age-gate region when the visitor is under 18).

```
age-gate (496×294)
├─ "Avant de commencer" — heading (24,24, 202×26)
├─ "Vous devez avoir 18 ans ou plus pour vendre sur Servyou." (24,66, 448×21) — IDENTICAL string to 469:20718
├─ dob (24,103, 327×21)
│  ├─ "Date de naissance : 12/05/2010 · Moins de 18 ans" (0,0, 327×21) — FIXED "under 18" phrase, not computed age
│  └─ icon-check-circle (335,2.5, 16×16) — hidden="true" (no checkmark shown when failing)
├─ Alert instance (24,140, 448×74) — no resolvable internal copy (instance)
└─ Button instance (24,230, 448×40) — no resolvable label (instance)
```

🧠 **Invented, flagged:** the `Alert` instance's copy and the `Button`'s label/destination are not recoverable from `get_metadata` (both are instances). Built as: Alert = a short reassurance line ("you'll be able to sell once you turn 18, browse in the meantime"), Button = "Retour à l'accueil" → `/`. This is the one place in this build where real copy is invented rather than measured — visually it follows the existing `SuspendedBanner`/`ModerationBanner` alert-block convention (`role="alert"`, bordered/tinted box), not a new pattern.

## Resolved architecture questions (open at hand-off, closed before build)

1. **Auth requirement — public, not gated.** `/devenir-vendeur` stays reachable by anonymous visitors (`landing/HowItWorks.tsx` links here from the public landing page today). `middleware.ts`'s `/devenir-vendeur/:path*` matcher entry is a *suspension* check (`if (!user) return NextResponse.next()`) that no-ops for anonymous users, not a live auth gate — its "authenticated-only prefixes" comment describes intent for a different concern, not a routing requirement. The age-gate region is a *conditional*, not a route guard: no profile → the region simply doesn't render; the two cards stay clickable and lead to the child pitch pages, which already have their own `isAuthenticated`-driven CTA (`/inscription?next=…`), unchanged.
2. **Shell — `AppShell`, not `MarcheLayout`, for THIS page only.** The measured geometry (240px sidebar offset + 64px Topbar) matches `AppShell` exactly, and `AppShell` explicitly documents tolerating a null user ("logged-out renders the consumer IA + a 'Se connecter' topbar affordance" — `AppShell.tsx`). The two child pitch pages are "moved," per the founder's own word — not redesigned — so they keep `MarcheLayout` unchanged. This produces a shell swap on click-through (`AppShell` → `MarcheLayout`), logged below as a known seam, not fixed here.
3. **Matching-role card — left as a plain link, not redirected to the dashboard.** The ruling specifies exactly one behavior (the *opposite* role's card marked unavailable with an explanation). Routing the *matching* card to the user's workspace instead of the pitch page is an unrequested second behavior — not built. Logged in the PR for a founder call.
4. **`AlreadyHaveRole.tsx` stays, untouched, currently uncalled on this branch.** It's real, intentional code for PR #127's `/ma-boutique/creer` guard on a different, unmerged branch. This PR only removes its two callers on `/devenir-vendeur` and `/devenir-freelance` (now redundant with the upstream shared check) — it does not delete the component.
5. **`devenir.vendeur.already.*` / `devenir.freelance.already.*` i18n keys — deleted.** Grepped after the guard removal: zero remaining callers in this branch's tree (PR #127's own `AlreadyHaveRole` usage on `/ma-boutique/creer` uses its own separate `shop.create.freelancerBlocked.*` keys, not these).

## Breakpoint plan (per the D1 lesson)

`choice-cards` is two RIGID 350px tracks + 20px gap = 720, a hard fit against the 720px column with zero slack — the exact shape that overflowed D1 at 1024–1407. Fix: `grid-cols-1 md:grid-cols-2 gap-5` — Tailwind's `grid-cols-2` compiles to `repeat(2, minmax(0, 1fr))`, which is fluid and overflow-safe by construction; cards must not be given a fixed `w-[350px]`. At 1024 (sidebar visible, ~705px available column) two fluid tracks render ~342px each — below the measured 350 but with no fixed-width failure mode. 🧠 The `md:` (768) stacking breakpoint itself is INFERRED — no tablet frame exists to measure against, same gap noted for every rebuild this session.

The `age-gate`/refusal module at 480px centered has ~120px slack on the narrowest in-scope column (705 at 1024) — not at risk.

Verify overflow-clean at 375 / 1024 / 1152 / 1279 / 1280 / 1366 / 1440, `behavior:"instant"`, FR + AR (including the dob row — the digit/slash-free date format `DD/MM/YYYY` was chosen partly because it avoids the spaced-numeric-run RTL reversal bug class, see `reference_rtl_numeric_run_reversal`).

## Logged, not fixed

- **BenefitGrid 4-vs-3 mismatch** (pre-existing, from Part B discovery): `BenefitGrid` always renders whatever array it's given; the boutique pitch frame draws 3 benefit cards where the component currently always receives 4. Out of scope for G1 — the component itself needs no change, only whichever future pass touches `DevenirVendeurContent`'s call site.
- **Shell seam**: `/devenir-vendeur` (AppShell) → `/devenir-vendeur/boutique` or `/devenir-vendeur/freelance` (MarcheLayout) is a visible shell swap on click-through. Correct per "moved, not redesigned," logged for whichever future PR migrates the two pitch pages off `MarcheLayout`.
- **Matching-role card behavior** (open question 3 above) — a freelancer who selects the Freelance card lands on the (now-unguarded) freelance pitch page rather than their dashboard. Founder call.
- **Passing-state age-gate `Button`** (469:20724) — not built; no recoverable label/destination. Founder call or a future Figma read with prototype/interaction data.
- **Eyebrow copy reads boutique-first on a role-neutral page.** The measured eyebrow text is "DEVENIR VENDEUR" (469:20672) — built faithfully as `devenir.choice.hero.eyebrow`. But this page's whole point (per the founder's ruling) is that it sits in front of BOTH pitches as an equal choice; "Devenir vendeur" as the eyebrow imports the old boutique-centric framing right above a headline that asks "Comment voulez-vous vendre ?". Built as measured, not silently rewritten — founder call on whether the eyebrow should read something role-neutral instead (e.g. "Devenir vendeur ou freelance").

## Verification results

Real end-to-end walk via CDP + headless Chrome against a locally running dev server, using throwaway users seeded through the Supabase admin API (`@g1-e2e.servyou.invalid`, deleted after each run — a fresh suffix, not the shared RLS-smoke one). Gate: `npm run build` (clean, 52 routes incl. the 3 new + the redirect stub), `tsc` (clean), `eslint` (0 new errors — all 7 pre-existing errors are in untracked `scripts/figma/*` scaffolding, not this PR), `vitest` (599/599, including the updated `signup-role.test.ts` and `verify-email.test.ts` expectations).

- **Consumer walk** — logged-in consumer (seller_type null) sees the headline, both cards (Freelance + Boutique, neither flagged unavailable), correct card `href`s (`/devenir-vendeur/freelance`, `/devenir-vendeur/boutique`), and the passing age-gate confirmation with the correct formatted DOB. All checks pass.
- **Role-conflict, both directions** — an existing freelancer sees the Boutique card's unavailable explanation and NOT the Freelance-side one; an existing shop_owner sees the reverse. Confirms the ruling's asymmetric behavior (opposite card blocked, matching card untouched) in both directions.
- **Underage refusal** — caught a real bug during verification: the hero ("Comment voulez-vous vendre ?") was rendering unconditionally above the swapped-in refusal card, because 555:37196 is its own self-contained frame with its own heading ("Avant de commencer"), not an addition to the shared hero. Fixed by moving the hero inside the same conditional as the cards, so the refusal state is now a clean standalone block, matching the measured frame's actual structure. After the fix: refusal heading shown, cards absent, correct DOB ("Moins de 18 ans" suffix), exit button present. Re-verified in AR too (heading + DOB digit order both correct).
- **Old URLs** — `/devenir-freelance` issues a real 308 to `/devenir-vendeur/freelance` (confirmed via final `pathname` after CDP navigation, which follows redirects); `/devenir-vendeur/boutique` and `/devenir-vendeur/freelance` both render their moved content correctly.
- **AR pass** — headline, both card titles, and the unavailable-explanation copy all render in Arabic with zero French leak. The DOB `dir="ltr"`-wrapped digit span renders in the correct `DD/MM/YYYY` order (not reversed) in both the passing and refusal states — verified empirically rather than assumed, per the existing RTL-numeric-run-reversal gotcha in this codebase (the risk class is spaced N/N runs with a bidi-neutral separator; this build additionally isolates the date's own digit run in an explicit `dir="ltr"` span as a belt-and-suspenders fix, split from the surrounding translated prefix/suffix text so interpolation never mixes directions inside one string).
- **Breakpoint sweep** (375/1024/1152/1279/1280/1366/1440, `behavior:"instant"` on the overflow read, FR + AR, both the cards state and the refusal state): **0px overflow at every desktop width, both languages** — the fluid `md:grid-cols-2` fix holds at the D1-risk shape identified above. **375px shows ~53-56px of overflow in both languages and both states.** Diagnosed via a widest-offending-element DOM read (same technique as G2's 375px finding): the offenders are AppShell's own Topbar mobile search form + menu button (`right: 411` against a 375 viewport), not any element inside this page's own content — this page's own container sits at exactly 343px, a perfect fit for the 375-32 available width. Reproduced identically on `/tableau-de-bord-vendeur`, an already-shipped, unrelated AppShell page (baseline 53px overflow) — confirming this is a pre-existing shared-shell defect, not a regression introduced here. Not fixed in this PR; logged for whichever PR next touches `AppShell`/`Topbar`.
