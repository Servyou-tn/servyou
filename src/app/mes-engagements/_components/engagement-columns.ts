// Column geometry of the H8 table — ONE source for the header (page.tsx) and every EngagementRow, so a
// header label cannot drift off its column (they were two hand-copied sets of widths).
//
// Figma 273:8575 (docs/design/h8-measurements.md §4), at 1440: px 24, gap 16, client 200 · service FLEX ·
// statut 105 · budget 95 · échéance 160 · actions 205 → the service column is the one that stretches
// (≈ 241 px at 1440).
//
// What changed, and why (fix/ui-polish-1):
//   • Budget is 140 and actions 208, both architect rulings (D3: « Dès 3 500 TND » / the Arabic « ابتداءً من
//     350 د.ت » must stay on one line; the actions cell's own content is 120+8+36+8+36). Together with the
//     rest of the fixed columns that left the service column ≈ 119 px at 1366 (« Créati… / Design … ») —
//     because the client column kept its full 200 px however narrow the table was.
//   • So client and service now SHARE what is left (4 : 5), client clamped to 132–200 px. The service
//     column is therefore always the larger of the two, and the client name — avatar + one truncated line —
//     is the one that gives way. 4 : 5 rather than 2 : 3 because the « Consommateur » line under the name needs
//     ≈ 108 px of text (+ 52 for the avatar): at 160 px it fits whole at 1366.
//   • Below 1400 px the table runs compact: px 16, gap 12, échéance 140 (« Demandée le 26 juil. » measures 135 px —
//     a first try at 128 clipped it). Budget stays 140: the Arabic « ابتداءً من 150 د.ت » measures 125 px.
//     From 1400 px up it is the frame's px 24 / gap 16 / échéance 160.
//   • The table layout starts at `xl` (1280), not `lg` (1024): between 1024 and 1279 the fixed columns
//     alone (≈ 750 px) exceed the table's ≈ 690 px, so the service column was squeezed to nothing. Below
//     `xl` the row stacks as the card it already was under `lg`.
//
// The two tiers are written as NON-overlapping ranges (`xl:max-[1400px]:` vs `min-[1400px]:`), never as a base
// plus an override: an override only wins by CSS source order, which depends on how the breakpoints are declared
// (tokens.css keeps `xl` in px; stock rem breakpoints would flip it and silently kill the ≥ 1400 tier).
// ⚑ Tailwind v4 `max-[N]` is `width < N` and `min-[N]` is `width >= N`: the pair that tiles the axis is
// `max-[1400px]` + `min-[1400px]`. `max-[1399px]` left 1399.x in neither tier (measured: no gap, no padding, délai
// 103 px, header off its rows) — checked at 1399 and 1400.
//
// Plain strings (not cn()) — tailwind-merge would evict a `text-<size>` next to a colour
// (reference_twmerge_text_size_color_footgun), and these hold no text utilities anyway.
export const COL = {
  /** The flex container shared by header and row: direction + padding + gap, table layout from `xl`. */
  line: 'xl:flex-row xl:items-center xl:max-[1400px]:gap-3 xl:max-[1400px]:px-4 min-[1400px]:gap-4 min-[1400px]:px-6',
  client: 'xl:min-w-[132px] xl:max-w-[200px] xl:flex-[4_1_0%] xl:justify-start',
  service: 'xl:min-w-0 xl:flex-[5_1_0%]',
  statut: 'xl:w-[105px] xl:shrink-0',
  budget: 'xl:w-[140px] xl:shrink-0',
  delai: 'xl:max-[1400px]:w-[140px] xl:shrink-0 min-[1400px]:w-[160px]',
  actions: 'xl:w-[208px] xl:shrink-0',
} as const
