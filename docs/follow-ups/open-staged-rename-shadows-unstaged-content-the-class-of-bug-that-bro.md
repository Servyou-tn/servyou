# Staged-rename-shadows-unstaged-content — the class of bug that broke #148, now a named rule
- **What happened:** `feat/annonces-vocab-rename` (#148) staged file renames early (`git mv`-style:
  `MissionCard.tsx → AnnonceCard.tsx` etc.), then edited the *content* of those already-renamed
  files afterward — internal identifiers, i18n key references, a dead-code deletion. Those edits
  landed in the working tree on top of an already-staged rename, which `git status --short` reports
  as `RM`: **R**enamed-and-staged, **M**odified-again-and-unstaged. The commit step read `RM` as
  "already staged, nothing to do" and staged only the *other* modified files, explicitly skipping
  the renamed ones on that belief. `git commit` therefore committed the bare renames — zero of the
  content fix — while `tsc`/the suite/screenshots had all been run against the working tree, which
  genuinely had the fix. `git push` followed immediately. The gap sat on `main` undetected until
  `fix/annonces-dangling-imports` traced it back to `741eb08` itself via an isolated worktree
  (`tsc --noEmit` inside a fresh worktree pinned to that exact commit still shows the 12 errors).
- **The rule:** `RM` (or any status with a non-blank *second* column — `RM`, `AM`, `MM`) means
  **staged action PLUS unstaged content on top of it.** It is never "fully staged." Only a
  single-letter code with a blank second column (`M `, `A `, `R `, `D `) means nothing further is
  pending for that path. Never infer "fully staged" from the presence of *a* staged marker — check
  the second column specifically.
- **A second, independent trap in the same incident:** a `git add` invocation with **any** invalid
  pathspec in its argument list fails the *entire* command — none of the valid paths in that same
  call get staged either. Two of the three `git add` attempts in #148 failed this way (one against
  an already-renamed-away directory, one against an already-fully-staged deletion) and staged
  nothing; only the third, narrower attempt succeeded — and it was narrowed by excluding the paths
  under the `RM` misreading above, which is how the drop happened.
- **The gate that follows from both (precise wording — a first pass at this got it wrong):** the
  rule is **not** "`git status --porcelain` must be empty." Pre-existing untracked `??` clutter
  (this repo has ~20 such lines from unrelated earlier work) does not violate anything and will
  never go away between commits — demanding zero bytes of output makes the gate fail permanently
  and teaches people to stop trusting it. The actual invariant: **no tracked path that belongs to
  the commit's own working set may carry a second-column marker.** Concretely, after `git commit`,
  before `git push`, run `git status --porcelain` and read only the lines whose first column is a
  tracked-file code (`M`, `A`, `R`, `D`, `C`, `U`) — every one of those must have a **blank** second
  column (`M `, `A `, `R `, not `RM`/`AM`/`MM`). `??` lines are untracked and outside this check
  entirely, whether they're pre-existing clutter or something new — an untracked leftover from your
  own change is a *different* mistake (an omitted file), not this one. Then run `tsc`/the test
  suite/the build **against the committed tree** (a fresh worktree or a post-commit checkout), not
  the working tree. A working-tree verification proves the *code* is correct; it proves nothing
  about what the commit — the thing that actually ships — contains.
- **Trigger:** already in force — apply this gate to every commit from here on, not just PRs that
  touch renamed files.
