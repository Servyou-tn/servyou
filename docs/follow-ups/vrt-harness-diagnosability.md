# VRT harness — diagnosability (found on PR #95, run 30290935264)

## `capture.mjs` discards Chrome's stderr, so a launch failure cannot be diagnosed
- `scripts/vrt/capture.mjs:66` spawns Chrome with `{ stdio: 'ignore' }`. When the DevTools
  endpoint never opens, the only evidence left in the job log is `waitFor exhausted` from the
  `/json/version` poll on line 67 (40 × 250ms = a 10s budget).
- **A crash, a sandbox refusal and a merely-slow cold start against a fresh `--user-data-dir` are
  therefore indistinguishable** — Chrome's own explanation was thrown away.
- Observed once so far: PR #95 died 10.14s after the static server came up, on a runner with
  Chrome 150.0.7871.128 and image 20260720.247.2 — **byte-identical to the previous green run**,
  so the log gave nothing to work with.
- **Fix:** pipe Chrome's stderr into the job log (`stdio: ['ignore', 'ignore', 'pipe']` and echo
  it on the failure path, or `'inherit'`). Consider surfacing a non-zero exit from the child too.
- **Trigger:** next time the VRT harness is opened, or the next unexplained capture failure.

## A Chrome launch timeout is reported as "32 stories were deleted"
- When capture produces zero images, the check step compares an empty current set against the full
  committed baseline and prints
  `ORPHAN BASELINE (32) — a story was deleted/renamed; remove these from scripts/vrt/__baselines__`.
- **That blames the author's branch for a harness fault.** On PR #95 the branch added no story
  file at all, and the suggested remedy — deleting all 32 baselines — would have been actively
  destructive if followed.
- The gate line has the same problem: `0 compared / 0 missing / 32 orphan → FAIL` reads as a
  content change rather than "the browser never started".
- **Fix:** distinguish *zero captures taken* from *genuine orphans* before printing. If the
  current set is empty (or the capture step exited non-zero), fail with a harness error and say
  so; only reach the orphan message when captures exist and a baseline has no counterpart.
- **Trigger:** same pass as the stderr item above — they share a root cause and a test case.
