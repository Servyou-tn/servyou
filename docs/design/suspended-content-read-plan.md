# Plan — hide a suspended account's public content (founder ruling 7, read half)

Status: **PLAN ONLY, no SQL yet** (ruling 7, 2026-10-28: "big change, review first"). Branch `fix/security-followups-batch-2`.
The write half, "no new orders or responses aimed at a suspended account", is in that branch's PENDING files.

## What is live today (verified read-only, 2026-10-28)

- `profiles.suspended_at` is read by:
  - `is_active_user()`: the caller only (migration 61's write guard);
  - `enforce_job_responder_capability` (migration 59);
  - after batch 2, also the order / response guards and `get_contact_phone`.
- **0 SELECT policies read it**: a suspended account's shop, products, listings, freelancer profile and job posts stay public.
- 0 suspended accounts today, so nothing would disappear at apply.
- Each child table already delegates to its parent's policy, so only the **5 root policies** decide public visibility.

  | Root policy (public branch) | Children that follow it automatically |
  |---|---|
  | `shops` « Shops readable when live, or by owner, buyer, or admin » | `shop_categories`, `shop_payment_methods` |
  | `products` « Products readable when live, … » (its own `EXISTS shops` branch) | `product_images` |
  | `freelancer_profiles` « Freelancer profiles readable when live, … » | skills, tools, education, certifications, languages, links, portfolio |
  | `service_listings` « Services readable when live, … » (its own `EXISTS freelancer_profiles` branch) | — |
  | `job_posts` « Open posts or own posts readable » | `job_post_skills` |

## Options

**A — a helper in the 5 public branches (recommended).**

```sql
public.is_account_active(p_account uuid) returns boolean  -- SECURITY DEFINER, STABLE, search_path ''
  -- not exists (select 1 from public.profiles where id = p_account and suspended_at is not null)
```

- The helper is added only to each policy's public branch, for example
  `(admin_hidden_at is null and public.is_account_active(owner_id))` on `shops`. The owner, admin and past-buyer
  branches are unchanged: an owner still sees their own content, and a buyer still sees their orders' shop.
- `products` and `service_listings` put it inside their parent `EXISTS` (`s.owner_id` / `fp.profile_id`).
- P2-2: a policy helper is checked against the caller's EXECUTE, so it needs `grant execute … to anon, authenticated`.
  Leaving that grant out turns every anonymous marketplace read into 42501.
- Unsuspending restores visibility immediately, with no stored state.
- Cost: one profiles primary-key lookup per candidate row on public lists. The argument is per-row, so the initplan
  can't hoist it. Fine at today's scale (10 freelancer profiles, 1 shop, 8 posts). Check `EXPLAIN` on `/marche/*`
  and `/recherche` before apply.

**B — `admin_suspend_user` stamps `admin_hidden_at` on the account's content.** This reuses every existing filter, but:

- it conflates suspension with content moderation;
- unsuspending must restore only what suspension stamped, which needs a marker column or a reason convention;
- it is lost if an admin unhides an item by hand.

Rejected.

**C — a denormalised `owner_suspended_at` on each root table, kept by a trigger on `profiles`.** It is fast to read,
but it adds 5 columns and a fan-out trigger to keep consistent. It is only worth it if A's cost shows up in `EXPLAIN`.

## Decisions for the founder

1. Option A? (recommended)
2. Should `public_profiles` also hide a suspended account (name and city), the same way as a moderated seller in batch
   2? Same consequence: past orders show the "no name" fallback.
3. App side: no change is required. The app's `!inner` embeds already drop rows that RLS hides. Pages that 404 on a
   missing shop or profile (`/boutique/[id]`, `/freelance/[id]`) then 404 for a suspended account, which matches the
   intent.

## Test plan (live-DB, when the SQL is written)

- Suspend a fixture seller and a fixture poster through the service role, then check:
  - anon and another user no longer list the shop, products, images, service listings, freelancer profile, children,
    job post or post skills;
  - the owner still reads all of them;
  - a past buyer still reads the shop and listing of their order;
  - an admin reads everything.
- Unsuspend, and everything is back with no write in between.
- Anon reads of `/marche` shapes keep working: proves the helper's EXECUTE grant.
