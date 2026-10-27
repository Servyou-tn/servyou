// Column geometry of the H11 table — ONE source for the header (page.tsx) and every ProposalRow, so a header label cannot drift off
// its column (the H8 lesson, engagement-columns.ts). Figma 298:9129 / PropositionRow 296:9022, docs/design/h9-h13-measurements.md §5.2,
// at 1440: px 24, gap 16, mission FILL · client 170 · ma proposition 120 · statut 120 · envoyée le 120 · actions 207.
//
// Same tiering as H8: the table layout starts at `xl` (below it each row stacks as a labelled card — the frame has no mobile),
// compact (px 16, gap 12) between 1280 and 1400, the frame's px 24 / gap 16 from 1400. The two tiers are NON-overlapping ranges
// (`xl:max-[1400px]:` / `min-[1400px]:`), never a base plus an override (reference: engagement-columns.ts).
// Plain strings, not cn(): no text utilities live here, and tailwind-merge would evict a `text-<size>` next to a colour.
export const COL = {
  line: 'xl:flex-row xl:items-center xl:max-[1400px]:gap-3 xl:max-[1400px]:px-4 min-[1400px]:gap-4 min-[1400px]:px-6',
  mission: 'xl:min-w-0 xl:flex-1',
  client: 'xl:w-[170px] xl:shrink-0',
  terms: 'xl:w-[120px] xl:shrink-0',
  statut: 'xl:w-[120px] xl:shrink-0',
  sentOn: 'xl:w-[120px] xl:shrink-0',
  actions: 'xl:w-[207px] xl:shrink-0',
} as const
