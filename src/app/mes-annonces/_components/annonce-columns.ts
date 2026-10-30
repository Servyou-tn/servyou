// Column geometry of the F3 table — ONE source for the header (page.tsx) and every AnnonceRow, so a header label cannot drift off its
// column (the H8 / H11 lesson, proposal-columns.ts). Figma 1476:27949 PropositionRow, docs/design/mes-annonces-measurements.md, at 1440:
// px 24, gap 16, mission FILL · propositions 170 · budget 120 · statut 120 · publiée le 120 · actions 207.
//
// Same tiering as H11: the table layout starts at `xl` (below it each row stacks as a labelled card — the 375 frame), compact
// (px 16, gap 12) between 1280 and 1400, the frame's px 24 / gap 16 from 1400. The two tiers are NON-overlapping ranges.
// Plain strings, not cn(): no text utilities live here, and tailwind-merge would evict a `text-<size>` next to a colour.
export const COL = {
  line: 'xl:flex-row xl:items-center xl:max-[1400px]:gap-3 xl:max-[1400px]:px-4 min-[1400px]:gap-4 min-[1400px]:px-6',
  mission: 'xl:min-w-0 xl:flex-1',
  proposals: 'xl:w-[170px] xl:shrink-0',
  // `xl:order-*`: the row's DOM follows the stacked (card) reading order — the pill rides with the mission line — so from xl the
  // cells are re-ordered to the header's: mission · propositions · budget · statut · publiée le · actions.
  budget: 'xl:order-1 xl:w-[120px] xl:shrink-0',
  statut: 'xl:order-2 xl:w-[120px] xl:shrink-0',
  publishedOn: 'xl:order-3 xl:w-[120px] xl:shrink-0',
  actions: 'xl:order-4 xl:w-[207px] xl:shrink-0',
} as const
