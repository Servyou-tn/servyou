# Bell panel — measurements (Figma « NOV 18 — Notifications (cloche) · v1 », section 1778:30747)

Source: the founder's export of the section (a PNG and a node dump per frame), outside the repo. **0 Figma reads used.**
The export's README replaces the reads: build from the dumps, and use at most 1 read for a final check if something is
unclear. The sentences in the frames are illustrative: the approved i18n keys of #401 win.

| Frame | Id | What |
|---|---|---|
| bell-0 / bell-3 / bell-9plus / bell-3-open | 1778:32195 / 32200 / 32207 / 32214 | Topbar bell states |
| panel-fr / panel-en / panel-ar / panel-fr-empty | 1778:31013 / 31087 / 31161 / 31235 | Desktop dropdown (≥ 1024) |
| desktop-1440-fr-open | 1778:31618 | The panel open on the seller dashboard (placement) |
| m375-fr / m375-en / m375-ar / m375-fr-empty | 1778:32602 / 32710 / 32818 / 32926 | Mobile bottom sheet (< 1024) |

## Bell (topbar)

| Part | Figma | Code (`TopbarNotifications.tsx`, `BellPanel.tsx` `BellButtonFace`) |
|---|---|---|
| Button | 40×40, radius 10, no fill | `h-10 w-10 rounded-[10px]`, hover only |
| Button, panel open | fill surface/subtle | `bg-surface-subtle` while a surface is open |
| Glyph | bell 20, text/muted | `Bell h-5 w-5 text-text-muted` |
| Badge | 16 tall, HUG width, pad 0/4, radius full, blue/600 | `h-4 min-w-4 px-1 rounded-full bg-brand-blue-600` |
| Badge text | Inter Semi Bold 12, text/inverse, line 16 | `text-xs font-semibold leading-4 text-text-inverse` |
| Badge position | x 21 / y 3 from the button's top-left (24 wide at « 9+ ») | `left-[21px] top-[3px]` (physical: the AR frame keeps it top-right) |
| Badge text | none at 0; the count to 9; « 9+ » above 9 | `bellBadgeText()` |

## Desktop panel (≥ 1024): panel-fr / -en / -ar / -fr-empty

| Part | Figma | Code |
|---|---|---|
| Panel | 400 wide, radius 16, surface/base, 1 px border/subtle, HUG to 520 | `w-[400px] rounded-2xl border-border-subtle bg-surface-base`, max height 520 or the space below the bell |
| Shadow | 0 12 32 rgba(15,23,42,0.12) | `shadow-[0_12px_32px_rgb(15_23_42/0.12)]` |
| Placement | 8 px under the bell, end edge aligned | Radix Popover `align="end" sideOffset={8}`; RTL from the DirectionProvider |
| Header | pad 16/20, gap 8, bottom rule border/subtle, 59 tall | `px-5 py-4 gap-2 border-b` |
| Title | « Notifications » 18/26 Semi Bold, text/primary | `text-lg font-semibold leading-[26px]` |
| Unread pill | pad 2/8, radius full, blue/100; 12 Semi Bold blue/700 | `px-2 py-0.5 rounded-full bg-brand-blue-100 text-caption font-semibold text-brand-blue-700` |
| Mark all | at the end, gap 6: check-check 16 + Body Small Medium blue/600; hidden at 0 unread | `gap-1.5`, `CheckCheck h-4 w-4`, `text-body-sm font-medium text-brand-blue-600`, rendered only when unread > 0 |
| List | the items, then it scrolls | `min-h-0 flex-1 overflow-y-auto` |

## Item (both surfaces)

| Part | Figma | Code (`BellItemLink`) |
|---|---|---|
| Row | pad 14/20, gap 12, top-aligned, 92 tall with its rule | `px-5 py-3.5 gap-3 items-start` |
| Rule | bottom border/subtle, none on the last item | `border-b` on every `li` but the last |
| Unread row | fill blue/50 | `bg-brand-blue-50` |
| Read row | fill surface/base | `bg-surface-base` |
| Tile | 40 round, glyph 20 | `h-10 w-10 rounded-full`, glyph `h-5 w-5` |
| Tile, new order / request | blue/100 + blue/700, shopping-bag | tone `info`, icon `shopping-bag` |
| Tile, accepted | success/100 + success/700, circle-check | tone `success`, icon `circle-check` |
| Tile, receipt confirmed | success/100 + success/700, package-check | tone `success`, icon `package-check` |
| Tile, prepared → arrived / work delivered | indigo/50 + indigo/600, truck | tone `progress`, icon `truck` |
| Tile, cancelled / refused | danger/50 + danger/700, circle-x | tone `danger`, icon `circle-x` |
| Text column | gap 2 | `gap-0.5` |
| Line 1, sentence | Body Small 14/21, Semi Bold unread / Medium read, text/primary | `text-body-sm font-semibold` / `font-medium` |
| Line 2, item title | Body Small Regular, text/secondary | `text-body-sm text-text-secondary`, in a `<bdi>` |
| Line 3, time | Caption 12/17 Medium, text/muted | `text-caption font-medium text-text-muted` |
| Unread dot | 8 px blue/600 at the end, 6 px from the top | `h-2 w-2 rounded-full bg-brand-blue-600` in a `pt-1.5` box |
| Read item | an empty 8 px slot at the end | `w-2` spacer |

## Empty state: panel-fr-empty (276 tall), m375-fr-empty

| Part | Figma | Code (`BellPanelBody`) |
|---|---|---|
| Header | title only: no pill, no « Tout marquer » | unread = 0 hides both |
| Block | pad 40/32, gap 12, centred | `px-8 py-10 gap-3 items-center text-center` |
| Circle | 48, surface/subtle; bell 22 text/muted | `h-12 w-12 rounded-full bg-surface-subtle`, `Bell h-[22px] w-[22px]` |
| Title | Body Small Semi Bold, text/primary | `text-body-sm font-semibold text-text-primary` |
| Text | Body Small Regular, text/muted, 280 wide | `max-w-[280px] text-body-sm text-text-muted` |

## Mobile bottom sheet (< 1024): m375-fr / -en / -ar / -fr-empty

| Part | Figma | Code (`BellSheet.tsx`, `BellPanelHeader variant="sheet"`) |
|---|---|---|
| Sheet | full width, top radii 20, surface/base, bottom pad 24 | `w-full rounded-t-[20px] bg-surface-base pb-6`, `max-h-[85dvh]` |
| Scrim | #0F172A at 0.45 | `backdrop:bg-overlay-scrim`, the app's one scrim, as in ModalDialog (founder, #402 D14) |
| Handle | pad 8 top / 4 bottom; grabber 36×4, radius 2, border/strong | `pt-2 pb-1`, `h-1 w-9 rounded-sm bg-border-strong` |
| Header | pad 4 / 12 (end) / 4 / 20 (start), gap 8, 48 tall | `py-1 pe-3 ps-5 gap-2` |
| Close | 40×40, radius 10, ✕ 20 at the end | `h-10 w-10 rounded-[10px]`, `X h-5 w-5` |
| Mark all | its own row: pad 0/20/12/20, bottom rule | `px-5 pb-3` inside the header's `border-b` |
| Items | the same item, 375 wide | `BellPanelBody` |
| Ways out | ✕, swipe down, a tap on the scrim | ✕, a swipe past 80 px on the handle or header, a press that starts on the scrim, Escape |

## Arabic: panel-ar, m375-ar

- Everything mirrors through logical properties: the tile at the start (right), the dot at the end (left), the text
  start-aligned in Cairo, ✕ and « Tout marquer » mirrored.
- The badge stays at the bell's top-right, as drawn.
- Western digits.

## Not in v1

No « Voir toutes les notifications » footer: there is no inbox page.
