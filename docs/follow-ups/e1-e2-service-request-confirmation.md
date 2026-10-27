# E1 / E2 — service request + confirmation (`fix/e1-e2-service-request`)

## `submitServiceRequest` validates by hand, not with Zod
- CLAUDE.md requires server actions to validate input with Zod before any mutation.
  `src/app/demander/[id]/actions.ts` predates that call site being built and validates with
  explicit checks (trim + length floor, `isValidPhone`, `Number.isFinite`). The checks are
  correct and now covered by `src/__tests__/service-buyer-note-roundtrip.test.ts`.
- **Deliberately left alone.** Converting it is a rewrite of shipped, working code and collides
  with *once built, stays built*; the founder's call on the E1 discovery was to log the
  divergence rather than fold a refactor into a page rebuild.
- **Trigger:** whenever the product half of that file is opened for the product E1 rebuild —
  convert both actions in one pass, with the round-trip test as the guard rail.

## `Button` size=lg horizontal padding is 24 in code, 20 in Figma
- `src/components/ui/button.tsx` ships `lg: 'h-12 px-6'`. Every authored `lg` instance in E1/E2
  measures `pad:0,20,0,20` → `px-5` (`680:56469`, `682:56920`, `691:57233`, `691:57244`).
  `md` matches (`px-4` ↔ `pad:0,16`); only `lg` diverges.
- This is **new information**, not a contradiction: the primitive's own comment records that the
  Button COMPONENT_SET authored a fixed 120px demo width, so real padding was never encoded
  there. E1/E2 are the first frames to encode it at the instance level.
- **Not fixed here** — it moves every `lg` button in the app and would fight the VRT baseline.
  E1/E2 use the primitive as shipped.
- **Trigger:** the next primitives pass; change `SIZE.lg` to `px-5` and re-baseline VRT.

## The type scale has no tokens for 13 / 15 / 22 / 26 / 30px
- E1/E2 carry ~25 `text-[15px]` / `leading-[22px]` / `text-[13px]`-style bracket values. These
  are **measured, not guessed**, and match what D2 (`ServiceDetail.tsx`) already ships — the two
  pages sit next to each other and must not diverge.
- The real gap is upstream: `@theme` has no token for these steps, so every page re-types them.
- **Trigger:** the typography-token pass deferred out of F1 (token foundation).

## E2 reads the price live, so a historic order's amount can drift
- `orders` stores **no price column**. E2's récap and `getOrderDetail` both read
  `service_listings.starting_price_tnd` at render time, so if a freelancer edits their price
  after a request lands, the buyer's confirmation shows the NEW figure.
- Acceptable at MVP (the price is explicitly a starting point negotiated on WhatsApp, and E2 is
  read within minutes of submitting) but wrong for any later receipt or dispute surface.
- **Trigger:** the first surface that must show what was agreed rather than what is listed —
  likely E3 order history or the dispute flow. Fix is a price snapshot column on `orders`.

## E2 récap shows one chip where Figma shows two
- `690:57171` renders a category chip plus a tag chip. E2 sources its récap from
  `getOrderDetail`, whose `item` exposes `category` but not `tags`. Widening that read — used by
  order views not being rebuilt here — for a cosmetic chip was rejected as scope creep.
- E1's summary panel does render `[category, ...tags]`, so the two screens differ by one chip.
- **Trigger:** whenever `getOrderDetail` is next extended for E3.

## 375px: the shell top bar overflows the viewport by 56px (PRE-EXISTING)
- At a 375 viewport with a **logged-in** user, `document.scrollWidth` is **431** against a 375
  client width on every page measured: E1 (new), **D2, C1 `/marche/services` and `/marche`
  (all untouched and already merged)** — identical offender, identical 56px.
- Offender is the Topbar's right cluster, `div.flex.shrink-0.items-center.gap-4` (left 219 →
  right 431) holding the 48px avatar button. `shrink-0` on a row that has no room to shrink.
- Harness validated with a negative control before reporting (injected a 9999px div → registered
  +8574), so this is a real overflow, not an `overflow-x` artifact.
- **Not introduced here and not fixed here** — it is a shell defect with every rebuilt page as a
  consumer, and `project_frontend_audit` recorded "380px 0-overflow" from a logged-OUT sweep,
  which is why it was missed.
- **Trigger:** the next `components/shell/*` pass. Re-measure logged-IN at 375.
- **✅ RESOLVED — `fix/appshell-topbar-and-pitch-pages`, 2026-08-13.** See the closing note under
  the G6 entry below for the fix and the full re-measurement; not repeated at every sighting.

## CDP click harness cannot deliver synthetic mouse input (tooling note)
- `Input.dispatchMouseEvent` (mouseMoved → mousePressed → mouseReleased, correct `buttons`,
  hit-tested on-target) delivered **zero** pointer/mouse/click events to the page — verified with
  a capture-phase listener on `document`, and reproduced on an ordinary untouched breadcrumb
  link, which also failed to navigate.
- The E1 create flow was therefore verified through `button.click()` and `form.requestSubmit()`,
  both of which run the real React submit handler; each produced a real `orders` row and a fully
  rendered E2.
- Contradicts `reference_cdp_visual_gate`, which records real mouse events as the way to open
  Radix menus. Whatever changed, **validate input delivery with a control listener before
  trusting a null click result.**
