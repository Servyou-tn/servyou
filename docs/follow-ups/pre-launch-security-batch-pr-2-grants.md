# Pre-launch security batch PR-2 — grants (`fix/prelaunch-acl-hardening`, 2026-10-26)

## LOW — `deletion_requests.reason` is unbounded text

- Any length is accepted. Consistent with the founder ruling that caps live in app limits, but the DB does not
  enforce one. **Fix if wanted:** `CHECK (char_length(reason) <= 1000)` (NOT VALID if a row ever violates).

## LOW — advisor residue left on purpose

- Still reported after migration 68, deliberately: 0010 `public_profiles` (an intentional SECURITY DEFINER
  view — its column list is the protection), 0014 `unaccent` installed in `public` (moving it breaks the
  generated `search_vector` columns), leaked-password protection (HIBP, an Auth setting), 0008
  `uploaded_objects` (RLS on, no policy, no client grant — by design).
- `supabase_admin`'s own default privileges in `public` still grant everything to anon / authenticated; they
  cannot be altered as `postgres`. Only a table or function created by `supabase_admin` (platform tooling)
  would inherit them.
