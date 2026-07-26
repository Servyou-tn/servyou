# F2 — Visual gate + boundary lint + Avatar: state & decisions

What F2 shipped, and the founder decisions it hands to F3. Companion to `docs/follow-ups.md`
(which holds the dated, triggerable backlog) — this file is the F2-specific state of record.

## What shipped

- **Storybook** over the app (`.storybook/`), importing the real `globals.css → tokens.css` chain
  (not a copy), so stories render with the exact F1 tokens. Confirmed: `bg-brand-blue-600` computes
  to `rgb(31,95,224)` = #1F5FE0, identical to the app.
- **Boundary lint** — a local ESLint plugin (`eslint-rules/boundary.mjs`) applied to
  `src/components/ui/**` as **errors** (fails the build): `no-raw-color` (3a), `no-seller-type` (3b),
  feature-import ban via `no-restricted-imports` (3c), `no-caller-and-self-css` (3d).
- **Avatar** (`src/components/ui/avatar.tsx`) — the proving primitive, measured from Figma
  `COMPONENT_SET 47:1528`, token-only, 6 sizes × 3 types, decorative-by-default a11y. Replaced 4 call
  sites; `getInitials` deleted. See `docs/follow-ups.md` for the deferred MissionDetail 48px site.
- **VRT gate** — `scripts/vrt/stories.mjs` drives the F1 `capture.mjs` + `diff.mjs` verbatim over a
  static Storybook build; CI workflow `.github/workflows/storybook-vrt.yml`.

## Boundary-lint status: the six pre-existing violations

All six were `no-raw-color`. Resolution per founder direction (2026-07-25):

### `min-w-[…]` × 3 — SWAPPED to exact spacing tokens (not a value change)
| Site | Was | Now | Equivalence |
|---|---|---|---|
| `dropdown-menu.tsx:45` | `min-w-[8rem]` | `min-w-32` | 8rem ≡ 8rem (spacing-32), exact |
| `dropdown-menu.tsx:233` | `min-w-[8rem]` | `min-w-32` | 8rem ≡ 8rem (spacing-32), exact |
| `segmented-control.tsx:51` | `min-w-[80px]` | `min-w-20` | 80px ≡ 5rem (spacing-20), exact at 16px root |

These are tokenizations of an already-exact value — no design decision, no invented value.

### `shadow-[…]` × 3 — NOT FIXED. **F3 founder decision owed.**
`interactive-surface.ts` lines 19 / 23 / 29 carry **custom off-token shadows** with **no Figma
equivalent**:

| Const | Shadow value | Nearest Figma token (NOT applied) |
|---|---|---|
| `SURFACE_IDLE` | `0 2px 8px rgba(0,0,0,0.06)` | `--shadow-sm` = `0 1px 3px …/0.06` (different geometry) |
| `SURFACE_HOVER` (hover) | `0 4px 12px rgba(0,0,0,0.08)` | `--shadow-md` = `0 4px 6px …/0.08` (different blur/spread) |
| `SURFACE_ACTIVE` | `0 2px 8px rgba(0,0,0,0.06)` | `--shadow-sm` (as above) |

Choosing a replacement is a **design decision, not a lint fix** — none of the five Figma shadows
(`--shadow-xs/sm/md/lg/xl`) matches these values, so any swap changes the rendered depth of the entire
interactive surface family (sidebar buttons, top-bar pills, search pill, bell, avatar).

**Grandfathered, not silenced:** each line carries an inline
`// eslint-disable-next-line shared-ui/no-raw-color -- off-token custom shadow; F3 design decision (docs/f2-state.md)`
so the build stays green and NEW `no-raw-color` violations anywhere still fail. The rule's coverage is
intact; only these three known lines are exempt.

**F3 must pick ONE, per surface:** (a) map each to one of the five existing Figma shadow variables
(accept the depth change and re-measure), OR (b) add new shadow variable(s) to the Figma shadow scale
and regenerate tokens (`tokens:pull` → `tokens:build`) so a real token utility exists. **Do not invent
a value in code** — either path goes through the Figma → token pipeline. When resolved, delete the three
`eslint-disable` lines.

## 3d — what the rule catches, precisely

`no-caller-and-self-css` (enforceable subset) flags an inline `style={{ key: … }}` when the same
component also accepts a `style` prop — a CSS property set internally that the caller can also set.
It does **NOT** catch: (i) a hardcoded className utility conflicting with an accepted `className`
(needs tailwind-merge / utility→property semantics), (ii) a variant prop mapping to a property under a
non-CSS name, or (iii) dynamically-computed style keys. Documented so no one over-trusts it.

## VRT baselines are committed by a human (Linux images from CI) — never pushed by CI

The gate enforces in CI on `ubuntu-latest`. Baselines must be rendered by that same OS + Chrome (font
anti-aliasing is platform-specific), so a baseline captured on a Windows/macOS dev machine would make
every story diff. **CI never commits baselines.** An earlier self-bootstrapping design (CI generates +
pushes baselines on first run) was dropped: a gate whose failure mode is a *silent green* — no
baselines → soft "no baseline yet" pass → green forever — is worse than no gate.

**How baselines get established (owed after F2 merges):**
1. The `storybook-vrt` job runs with no committed baselines → it renders the Linux images, uploads them
   as the `vrt-baselines-to-commit` artifact, and **FAILS** (never a silent pass).
2. A human downloads that artifact and commits its PNGs to `scripts/vrt/__baselines__/` in a PR.
3. The job re-runs green; the gate is live for every subsequent PR (Linux-against-Linux).

A one-command task to render baselines inside the runner's own container image (Docker) would be the
tidier pattern, but **Docker was unavailable in the F2 authoring environment**, so the artifact-download
flow above is the supported path.

`npm run vrt:stories baseline|check` stays available locally for **spot checks only** — a
Windows/macOS-rendered baseline is NOT authoritative and must not be committed. The F2 both-ways proof
was run locally (harness level, same-Chrome both sides): unchanged → `max 0%` PASS; one token shifted →
`max 5.632%` FAIL, isolated to the changed story; reverted → `max 0%` PASS. The gate will be proven
end-to-end (Linux-vs-Linux) on the first PR after F2 merges, once baselines are committed per the flow
above.

## Calibration — `THRESH=60`, gate `0.05%` (measured)

`THRESH=60` = the per-pixel RGB-sum AA filter (unchanged from F1). Every story is snapshot at 1440
and 380.

**The gate threshold is 0.05%, tightened from a provisional 0.3% once CI owned the baselines.** The
0.3% was inherited from F1's *full-page* noise floor (~0.134%, image-heavy routes dense with
anti-aliased edges); Storybook stories are isolated components on a plain background, so their real
floor is far lower. **Measured in CI** (run 30205346920 — a fresh Linux capture diffed against the
committed Linux baselines, i.e. a cross-run comparison across two Chrome instances): the story-level
noise floor is **0.000% on every one of the 10 snapshots** (all 16-band profiles zero, no height
change). 0.05% therefore sits far above the floor — with margin for any rare within-version AA flicker
a single run can't rule out — while staying tight enough that a component-level regression on even the
smallest avatar exceeds it.

A whole-frame percentage still cannot catch a *sub-0.05%* single-pixel tweak on the xs avatar (a
fundamental limit of frame-level pct, not of this threshold); per-band gating would be the tool for
that, out of scope here.

**Re-baseline after a Chrome-major bump.** The 0.000% floor holds *within* a Chrome version (baselines
and gate captured on the same runner image). A runner Chrome bump can shift AA and lift the floor —
delete `scripts/vrt/__baselines__` and re-establish it via the artifact flow above.
