# D3 banner-fix recovery (`fix/d3-banner-recovery`, 2026-08-16)

## 🔴 STANDING RULE: a commit pushed to a branch after its PR has merged goes nowhere — verify the fix landed on `main`, not just that the work was done
- **What happened:** `2f5a65b` ("fix(shop): render the real D3 banner…") was written and
  DOM-verified on branch `fix/d3` — but PR #132, on that same branch, had already merged the day
  before (Aug 12). No second PR was opened for the follow-up commit, so it sat stranded on the
  orphaned `fix/d3` branch for three days until a founder screenshot caught the still-broken
  banner and forced a rediscovery (`fix/d3-banner-recovery`, this section).
- **Why it's dangerous:** the branch still exists, still has the commit, `git log` on it looks
  completely normal — nothing about the local state signals "this never shipped." The only way to
  know is to check whether the commit is reachable from `origin/main`, and nobody did that before
  treating the fix as done.
- **Rule, from now on:** after any fix commit, confirm it actually landed —
  `git merge-base --is-ancestor <commit> origin/main` (or: is it in a *merged* PR, not just a PR
  that exists) — before considering the work complete. A commit existing on a branch, even a
  DOM-verified one, is not evidence it shipped. Any fix made after a PR has merged needs its own
  branch and its own PR; it cannot ride the merged branch's coattails.
- **Trigger:** standing — apply this check whenever picking up a "didn't this already get fixed?"
  report, and as a habit after every fix commit going forward.

## `Avatar`'s `<Image>` sets no `priority` — a real LCP concern on a page sellers share publicly
- **What:** `Avatar` (`src/components/ui/avatar.tsx`) never passes `priority` to its
  `<Image src={src} fill … />`. On D3 (`/boutique/[id]`) the shop's own avatar sits inside the
  hero, above the fold — very plausibly the page's LCP element — yet it renders as a default
  lazy-loaded image. Observed directly during this PR's re-verification: a CDP capture at 1440px
  caught the avatar image not yet painted at screenshot time, while the same page at 375px had
  already painted it. Consistent with lazy-load timing, not a data bug.
- **Why it matters more here than on an average internal page:** D3 is the one route a seller puts
  in a bio link and shares externally — the audience landing on it cold, with no warm cache, is
  exactly the audience LCP timing affects most.
- **Not fixed here** — out of scope for a banner-fix recovery PR, and `Avatar` is a shared
  primitive (topbar avatar, D4, G3's preview, etc.); adding `priority` needs to be conditional per
  call site (the standalone hero usage, not every 40px topbar instance), plus a check that no page
  ends up with more than one `priority` image (Next.js flags that).
- **Trigger:** a small, dedicated PR — thread a `priority?: boolean` prop through `Avatar`, set it
  `true` on D3's hero avatar (and D4's, once checked) only.
