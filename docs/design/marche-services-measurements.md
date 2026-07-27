# /marche/services — QA-confirmed shell geometry (preserved from closed PR #84)

**Provenance:** measured node-by-node against Figma **611:45637** (sidebar) / **611:45640** (topbar) and
QA-confirmed exact on branch `feat/marche-services-figma-100` (**PR #84, CLOSED / never merged**). That
branch is pre-foundation and gets discarded; **these numbers do not.** `main` still carries the
pre-#84 shell, so this is the only surviving record of the exact-match.

> All values are the measured Figma values. Where a DS token was exact it is named; where none existed
> the branch shipped a bracketed utility — those three are logged as DS-token gaps at the bottom.

## Sidebar — Figma 611:45637 (v2 shell: `shell/Sidebar.tsx` · `SidebarItem.tsx` · `SidebarSection.tsx`)
| region | measured |
|---|---|
| container | `bg-brand-blue-950`, padding **16px** inline (`px-4`), **24px** bottom (`pb-6`), no top pad |
| logo band | **72px** tall (`h-[72px]`), start-pad **12px** (`ps-3`), items-center · space-between; band 208×72, Lockup 123×32 |
| — S-mark | **32×32** (`h-8 w-8`), gap **8px** (`gap-2`) to wordmark |
| — wordmark | "ServYou" `text-xl font-bold`, **both words #FFFFFF** on the navy (no accent split) |
| nav list | top **12px** (`mt-3`), items **2px** apart (`flex-col gap-0.5`) |
| **nav item** | **44px** tall (`h-11`, WCAG 2.2), **radius 10** (`rounded-[10px]` — off-token), pad **12px** (`px-3`), icon↔label **12px** (`gap-3`) |
| — icon | **20×20** (`h-5 w-5`); inactive tint `text-brand-blue-300` |
| — label | `text-body-sm` (14/21); **active** `font-semibold` + `text-white` on solid `bg-brand-blue-600`; **inactive** `font-medium` + `text-white`, `hover:bg-white/5` |
| **section cap** | **32px** tall (`h-8`), pad **12px** (`px-3`), top **12px** (`pt-3`), `text-section-cap` (12/600/uppercase), **tracking 0.06em** (`tracking-[0.06em]` — off-token), colour `text-brand-blue-300` (#8faef9, AA on navy); items `space-y-0.5` (2px) |
| upgrade CTA | `rounded-xl bg-brand-blue-600 p-4` (16px), `text-body-sm leading-5 text-brand-blue-100` |

## Topbar — Figma 611:45640 (`shell/Topbar.tsx` · `TopbarSearch.tsx` · `TopbarUserMenu.tsx`)
| region | measured |
|---|---|
| bar | **64px** tall (`h-16`), gap **16px** (`gap-4`), pad **16px** (`px-4`) / **24px** md+ (`md:px-6`) |
| search | md+ inline, **fills** the row (`flex-1`, Figma sz=FILL); **40px** (`h-10`), **radius 10** (`rounded-[10px]`), `border-border-subtle bg-surface-subtle`, `ps-9 pe-3`, `text-body-sm` |
| icon cluster | gap **16px** (`gap-4`) |
| **icon button** (bell/lang/user) | **40×40** (`h-10 w-10`), **radius 10** (`rounded-[10px]`), icon **20** (`h-5 w-5`) |
| topbar avatar | `AvatarFallback` fill **#cbd5e1** (`bg-border-strong` stopgap = Figma avatar fill); initials `text-text-primary` (#0f172a) `font-medium` (kept over Figma person-glyph; white initials fail AA ~1.3:1 on the grey) |
| display name | `text-body font-medium leading-snug text-text-primary` |

## DS-token gaps surfaced by the exact-match (3) — reconcile in a DS pass, then drop the brackets
1. **radius 10** — the radius scale is 8 (`rounded-lg`) / 12 (`rounded-card`); nav items, topbar search, the icon buttons, filter selects, the lens/lang toggles, and the card CTA **all measure 10** → `rounded-[10px]`. Add `--radius-*: 0.625rem` → a named `rounded-*` utility.
2. **section-cap letter-spacing** — `--text-section-cap--letter-spacing` is `0.05em`; the Figma section label (611:45637) measures **0.06em**. `SidebarSection` overrides `tracking-[0.06em]`. Correct the token to `0.06em`, drop the override.
3. **avatar placeholder grey** — Figma topbar avatar fill is **#cbd5e1**; the DS `--surface-placeholder` is **#f4f4f4** (lighter). `TopbarUserMenu` uses `bg-border-strong` (#cbd5e1) as a stopgap. Add an `avatar-placeholder` surface token at #cbd5e1 (or decide the fallback grey), then replace the border-token-as-background. *(This is one of the three PR #84 avatar-colour bugs — see the rebuild's Phase-1 report.)*
