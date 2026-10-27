# F3 batch 2 — Segmented + Select reconciliation (PARKED; inventory from feat/f3-batch2-select-segmented)

The branch's build stalled on the flaky figma-cli bridge; its Phase-1 inventory is preserved here so it survives the branch deletion. Both primitives exist in `src/components/ui/` but were **never measured against Figma → not reconciled** (F3-style). Reconcile in a later batch; the /marche/services rebuild consumes them as-is and inherits the fix.

- **Segmented** — `src/components/ui/segmented-control.tsx` (`'use client'`). Controlled (`value`+`onChange`); `role="tablist"`/`"tab"` + `aria-selected` + `aria-label`; Motion `layoutId` sliding pill + `useId` instance isolation; reduced-motion snap; `FOCUS_RING`; all tokens (`bg-surface-pill` track, `bg-brand-blue-600` active pill, `text-white`/`text-text-muted`, `rounded-full`, `px-4 py-1.5 text-sm font-medium`, `min-w-20`). **2 real consumers:** `SharedSearchBar.tsx:101`, `ParametresForm.tsx:99`. **Keyboard gap:** native `<button>` gives Tab + Enter/Space, but **no arrow-key roving** (the ARIA tabs pattern owes roving `tabindex` — confirm against accessibility.md when reconciling). **Not a consumer:** `ServicesLensToggle` is a *parallel bespoke* toggle (`rounded-lg`, static white pill, disabled "soon" Freelances + badge, per-option icons). **Figma `93:2707`** (18 variants: count[2,3,4] × state[default,focus] × selected, props label1-4 + **icon1-4**) → the primitive **lacks per-option icons** (in Figma, not code → build on reconcile).
- **Select** — **no reconciled Select primitive exists.** `ServicesFilterBar` builds its 4 triggers ad-hoc on `ui/dropdown-menu` + `ui/popover` (+ `ui/filter-control`), none reconciled. Figma: Select — Trigger `72:1051` / Panel `72:1094` / Option `72:894`; Filter Bar `150:10825`; Range Slider `143:9517`.
- **Node IDs for eventual measurement:** Segmented `93:2707`, Filter Bar `150:10825`, Select Trigger `72:1051` (+ Panel `72:1094`, Option `72:894`), Range Slider `143:9517`, Service Card `124:6200`, Pagination `188:14219`, empty state `611:47916`, frame `611:45637`.
- **Bridge note:** the figma-cli CDP bridge (`connect`) drops after ~1 command and Figma MCP is capped at 6 calls/month on the free Starter plan (not viable). The **Figma REST API** (`GET api.figma.com/v1/files/:key/nodes?ids=…`, `X-Figma-Token`) returns raw `padding`/`itemSpacing`/`absoluteBoundingBox`/`boundVariables` over plain HTTPS with no plugin — the robust path for future measurement (variable *names* still need the CDP bridge or a paid tier; the `/variables/local` name endpoint is Enterprise-gated).
- **⛔ BRIDGE NOTE SUPERSEDED (2026-08-03): the CDP bridge is DEAD, not flaky.** On Figma **126.7.10** the app ignores `--remote-debugging-port` outright — verified from a clean slate (unpatch → all Figma + `figma_agent` processes held down to zero → `figma-cli connect`, which printed `✔ Figma configured` and launched the app ITSELF with the flag on its command line): port 9222 never binds, `netstat` empty, `/json/version` refuses. No relaunch race, no stub-vs-versioned ambiguity — the flag is simply not honoured, so **every recovery recipe in the memory notes is inapplicable on this build** and further transport variations are wasted effort. The **claude.ai Figma MCP is now the primary measurement surface** (file key `jDNjJ8D1gnXiW7Ry3GkN4U`); its Starter quota **does reset on a rolling window** (exhausted 08-01, working again 08-03). It returns geometry only — no padding, itemSpacing, fills or bound variables — so the **REST API above is the fallback for those**, and it is the only route back to a full measurement short of a future Figma build that re-honours the flag.

## 🔴 ~~G9 price breakdown — type/colour owed a REST read~~ → SUPERSEDED 2026-08-03. NOTHING WAS OWED; TWO VALUES SHIPPED WRONG

**This entry was wrong when written, and the correction is a defect, not a doc tidy.** It claimed colour and the Total's height "owe a REST read." They do not: **`docs/design/g9-deltas-2.md` lines 292-295 already carried the full measured `priceBreakdown` spec**, taken off a live plugin-bridge read on 2026-07-30 — a week before the block was built. The build did not consult it. What that spec says, against what shipped:

| node | Figma (g9-deltas-2 §panel-produit) | shipped in PR #107 | verdict |
|---|---|---|---|
| row 1-2 **labels** | 16/26 Regular `#475569` | 16/24 · 400 · `#475569` | ✅ colour right |
| row 1-2 **values** | 16/26 Regular **`#0f172a`** | 16/24 · 400 · **`#475569`** | 🔴 **wrong tier** |
| Total label + value | 16/25 **Inter Bold** `#0f172a` | 16/24 · **600** · `#0f172a` | 🔴 **wrong weight** |
| Divider | 704×1 `#e2e8f0` | 1px `rgb(226,232,240)` | ✅ |

Both are filed with IDs in **`docs/design/g9-deltas-3.md` (PB-1, PB-2)**. The 25-vs-26 question is also answered there and the answer is **not** the font-metric-rounding hypothesis this entry offered: 25 is the line-height of the **Bold** Total row against the Regular rows' 26. ⚑ **`src/app/commandes-recues/[id]/page.tsx` still asserts the rounding hypothesis in its call-site comment** — owed a correction whenever PB-1/PB-2 are closed.

**What does survive:** the size derivation. `text-body` (16px) was reached from `leading/body = 26` plus advance-width RMS 1.19px at 16px vs 9.02px at 14px — and pass 2's independently-measured `16/26 Regular` confirms it exactly. The two-channel method was sound; the mistake was not reading the delta file that already had the answer.

**Method rule this earns:** before measuring a G-series region, grep `docs/design/*-deltas*.md` for the node id. Three passes of measurement already exist and they are not indexed anywhere else.

**Also owed (pre-existing, wider than G9):** money is interpolated raw into `"{price} TND"` platform-wide (`seller.orderDetail.unit_price`, `seller.dashboard.tile.profit_value`, and now the breakdown's `price_amount`), so `12.5` renders `12.5 TND` rather than the French `12,50`. The i18n skill's `formatTND` helper (locale-aware `toLocaleString`) exists in the skill doc but **not in the codebase**. Out of scope for one panel; it wants one pass across every money string.

## 🔴 The VRT story gate is NON-FUNCTIONAL on this machine — it fails everything, so it detects nothing

Found 2026-08-03 while checking whether the `--text-body--line-height` fix needed a rebaseline.

`node scripts/vrt/stories.mjs check` reports **max 99.87%, all 32 stories FAIL** — including
`tokens-smoke`, Avatar and StatusPill, none of which use `text-body`. **A negative control settles
it:** with the token change reverted the gate returns **byte-identical 99.87%**. The committed
`__baselines__` therefore do not correspond to this machine's rendering at all — consistent with
`stories.mjs`'s own note that *"the measured Linux story-level floor is 0.000%"*, i.e. they were
captured on Linux/CI while this is Windows.

**Consequence: the gate is worse than absent.** A gate that fails unconditionally cannot
distinguish a real regression from its own noise, and the natural response — "just rebaseline" —
would commit **Windows** baselines over the Linux ones, greening it here while breaking it for CI
and everyone else. **No rebaseline was taken, deliberately.**

**How to get a real answer meanwhile** (used for the token change, and it works): capture twice on
the SAME machine and diff those, bypassing the baselines entirely —

```
node scripts/vrt/stories.mjs check          # before — copy scripts/vrt/__current__ aside
<make the change>
node scripts/vrt/stories.mjs check          # after
THRESH=60 node scripts/vrt/diff.mjs <saved-before-dir> scripts/vrt/__current__
```

That returned **max 0.000% across all 32** for the line-height change — the token moves none of the
VRT'd primitives, which is why this PR ships no baseline churn.

**Fix wants a decision:** either pin baseline capture to one platform (a CI job that regenerates
them, so local runs are advisory only), or make the harness platform-aware (per-platform baseline
dirs). Until then treat a local `stories.mjs check` result as meaningless and use the
capture-twice-and-diff method above.

## 🔴 `/commandes-recues/[id]` overflows 58px at 375 — PRE-EXISTING, surfaced by the G9 breakdown gate

Measured on the authenticated route with a real seeded order (`documentElement.scrollWidth 433` vs `clientWidth 375`). **Neither offender is the price breakdown** — its rows are not in the list:

- **`OrderRail` steps** — `flex w-14 shrink-0 flex-col items-center gap-2 lg:w-20`, rightmost edge **433**. A product order's chain is **7** stages; 7 × 56px + gaps exceeds 375 and `shrink-0` forbids any give. Shipped in PR #105 (rail timestamps). A service order (4 stages) would not overflow, which is likely why this was never seen.
- **Topbar avatar cluster** — `flex shrink-0 items-center gap-4`, rightmost edge **431**. **✅
  RESOLVED — `fix/appshell-topbar-and-pitch-pages`, 2026-08-13** (see the G6/G4 entries for the
  fix). This route's overflow is now **`OrderRail`-only** — re-measure the actual remaining number
  next time this route is touched; it was not re-measured as part of this PR (the fix was verified
  on other AppShell routes, not this specific auth-gated order-detail page).

This is **not covered by** the frontend audit's "380px 0-overflow (negative-control validated)" finding — a different viewport, and more to the point that sweep could not reach the 12 auth-walled routes. Both offenders here exist *only when authenticated* (the rail's 7 product stages, the topbar's name+role avatar cluster), so an anonymous sweep could not have seen either. Treat the audit's overflow result as covering anonymous routes only.

**`OrderRail` still not fixed** — it is a previous PR's element and the fix is a real responsive decision (horizontal scroll vs a condensed mobile rail vs wrapping), not a one-liner. Only the topbar half of this entry's overflow is resolved.

## 🟡 `scripts/gate/authed.mjs` cannot set the language cookie — AR half of the visual gate is unreachable through it

`authed.mjs` injects only the session cookies, so there is no way to ask for an Arabic render; every authenticated gate run is implicitly FR. The G9 breakdown's AR/RTL capture needed a throwaway scratchpad runner that imports `mintGateCookies` and adds one `Network.setCookie` for `servyou_lang`. **Fix is ~4 lines** (a `--lang` flag setting that cookie before navigate), deliberately not taken inside a one-panel PR. Until then, any "gated in both languages" claim about an authenticated route is false unless the run says otherwise.
