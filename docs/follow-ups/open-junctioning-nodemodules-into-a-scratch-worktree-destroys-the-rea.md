# Junctioning `node_modules` into a scratch worktree destroys the real one
- **What happened:** verifying `741eb08` in isolation (the entry above) used a scratch git worktree
  with `node_modules` junctioned in (`New-Item -ItemType Junction`) rather than reinstalled, to
  avoid a multi-minute `npm ci` for a one-off check. `git worktree remove --force` on that worktree
  errored ("Filename too long") partway through — and had, before failing, recursed **through the
  junction into the real `node_modules`** and started deleting inside it. `node_modules/.bin` was
  gone entirely afterward; the actual packages (`next`, `vitest`, `typescript`, …) survived because
  the delete aborted mid-walk, not because junctions were respected as opaque.
- **The false-green tell:** with `.bin` gone, `npx tsc --noEmit` did not error — it silently
  resolved to an unrelated same-named package on the npm registry (`tsc@2.0.4`, a placeholder that
  prints "this is not the tsc command you are looking for") and exited non-zero on ITS OWN terms,
  which looked like a real compile failure until inspected. Had that placeholder instead exited 0,
  a `tsc --noEmit` check would have reported clean while checking nothing. Same class of trap as
  `getComputedStyle` returning a live object that reads plausible while measuring the wrong thing,
  and Tailwind v4 compiling an unrecognized utility to standalone longhand properties instead of
  erroring: **the tool degrades to something that still runs and still looks like an answer.** A
  missing/wrong binary on `PATH` is not always a loud failure — check `node_modules/.bin/<tool>.cmd`
  exists (or invoke `node node_modules/<pkg>/bin/<tool>` directly) if a familiar `npx` command
  starts behaving strangely, rather than trusting its exit code alone.
- **The rule:** never junction (or symlink) `node_modules` into a scratch worktree. Either accept
  the full `npm ci` cost for that worktree, or — if the check is read-only and fast — run it without
  installing anything by pointing `NODE_PATH`/a temp `tsconfig` at the main repo's `node_modules`
  instead of merging directory trees. If a worktree with a junctioned `node_modules` was created
  anyway, **do not** `git worktree remove` or `rmdir /s` it — remove the junction itself first
  (`Remove-Item <path>\node_modules` with no `-Recurse`, which unlinks a junction without
  descending into its target), confirm the real `node_modules` is untouched, then remove the rest
  of the worktree normally.
- **Recovery, if it happens again:** don't patch around a missing shim. Full `Remove-Item -Recurse
  -Force node_modules` + `npm ci`, then re-verify `.bin` exists and the tool resolves correctly.
  A partial fix (reinstalling just the missing piece) doesn't rule out other silent damage from the
  same aborted delete.
- **Trigger:** already in force — no scratch worktree should ever share `node_modules` with the
  main tree via junction/symlink again.
