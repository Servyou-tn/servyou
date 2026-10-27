# H4 — Tableau de bord freelance (`feat/h4-dashboard-freelancer`, 2026-09-03)

## ✅ RESOLVED (M-B, migration 70 `20261026200934`, 2026-10-26) — `job_posts` RLS hides a non-open post's title from the freelancer who legitimately responded to it — Activité récente's proposal rows can render with no secondary line

- Fixed: a responder now reads every post they answered unless it is deleted or moderated (policy
  « Responders read the posts they answered » via `has_responded()`); the embed shape is pinned in
  `job-posts-responder-read.test.ts`. Deleted / moderated posts still embed as null by design (M-B-1).
- **New LOW (page-builder):** a post the freelancer answered that was then filled now opens at
  `/missions/[id]` (it 404'd before M-B), but `isNew` / `daysLeft` (`mission-detail-query.ts`) derive from
  `created_at` only, so it can show « Nouveau » and « Expire dans N jours » next to a « pourvue » CTA. Hide or
  replace both when `status !== 'open'` (`missions/[id]/page.tsx`, `MissionFacts.tsx`).
  Original entry:

- **What:** `job_responses`' RLS grants a freelancer read access to their own response rows
  (`freelancer_id = auth.uid()`), but the embedded `job_posts ( title )` join runs under
  `job_posts`' OWN policy: `status = 'open' OR consumer_id = auth.uid()`. A freelancer who
  responded to a post that the consumer has since marked `filled` or that has `expired` is
  neither the consumer nor looking at an `open` post, so the embed returns `title: null` even
  though the response is entirely legitimate and visible.
- **Where it surfaces:** `src/lib/marche/freelancer-dashboard.ts`'s `getFreelancerDashboard` —
  the `ActivityEvent` union types this as `{ kind: 'proposal'; title: string | null }`
  specifically because of this gap, and the Activité récente panel renders the row without its
  secondary line rather than a fake or empty-string title.
- **Not fixed here:** would need a new `job_posts` SELECT policy (e.g. "or the caller has a
  `job_responses` row for this post") — a schema/RLS change, and this PR is explicitly "no
  migration."
- **Trigger:** the first time a freelancer notices a proposal activity row with a blank second
  line for a mission they actually responded to — add the widening policy to `job_posts` (mirror
  the "post owner and responder read responses" shape already used on `job_responses` itself,
  20260603182702).

## Same-cycle precedent, closed decision, don't re-litigate: `job_post_skills` is publicly readable

- Related gap in the same table family, already logged above at line ~2785 ("`job_post_skills` is
  publicly readable — a direct query (not through `job_posts`) would leak skills off posts the
  caller can't read"). H4's Missions récentes match query goes `freelancer_skills` →
  `job_post_skills` → `job_posts`, filtering `job_posts` explicitly to `status = 'open' AND
  admin_hidden_at IS NULL` before ever showing a title, so it does not hit that leak — noted here
  only so the two `job_post_skills`-adjacent gaps aren't confused with each other later.
