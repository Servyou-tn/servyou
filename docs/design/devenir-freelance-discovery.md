# `/devenir-vendeur/freelance` rebuild — discovery

**Figma calls spent: 1.** `466:19958` ("Devenir freelance — 1440", the frame itself — not its `right` child `466:20036` directly). A single call on the parent returned the full recursive subtree — `right` → `content` → `column` → every leaf text/instance node — at no extra cost, so a second call on the child was never needed. Compare `g1-discovery.md`, which spent 2 calls on the equivalent `/devenir-vendeur` frames.

**Provenance key — inverted from `g1-discovery.md`'s convention.** That doc measured first and treated memory as the fallback. This one leans on memory first (two prior discovery passes already exist for this exact frame family) and uses its one call to check that memory against current reality, not to originate the findings:
- 🧠 MEMORY/INFERRED — carried from `project_figma_h1h2_devenir_freelance.md` and `project_figma_g1g2_shop_onboarding.md` (both 24–25 days old, both auto-flagged stale by this session's memory protocol). Treated as a starting hypothesis, cross-checked against the one fresh call and current code below — not asserted as current fact anywhere it wasn't checked.
- 📐 MEASURED — from the one `get_metadata` call on `466:19958`, cited by node id.

Founder framing (this task): the page currently renders pre-rebuild v1 content (4 benefit cards, "Comment ça marche" 3-step, FAQ accordion, final CTA). #128 moved this page's *shell* only — its content is untouched since before that PR.

---

## 1. Region order, top to bottom — what survives, what's cut, what's new

📐 Measured tree, `466:19958` → `right` (`466:20036`, 1200×934) → `content` (0,64, 1200×870) → `column` (240,32, 720×798, centered — `(1200-720)/2=240`):

```
column (720×798)
├─ hero (0,0, 720×127)
│  ├─ "DEVENIR FREELANCE" — eyebrow (293.5,0, 133×17)
│  ├─ "Vendez vos compétences sur Servyou" — H1 (0,25, 720×38)
│  └─ "Vous avez un savoir-faire ? Transformez-le en revenus. Créez votre
│      profil, publiez vos services, et trouvez des clients partout en
│      Tunisie." — subline (0,71, 720×56)
├─ value-cards (0,159, 720×256) — THREE cards, 229.33 each, 16px gap
│  │  (3×229.33 + 2×16 = 720 — exact-fit, zero slack)
│  ├─ card 1 (0,0, 229×256): icon-search · "Trouvez des clients" ·
│  │  "Répondez aux missions publiées ou laissez les clients vous trouver
│  │  via votre profil public."
│  ├─ card 2 (245,0, 229×256): icon-wallet · "Paiement à la livraison" ·
│  │  "Pas de commission sur vos gains. Vous négociez et êtes payé
│  │  directement, en dinars."
│  └─ card 3 (491,0, 229×235 — shorter, its body text is one line less):
│     icon-trending-up · "Construisez votre réputation" ·
│     "Chaque projet livré renforce votre note et attire plus de clients."
└─ age-gate (120,447, 480×351) — centered under the cards, (720-480)/2=120
   ├─ "Avant de commencer" — heading (24,24, 202×26)
   ├─ "Vous devez avoir 18 ans ou plus pour devenir freelance sur
   │   Servyou." (24,66, 432×42)
   ├─ Input instance (24,124, 432×97) — DOB **entry field**, not a display
   ├─ Button instance (24,237, 432×40) — no recoverable label (instance)
   └─ "En continuant, vous acceptez les conditions d'utilisation
       freelance." (24,293, 432×34)
```

Column arithmetic closes exactly: hero (0–127) + 32px gap + value-cards (159–415) + 32px gap + age-gate (447–798) = 798, matching the column height with **zero remaining content**.

**Verdict, against the current 4 sections:**

| Current region (v1, live) | In the frame? |
|---|---|
| Hero | **Survives, but reshaped** — frame hero is a single centered text block (eyebrow+H1+subline, no icon/illustration). Current `RoleUpgradeHero` is a 2-column split (text left, icon box right) — see §4. |
| 4 benefit cards (`BenefitGrid`) | **Cut and replaced** — frame draws **3** cards, different copy, different icon set (search/wallet/trending-up vs current wallet/search/share/users), no 4th card. |
| "Comment ça marche" 3-step (`HowItWorks`) | **Cut.** No trace in the frame — the column ends at the age-gate. |
| FAQ accordion (`FAQ`) | **Cut.** Same reasoning. |
| Final CTA section (`FinalCTA`) | **Cut.** Same reasoning. |
| *(nothing currently)* | **New: age-gate module** — not present in the live page at all today. |

So the frame is a materially *shorter* page than what's live: hero + 3 cards + age-gate, full stop. Three of today's five rendered sections (`HowItWorks`, `FAQ`, `FinalCTA`) have no counterpart in this frame.

---

## 2. Does the frame draw an age-gate block — and does it match the boutique sibling?

**Yes, 📐 measured and unambiguous** — see the `age-gate` node above: heading, legal line, a **DOB `Input` instance** (432×97 — an entry field, not a read-only line), a `Button`, and fine print. It is not a leftover empty frame; it has real geometry and real copy.

**It does not match the boutique sibling, and this is a known, already-flagged divergence — not new information from this call:**

🧠 `project_figma_g1g2_shop_onboarding.md` describes `555:37032`'s age-gate module as a **read-only DOB display** — `"12/05/1995 · 18 ans ou plus ✓"` — explicitly noting *"DOB block CLONED from chooser `469:20719`, **unlike H1's DOB Input**"*. That memory already names the exact divergence this task asks about: the freelance frame collects DOB fresh via an input; the boutique frame just redisplays it read-only, cloned from the shared chooser's pattern.

**Whether either is still needed is the real question, and the answer is that both are now redundant, for the same reason, confirmed by reading `/devenir-vendeur/page.tsx` (the code that's live today, not memory):** the shared entry already runs the age check once, before either card renders (`isOldEnoughToSignup(profile.date_of_birth, MIN_SELLER_AGE)`, `src/app/devenir-vendeur/page.tsx:39`). An under-18 visitor never sees a clickable Freelance/Boutique card at all — the whole cards region swaps for `AgeGateRefusalCard` upstream. Nobody reaches `/devenir-vendeur/freelance` without having already cleared this exact check. So:

- Building the frame's DOB-**input** age-gate here would let a user who already passed the gate re-enter a birth date, redundant with data already on the profile — a second, disagreeing implementation of an already-solved problem.
- Building the boutique frame's read-only-**display** version instead would at least not ask for new input, but it's still telling the user something the previous screen already told them.
- Neither frame's answer is "no age-gate module" — both draw one. That's most likely because these two frames predate the #128 decision to centralize the gate at the shared entry (both memories are 24 days old; `project_figma_g1_role_choice.md`, describing the centralization, is ~2 days old). The frames haven't been reconciled with that later decision.

This is a founder call, not an engineering one: keep a (reconciled, single-shape) age-gate module here for redundant reassurance, or drop the region entirely since `/devenir-vendeur` already fully owns it. Flagging, not deciding.

---

## 3. Primary CTA target, and every other link

**`/mon-profil-freelance/creer` does not exist — confirmed by directory listing** (`find src/app/mon-profil-freelance` → no such directory). The current code already knows this: `DevenirFreelanceContent.tsx:13-14`'s own comment says *"the creation route 404s until built."*

This isn't an orphaned guess, though — `/mon-profil-freelance` (without `/creer`) is the **canonical, already-referenced freelancer workspace root** elsewhere in the app: `src/lib/roles.ts:76` returns it as the freelancer's landing destination, and `ProfileAvatarMenu.tsx:104,133` links to it with a comment confirming *"the workspace routes (/ma-boutique, /mon-profil-freelance) 404 until built."* The `/creer` suffix pattern matches the shop side exactly (`/ma-boutique` root + `/ma-boutique/creer` wizard, the latter now built in #127). So the hardcoded href isn't a stale or invented guess — it's the right shape, just pointing at a route that doesn't exist yet in either half of the pair.

**Every other link on the page today**, all three from `DevenirFreelanceContent.tsx` (its children `HowItWorks`/`FAQ` render no links of their own):

| Link | Where | Resolves? |
|---|---|---|
| `createHref` = `/mon-profil-freelance/creer` (authed) or `/inscription?next=/mon-profil-freelance/creer` (anon) | Hero primary CTA + `FinalCTA` primary (same href, twice) | **No** for the authed branch (confirmed above). The anon branch's immediate hop (`/inscription`) resolves fine (`src/app/inscription/page.tsx` exists), but its `next=` target is the same dead route, so email verification would still dead-end post-signup. |
| `/marche?type=service` | Hero secondary CTA | **Yes** — `src/app/marche/page.tsx` redirects via `marcheRedirectTarget`, which routes `type=service` to `/marche/services` (confirmed live, still current — not stale). |

So: two distinct destinations, one dead (both times it's used), one live.

---

## 4. Component reuse — what fits, what doesn't, what has nothing

| Frame region | Candidate component | Fits? |
|---|---|---|
| hero | `RoleUpgradeHero` (`src/components/devenir/RoleUpgradeHero.tsx`) | **No, shape mismatch.** The frame's hero is a single centered text column with no visual element. `RoleUpgradeHero` is hard-coded as a 2-column split (`grid md:grid-cols-2`) — text left, an icon-in-a-box illustration right (`<Briefcase className="h-32 w-32" />` today). Reusing it as-is would draw an icon box the frame doesn't have. Needs either a new simpler hero or a variant/prop on this one. |
| value-cards (×3) | `BenefitGrid` (`src/components/devenir/BenefitGrid.tsx`) | **Close, not exact.** Card anatomy matches well (icon circle + title + description, same general shape as the frame's cards). But `BenefitGrid`'s grid is `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` — built for 4 items. Passing 3 items into a 4-track grid at `lg:` leaves an uneven gap rather than 3 balanced columns. This exact mismatch is already flagged in `project_figma_g1_role_choice.md`: *"BenefitGrid 4-vs-3 mismatch (pre-existing, carried from Part B discovery, unrelated to this PR's scope)"* — not new, just now directly relevant. Needs its column count to flex with item count, or a 3-up variant. |
| age-gate | `AgeGateCard` / `AgeGateRefusalCard` (`src/app/devenir-vendeur/_components/`) | **No component exists for this shape.** Both existing age-gate components are read-only display (`dateOfBirth` passed as a prop, already known, rendered as text + a checkmark or refusal alert) — neither collects input. The frame's module is a DOB **`Input` instance** (432×97) plus a submit `Button`. There is no DOB-collection-and-validate component anywhere in the codebase to reuse for this — it would be new work, contingent on §2's founder call about whether it should exist here at all. |
| "Comment ça marche" / FAQ / final CTA | `HowItWorks`, `FAQ`, `FinalCTA` (`src/components/devenir/`) | **Not applicable — no region in the frame to reuse them for.** All three currently have exactly two call sites each: `DevenirFreelanceContent.tsx` and `DevenirVendeurContent.tsx` (verified by grep — the other repo hits for these names are unrelated same-named components in `landing/`, `aide/`, and marketing `Faq.tsx`). Cutting them from the freelance rebuild drops each to a single remaining caller (the boutique page), not zero — they're not orphaned by this change alone. Worth noting for later: the boutique sibling frame `555:37032` is also memory-described as just hero + 3 cards + age-gate, no FAQ/steps/CTA section — so if boutique gets the same treatment eventually, these three components go fully dead across `devenir/`. Not this task's problem to solve. |

---

## 5. Breakpoint plan — before layout, per the D1 lesson

The D1 lesson (from `g1-discovery.md`, echoing the actual overflow bug fixed in D1's own rebuild): when a Figma frame draws a row of fixed-width cards that **sum exactly to their container's width with zero slack**, building that row with literal fixed pixel widths creates a hard-fit trap — it overflows the instant the container is narrower than the sum, which happens well before the frame's own measured breakpoint. The fix is fluid tracks (e.g. Tailwind's `grid-cols-N` default `minmax(0,1fr)`), not fixed `w-[Npx]` cards, and testing the *intermediate* width range, not just the frame's own width and mobile.

**This frame has exactly that shape.** `value-cards`: 3 × 229.33px + 2 × 16px gap = 720px, precisely the column width, zero slack — the same arithmetic signature as `g1-discovery.md`'s `choice-cards` row (350+20+350=720) that was already caught and built fluid for this reason. Any rebuild of this row **must** use fluid tracks (`grid-cols-1 ... lg:grid-cols-3`, not fixed pixel cards) and get tested at the intermediate widths this session's other verification passes have been using (1024/1152/1279/1280/1366/1440), not just 1440 and 375.

**No Figma ground truth exists below 1440.** This frame, like every other seller/onboarding frame in the registry, is desktop-only (🧠 consistent with `docs/follow-ups.md`'s "The ten seller pages have NO mobile Figma frames" note — this frame is effectively an eleventh). So the mobile/tablet stacking plan for hero, the 3-card row, and the age-gate module is **entirely inferred, not designed**, and needs to be flagged as such wherever it lands in code (matching the D1/C1 precedent of documenting inferred-not-measured responsive values rather than silently presenting them as spec). Concretely open, not decided here:
- Does the 3-card row go straight to `grid-cols-1` below `lg`, or get an intermediate 2-up (uneven for an odd count) step?
- Does the age-gate module (currently a fixed 480px card, centered) become full-width below some breakpoint, and at what point?

Both are real design decisions for whoever scopes the build, not answered by this discovery pass.

---

## Build rulings — closed on `feat/devenir-freelance-rebuild`

Discovery above is left as originally written (the record of what the frame draws and what was
open at hand-off). This section records what was actually decided and built, so the frame above
is not mistaken for canonical-and-unbuilt — it was read, and deliberately diverged from twice.

**1. Age gate: CUT, not built.** Founder ruling: `/devenir-vendeur` already runs the age check
once, before either role card renders (`isOldEnoughToSignup`, `src/app/devenir-vendeur/page.tsx:39`)
— nobody reaches this page without having already passed it. The frame's module asks for a fresh
DOB *input*, which would re-collect data the platform already holds and already validated. Both
sibling frames (this one and boutique's `555:37032`) predate the #128 centralization by roughly
three weeks and were never reconciled with it — the frame is a pre-centralization artifact on
this point, not a current spec. §2 above is left as the open question it was at discovery time;
this is its answer.

**2. Hero rebuilt single-column, `RoleUpgradeHero` not reused.** Matches the frame's own shape
(centered eyebrow/H1/subline, no icon illustration) — confirmed correct per §4.

**3. CTA relocated into the hero — a second, smaller divergence from the frame, flagged here for
the same reason as #1.** The frame's only CTA lived inside the now-cut age-gate module; the
frame's hero, as measured, has no button at all. Cutting the age-gate without relocating the CTA
would have left the page with no way to act on it, so both CTAs (primary create-profile + the
pre-existing secondary browse-freelancers link) moved into the hero. This placement is not
measured — it's carried forward from the page's pre-rebuild content, into the one surviving
navigational region.

**⚑ CORRECTION (found during the boutique sibling's discovery pass, fixed on
`feat/devenir-boutique-rebuild`):** the age-gate module also held a legal line ("En continuant,
vous acceptez les conditions d'utilisation freelance.") that traveled with the CTA on paper but
was never actually relocated — this rebuild dropped it silently, not as a recorded decision. It
shipped missing from the live page. Fixed in the boutique PR via a new shared `TermsLine`
component (`src/components/devenir/TermsLine.tsx`, imported here too), pointing at the general
`/conditions` page rather than a role-specific document that was never real. See
`docs/design/devenir-boutique-discovery.md` §4 for the reasoning on the link target.

**4. Value-cards: `BenefitGrid` parameterized, not forked.** Added an optional `columns?: 3 | 4`
prop (literal Tailwind class lookup, not string interpolation — the JIT scanner needs literal
class names in source) and made `sectionTitle`/`sectionSubtitle` optional (the frame's
value-cards region has no heading of its own, unlike `BenefitGrid`'s only prior caller).
Chosen over a separate 3-card component because: the two things that actually differ (column
count, optional heading) are narrow additive props, not a shape redesign; forking would just
duplicate the identical card markup (icon circle + title + description); and boutique's own
sibling frame (`555:37032`, per `project_figma_g1g2_shop_onboarding.md`) is *also* memory-described
as 3 value-cards — so this is very likely a near-term second consumer of the exact same shape,
not speculative over-engineering. `columns` defaults to 4 so boutique's existing call is
byte-identical to before this prop existed.

**5. `HowItWorks`/`FAQ`/`FinalCTA` cut from this page's render, components left in place** — each
still has exactly one remaining caller (`DevenirVendeurContent.tsx`). Their `devenir.freelance.*`
i18n keys (benefits/benefit1-4/how/step1-3/faq/faq1-5/final — 30 keys) **were** deleted: unlike
the components, each page's copy lives in its own i18n namespace (`devenir.freelance.*` vs
`devenir.vendeur.*`), so removing this page's copy keys has zero effect on boutique's. Verified
by grep before deleting — no reader outside `fr.ts`/`ar.ts` and the rewritten content component.
Component deletion itself waits for boutique's own rebuild, per the founder's "one cleanup pass,
not two."

**6. CTA target left wired to `/mon-profil-freelance/creer` (still 404).** Not disabled, not
redirected to an invented destination — same position `/ma-boutique/creer` was in before G2
shipped it. `/mon-profil-freelance` (no suffix) is already the canonical, referenced-elsewhere
freelancer-workspace root (`roles.ts:76`, `ProfileAvatarMenu.tsx:104,133`, same "404 until
built" posture), so the `/creer` suffix isn't a new guess — it mirrors the shop side's shape.

**7. Mobile stacking: built, marked INFERRED, logged in `docs/follow-ups.md`** alongside the
other missing-375-frame entries — see that doc for the specific breakpoint chosen and why. Not
re-litigated here.
