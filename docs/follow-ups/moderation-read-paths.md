# Moderation read paths (`fix/moderation-filter`, 2026-07-28)

## `admin_hide_content` hides by two different mechanisms — consider making it cascade
- **What:** the RPC's behaviour is **not uniform across target types**:
  | Target | sets `status='hidden'` | sets `admin_hidden_at` |
  |---|---|---|
  | `product` | ✅ | ✅ |
  | `service` | ✅ | ✅ |
  | `shop` | ❌ (no status column) | ✅ |
  | `freelancer_profile` | ❌ | ✅ |
  | `job_post` | ❌ (**has** `status`, left untouched) | ✅ |
- **Why it is a trap:** hiding a shop or a freelancer leaves **every child listing at
  `status='active'`**. A reader that filters `status` alone therefore catches a directly-hidden
  product but happily lists a moderated seller's entire catalogue. That is exactly the bug
  `fix/moderation-filter` closed on six read paths, and the asymmetry is invisible unless you
  read the function body — the next person will reasonably assume hiding a shop hides its
  products at the row level. It also means `job_post` moderation is *weaker* than it looks: the
  column exists and is deliberately not set.
- **Filtering the parent is the correct fix either way** (a child row is not itself moderated —
  it is hidden *by consequence*, and it must come back if the parent is unhidden), so this is
  logged rather than fixed. But the option is real:
  - **Option A — leave as is.** Parent predicates on every public read path, which is what now
    ships. Unhide is trivially correct. Cost: every future public reader must remember the join.
  - **Option B — make the RPC cascade**, setting `status='hidden'` on children too. Cost:
    `admin_unhide_content` must then restore the *previous* status per child (draft vs active vs
    paused), which needs a stored prior value — a new column or an audit-log read. Strictly more
    state, and it can un-pause a listing the seller had paused themselves.
  - **Option C — push it into RLS**, so the SELECT policy itself excludes hidden rows and their
    hidden parents. Strongest guarantee, and it would have made this whole class of bug
    impossible, but it changes read semantics for the owner/admin paths that legitimately need
    to see hidden rows.
- **Recommendation:** A (shipped) + revisit C when `freelancer_profiles` gets its column-exposure
  migration, since both touch the same policy.
- **Trigger:** next moderation-touching PR, or when `/trouver-des-missions` ships.

## `job_posts` has no public read path yet — the filter is pre-installed as a test, not code
- The public missions board is a `ComingSoon` stub, and the only `job_posts` readers today are
  owner-scoped (`getMyMissions`, `getMissionDetail`, `DashboardRightRail`) where filtering would
  be the bug. So there was no query to fix.
- Instead `src/__tests__/moderation-read-paths.test.ts` asserts that **no non-owner module under
  `src/lib/marche` or `src/lib/search` reads `job_posts`**, and that any module in those
  directories touching a moderated table filters `admin_hidden_at`. Building the board makes
  that test fail until the filter is added — which is the point.
- **Trigger:** when the board is built, filter `admin_hidden_at` on the listing query and delete
  the now-obsolete assertion.
