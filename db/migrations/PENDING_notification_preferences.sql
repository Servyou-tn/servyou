-- notification_preferences: the account's e-mail notification choices (Paramètres › Notifications).
-- Founder brief (2026-10-28), Figma 558:38878 « Paramètres — shop_owner (Notifications) » (read via fig.mjs dump,
-- 2026-10-28): panel « E-mails », six Setting Rows -- five toggles + « Alertes de sécurité » (ToggleLocked, ON).
-- Standards-reference Section 3 A01; P2-1 (explicit grants on a new table).
--
-- Live before this migration (verified 2026-10-28): no table, column or function stores any notification
-- preference; the Notifications tab is a PlaceholderTab.
--
-- Design (brief):
--   * a separate table keyed on profiles(id) -- not columns on profiles (whose grants are already column-level);
--   * one boolean per stored row of the frame. « Alertes de sécurité » is always on and NOT stored; « Notifications
--     sur la plateforme » (Bientôt disponible) stores nothing;
--   * NO ROW = ALL DEFAULTS: readers coalesce a missing row to the column defaults below; the app upserts on first
--     save. Nothing is backfilled (no row is created for existing accounts);
--   * which rows each role sees is UI work, not DB: every column exists for every account;
--   * owner-only SELECT / INSERT / UPDATE; no DELETE (preferences are reset by saving defaults; the row goes with
--     the account through ON DELETE CASCADE); no admin bypass; nothing for anon.
--
-- Defaults are the brief's. NOTE: Figma draws « Alerte stock faible » OFF (with « Newsletter » OFF; the other
-- three ON), the brief says email_low_stock default true -- decision 1 of the report; the brief is followed here.
--
-- Grants (P2-1: a new public table inherits anon SELECT + authenticated SELECT/INSERT/UPDATE/DELETE from the
-- default privileges -- all revoked, then granted column by column):
--   SELECT: every column. INSERT: profile_id + the five flags (updated_at defaults). UPDATE: profile_id + the five
--   flags -- profile_id is in the UPDATE list only because PostgREST's upsert (ON CONFLICT DO UPDATE) sets every
--   payload column; the UPDATE policy's WITH CHECK (profile_id = auth.uid()) keeps it pinned to the caller.
--   updated_at is never client-written (handle_updated_at on UPDATE, default now() on INSERT).
-- trg_enforce_active_user (migration 61's statement-level guard) is attached like every client-writable table:
-- a suspended account cannot change its preferences.

create table public.notification_preferences (
  profile_id       uuid primary key references public.profiles (id) on delete cascade,
  email_new_orders boolean not null default true,   -- « Nouvelles commandes reçues » (shop) / new service requests (freelancer)
  email_proposals  boolean not null default true,   -- « Propositions reçues sur mes annonces »
  email_reviews    boolean not null default true,   -- « Nouveaux avis clients » (reviews ship later; stored now)
  email_low_stock  boolean not null default true,   -- « Alerte stock faible » (shop only, in the UI)
  email_newsletter boolean not null default false,  -- « Newsletter et actualités Servyou » (opt-in)
  updated_at       timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

comment on table public.notification_preferences is
  'E-mail notification choices, one row per account (Paramètres › Notifications, Figma 558:38878). No row = all column defaults; the app upserts on first save. « Alertes de sécurité » is always on and not stored.';

-- ─── RLS: owner only ───────────────────────────────────────────────────────────────────────────
create policy "Owner reads own notification preferences" on public.notification_preferences
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "Owner creates own notification preferences" on public.notification_preferences
  for insert to authenticated
  with check (profile_id = (select auth.uid()));

create policy "Owner updates own notification preferences" on public.notification_preferences
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ─── grants (P2-1) ─────────────────────────────────────────────────────────────────────────────
revoke all on public.notification_preferences from anon, authenticated;

grant select (profile_id, email_new_orders, email_proposals, email_reviews, email_low_stock, email_newsletter,
              updated_at)
  on public.notification_preferences to authenticated;
grant insert (profile_id, email_new_orders, email_proposals, email_reviews, email_low_stock, email_newsletter)
  on public.notification_preferences to authenticated;
grant update (profile_id, email_new_orders, email_proposals, email_reviews, email_low_stock, email_newsletter)
  on public.notification_preferences to authenticated;

-- ─── triggers ──────────────────────────────────────────────────────────────────────────────────
create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.handle_updated_at();

create trigger trg_enforce_active_user
  before insert or update or delete on public.notification_preferences
  for each statement execute function public.enforce_active_user();

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Lossy once accounts have saved preferences.
--
-- drop table if exists public.notification_preferences;
