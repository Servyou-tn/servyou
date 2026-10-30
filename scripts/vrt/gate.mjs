// VRT gate verdict — pure helpers shared by diff.mjs (the summary it prints) and stories.mjs (the
// verdict it owns), kept apart so the pass/fail rule is unit-tested (src/__tests__/vrt-gate.test.ts).
//
// The rule: a pair diff.mjs could not compare is a FAIL, never 0 % — an errored pair never raised
// `max %`, so before this a run where every comparison errored read `max 0%` and passed.

/**
 * The summary lines diff.mjs prints after its per-image table.
 * @param {{ maxPct: number, compared: number, errors: string[] }} s
 * @returns {string[]}
 */
export function diffSummaryLines({ maxPct, compared, errors }) {
  const lines = [`max ${maxPct}%`, `errors: ${errors.length} of ${compared}`]
  if (errors.length) lines.push(`ERRORED comparisons (each one FAILS the gate):\n  ${errors.join('\n  ')}`)
  return lines
}

/** True when there were pairs to compare and not one of them could be compared. */
export function allComparisonsErrored({ compared, errors }) {
  return compared > 0 && errors.length >= compared
}

/**
 * Parses diff.mjs output. `null` when either summary line is missing — the caller fails on that,
 * because an output without an `errors:` line comes from a diff.mjs that does not count errors.
 * @param {string} out
 * @returns {{ maxPct: number, errors: number, compared: number } | null}
 */
export function parseDiffSummary(out) {
  const max = out.match(/^max\s+([\d.]+)%$/m)
  const err = out.match(/^errors:\s+(\d+)\s+of\s+(\d+)$/m)
  if (!max || !err) return null
  return { maxPct: Number(max[1]), errors: Number(err[1]), compared: Number(err[2]) }
}

/**
 * The gate. Every reason is printed; pass only when there is none.
 * @param {{ missing: number, orphan: number, maxPct: number, gatePct: number, errors: number }} r
 * @returns {{ pass: boolean, reasons: string[] }}
 */
export function gateVerdict({ missing, orphan, maxPct, gatePct, errors }) {
  const reasons = []
  if (errors > 0) reasons.push(`${errors} comparison(s) errored`)
  if (missing > 0) reasons.push(`${missing} missing baseline(s)`)
  if (orphan > 0) reasons.push(`${orphan} orphan baseline(s)`)
  if (maxPct > gatePct) reasons.push(`max ${maxPct}% > ${gatePct}%`)
  return { pass: reasons.length === 0, reasons }
}
