# `docs/follow-ups.md` conflicts on every concurrent branch — it needs an append convention

**✅ CLOSED — chore/architecture-pass-1 (2026-10-27): the file was split into this folder, one file per topic or PR. Rule: add a new file, never append to a shared one (see README.md).**

- **What:** this file conflicted **twice in a single session** (2026-07-31), on the same lines, for
  the same reason: every PR inserts its new entries at the **top of `## Open`**, so any two branches
  alive at once both rewrite the identical region. First conflict was moving the image-storage work
  off PR #102's branch; the second was rebasing that branch onto main after #102 merged. Same file,
  same hunk, twice.
- **Why it is worse than an ordinary conflict:** the merge is not mechanical. Resolving it means
  deciding *which entries belong to which PR* — on the first conflict the stash carried #102's five
  entries into a branch that must not contain them, and keeping "both sides" would have silently
  duplicated another PR's follow-ups into this one. A careless `--theirs`/`--ours` is wrong in both
  directions, and the damage (an entry attributed to the wrong PR, or lost entirely) is invisible in
  review because the file is prose.
- **Proposed fix — APPEND AT END, not per-PR sections.** New entries go at the *bottom* of `## Open`.
  Git merges concurrent appends to different tail positions cleanly; concurrent inserts at the same
  head position never merge. Per-PR sections (`## Follow-ups from PR #NNN`) sound tidier but do
  **not** fix it: every branch still edits the same section list at the same place unless each new
  section is appended at the file's tail — at which point the section heading is just decoration on
  top of the append rule. So: append, and let the entry's own text say which PR raised it.
  - Trade-off, stated: newest-last is worse to read than newest-first. Mitigate with a dated
    one-line index at the top if that becomes annoying — an index line is one line, so it still
    collides, but a one-line conflict is trivial where a 60-line prose conflict is not.
  - The alternative that actually removes the problem is one file per entry
    (`docs/follow-ups/<slug>.md`), which cannot conflict at all. Heavier, but worth considering if
    the append convention still bites.
- **Deliberately NOT restructured in the two PRs that hit it** (founder call) — reordering the whole
  file inside a storage PR would bury the change under an unrelated diff, and the restructure wants
  to land when no other branch is mid-flight or it just causes the conflict it is trying to prevent.
- **Trigger:** next time two PRs are open at once, or the next time this file conflicts — whichever
  comes first. Do it on a branch with nothing else in it, when no other PR is open.
