-- Shop social links: three nullable columns on public.shops — facebook_url, instagram_url, tiktok_url (founder task,
-- relayed by the architect 2026-11-01; the UI that edits and shows them is a separate PR). Constraint style follows
-- migration 106 (20261030221121_freelancer_url_scheme_checks): one named CHECK per column, NULL allowed, binding every
-- writer, the service role included.
--
-- Rule per column (as ruled):
--   * https only (`~*`: the scheme and host are case-insensitive, like a browser);
--   * the host is the platform's, exactly — Facebook: facebook.com, www.facebook.com, m.facebook.com, fb.com,
--     www.fb.com; Instagram: instagram.com, www.instagram.com; TikTok: tiktok.com, www.tiktok.com. No other subdomain,
--     no port, no trailing dot;
--   * no userinfo: the host must come straight after `https://` and be followed by `/`, `?`, `#` or the end, so
--     `https://facebook.com@evil.io` (opens evil.io) and `https://user@facebook.com` are refused;
--   * after the host: no ASCII control character, no space, no backslash (a browser reads `\` as `/`);
--   * at most 300 characters (char_length — code points).
-- '' is refused (not a URL); the app stores a cleared field as NULL. The same patterns, character for character, live in
-- src/lib/shops/social-links.ts (SHOP_SOCIAL_URL_PATTERNS) — social-links.test.ts fails if this file and that module
-- drift, and runs the case table checked against this database on 2026-11-01.
--
-- Grants:
--   * SELECT is column-granted on shops since migration 96 (20261028205833): without this grant, every client read
--     naming a new column — the public shop page included — fails 42501. Same audience as the other public shop
--     columns: anon and authenticated. Not a write, so db/client-write-allowlist.json is unchanged by it.
--   * UPDATE: none needed. authenticated holds table-level UPDATE on shops (allow-list `"UPDATE": "*"`, RLS scopes it
--     to the owner), which covers new columns — the way updateShopAction writes name / city / description today. An
--     explicit column UPDATE grant would add a column ACL entry that the live allow-list check
--     (client-write-grants-live.test.ts) reports as unlisted, and the allow-list cannot hold "*" and columns at once.
--   * INSERT stays column-granted and does NOT include these columns: shop creation does not set them; the owner adds
--     them from the edit page (UPDATE).
--
-- Live on 2026-11-01: shops holds 1 row; the new columns are created NULL, so every constraint validates without a
-- backfill. Existing CHECKs on shops: moderation reason, delivery_setup, shop_type — untouched.

alter table public.shops
  add column facebook_url  text,
  add column instagram_url text,
  add column tiktok_url    text;

alter table public.shops
  add constraint shops_facebook_url_valid
  check (facebook_url is null or (
    char_length(facebook_url) <= 300
    and facebook_url ~* '^https://((www\.|m\.)?facebook\.com|(www\.)?fb\.com)([/?#][^\x01-\x20\x7f\\]*)?$'
  ));

alter table public.shops
  add constraint shops_instagram_url_valid
  check (instagram_url is null or (
    char_length(instagram_url) <= 300
    and instagram_url ~* '^https://(www\.)?instagram\.com([/?#][^\x01-\x20\x7f\\]*)?$'
  ));

alter table public.shops
  add constraint shops_tiktok_url_valid
  check (tiktok_url is null or (
    char_length(tiktok_url) <= 300
    and tiktok_url ~* '^https://(www\.)?tiktok\.com([/?#][^\x01-\x20\x7f\\]*)?$'
  ));

grant select (facebook_url, instagram_url, tiktok_url) on public.shops to anon, authenticated;

-- Post-apply verification:
--   1. select conname, convalidated from pg_constraint where conrelid = 'public.shops'::regclass
--        and conname like 'shops\_%\_url\_valid' escape '\';  → 3 rows, convalidated = true.
--   2. select grantee, privilege_type, column_name from information_schema.column_privileges
--        where table_schema = 'public' and table_name = 'shops'
--          and column_name in ('facebook_url', 'instagram_url', 'tiktok_url') and grantee in ('anon', 'authenticated');
--      → SELECT for anon and authenticated; UPDATE for authenticated (from the table-level grant); no INSERT.
--   3. src/__tests__/client-write-grants-live.test.ts: green, allow-list unchanged.
--   4. src/__tests__/shop-social-links-live.test.ts (1 sign-in): the owner's REST update of each refused case is
--      refused 23514 naming the constraint, the accepted cases and NULL pass, anon reads the columns, the service role
--      is bound too.
--
-- Rollback:
--   alter table public.shops drop column facebook_url, drop column instagram_url, drop column tiktok_url;
--   (dropping a column drops its CHECK and its column grants.)
