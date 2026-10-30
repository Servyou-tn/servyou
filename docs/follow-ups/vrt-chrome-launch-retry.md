# VRT Chrome launch retry — logged, not fixed (`ci/vrt-chrome-launch-retry`, 2026-10-29)

Ranked.

## 1. MEDIUM — diff.mjs counts a pair it failed to compare as 0 %
✅ CLOSED — `fix/vrt-diff-errors-fail`, 2026-10-30: diff.mjs counts errored pairs and prints `errors: N of M`; any
errored pair FAILS the gate (`scripts/vrt/gate.mjs`, unit-tested in `src/__tests__/vrt-gate.test.ts`); every pair
errored → diff.mjs exits 2 with a FATAL line; output without the `errors:` line is unparseable → FAIL.
**What:** in `scripts/vrt/diff.mjs` a pair whose `Runtime.evaluate` throws prints `ERR` and is skipped, so it never
raises `maxPct`. If every pair errored, the gate would read `max 0%` and PASS. Same shape in `capture.mjs` is safe
(an `ERR` shot writes no PNG → MISSING / ORPHAN fail).
**Why deferred:** one PR, one focus (this one only retries the browser start); fixing it changes the gate's verdict.
**Where:** `scripts/vrt/diff.mjs` main loop; `scripts/vrt/stories.mjs` (which parses `max %`).
**Trigger:** next VRT touch — have diff.mjs print an `errors: N` line and stories.mjs fail when N > 0.

## 2. INFO — why Chrome sometimes does not start is still unknown
**What:** the launch used to discard Chrome's output. `launch-chrome.mjs` now prints the stderr tail and the exit
code of every failed attempt. Read the next flaky run's log before changing anything else (profile lock, `/dev/shm`,
a port collision between capture 9351 and diff 9353 are the candidates).
