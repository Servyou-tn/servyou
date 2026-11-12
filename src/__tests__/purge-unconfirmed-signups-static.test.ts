/**
 * Static checks on the audit H1 (1) migration: public.purge_unconfirmed_signups() + its daily pg_cron job.
 *
 * The function DELETEs from auth.users on production every night, so its safety properties are pinned here, read from
 * the migration file itself (found by suffix, so it survives the PENDING_ → <version>_ rename). The live proof (a
 * rolled-back call returns 0, the cron job and grants) is the post-apply check listed in the migration; no live suite.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), 'db', 'migrations')
const files = readdirSync(DIR).filter((f) => f.endsWith('_purge_unconfirmed_signups.sql'))
const source = files.length === 1 ? readFileSync(join(DIR, files[0]), 'utf8') : ''

// The SQL without its comments (every comment here is a whole `--` line or a trailing `-- …`).
const code = source
  .split('\n')
  .map((line) => line.replace(/--.*$/, ''))
  .join('\n')
const fnBody = code.slice(code.indexOf('create or replace function public.purge_unconfirmed_signups()'), code.indexOf('$$;') + 3)

// The conditions of the candidate WHERE, one per line, from `where u.email_confirmed_at is null` to `stop`. Returns
// null unless every line after the first is a top-level `and …` — so an added `or`, or a clause moved elsewhere, fails.
function whereConditions(text: string, stop: string): string[] | null {
  const start = text.indexOf('where u.email_confirmed_at is null')
  const end = text.indexOf(stop, start)
  if (start === -1 || end === -1) return null
  const lines = text
    .slice(start, end)
    .split('\n')
    .map((l) => l.trim().replace(/;$/, ''))
    .filter(Boolean)
  if (!lines.slice(1).every((l) => l.startsWith('and '))) return null
  return lines.map((l) => l.replace(/^(where|and) /, ''))
}

// The dry-run block in the comments, with the comment markers stripped.
const dryRun = source
  .slice(source.indexOf('-- Dry run'), source.indexOf('-- Post-apply verification'))
  .split('\n')
  .map((line) => line.replace(/^--\s?/, ''))
  .join('\n')

describe('purge_unconfirmed_signups migration (audit H1)', () => {
  it('exists exactly once (PENDING_ or recorded name)', () => {
    expect(files).toHaveLength(1)
  })

  it('enables pg_cron the documented Supabase way', () => {
    expect(code).toMatch(/create extension if not exists pg_cron with schema pg_catalog;/)
  })

  it('is create-or-replace, SECURITY DEFINER, with an empty search_path', () => {
    expect(fnBody.startsWith('create or replace function')).toBe(true)
    expect(fnBody).toMatch(/security definer/)
    expect(fnBody).toMatch(/set search_path = ''/)
    expect(fnBody).toMatch(/returns integer/)
  })

  it('deletes only unconfirmed sign-ups older than 24 h, keyed on created_at (never confirmation_sent_at)', () => {
    const conditions = whereConditions(fnBody, 'order by')
    expect(conditions).not.toBeNull()
    expect(conditions?.[0]).toBe('u.email_confirmed_at is null')
    expect(conditions).toContain("u.created_at < now() - interval '24 hours'")
    // The delete itself re-checks confirmation, so an account confirmed since the SELECT is kept.
    expect(fnBody).toContain('delete from auth.users u where u.id = v_id and u.email_confirmed_at is null;')
    // A resend refreshes confirmation_sent_at: keying on it would let an attacker keep a squatted account alive.
    expect(fnBody).not.toMatch(/confirmation_sent_at/)
  })

  it.each([
    ['owns a shop (the brief)', 'public.shops s where s.owner_id = u.id'],
    ['owns a freelancer profile (the brief; protects the demo accounts)', 'public.freelancer_profiles f where f.profile_id = u.id'],
    ['is a buyer or seller on an order (transactions are preserved)', 'public.orders o where o.buyer_id = u.id or o.seller_id = u.id'],
    ['owns a job post (its cascade deletes other freelancers’ proposals)', 'public.job_posts j where j.consumer_id = u.id'],
    ['sent a proposal', 'public.job_responses r where r.freelancer_id = u.id'],
    ['filed a report', 'public.reports rp where rp.reporter_id = u.id'],
    ['is an admin', 'public.profiles p where p.id = u.id and p.is_admin'],
    ['is referenced by admin_audit_log (RESTRICT)', 'public.admin_audit_log a where a.admin_id = u.id'],
    ['processed a data export (NO ACTION)', 'public.data_exports de where de.processed_by = u.id'],
    ['processed a deletion request (NO ACTION)', 'public.deletion_requests dr where dr.processed_by = u.id'],
  ])('never deletes a user who %s (a top-level AND of the candidate WHERE)', (_label, clause) => {
    expect(whereConditions(fnBody, 'order by')).toContain(`not exists (select 1 from ${clause})`)
  })

  it.each([
    ['anonymous', 'not u.is_anonymous'],
    ['confirmed by phone', 'u.phone_confirmed_at is null'],
    ['invited by staff', 'u.invited_at is null'],
    ['an SSO user', 'not u.is_sso_user'],
  ])('never deletes a user who is %s', (_label, condition) => {
    expect(whereConditions(fnBody, 'order by')).toContain(condition)
  })

  it('the dry-run SELECT in the comments uses exactly the same conditions as the function', () => {
    const dry = whereConditions(dryRun, ';')
    expect(dry?.length).toBeGreaterThan(15)
    expect(dry).toEqual(whereConditions(fnBody, 'order by'))
  })

  it('deletes row by row: one refused row is kept and logged, never aborting the run; at most 5000 a night', () => {
    expect(fnBody).toMatch(/for v_id in\s+select u\.id/)
    expect(fnBody).toMatch(/limit 5000\s+loop/)
    expect(fnBody).toMatch(/exception when others then\s+raise warning 'purge_unconfirmed_signups: kept user % \(% %\)', v_id, sqlstate, sqlerrm;/)
  })

  it('is executable by its owner only (revoked from PUBLIC, anon, authenticated, service_role) and never granted', () => {
    expect(code).toContain('revoke execute on function public.purge_unconfirmed_signups() from public, anon, authenticated, service_role;')
    expect(code).not.toMatch(/grant execute on function public\.purge_unconfirmed_signups/)
    // The only grants are the documented pg_cron ones, to postgres.
    for (const grant of code.match(/^grant .*$/gm) ?? []) expect(grant).toMatch(/ to postgres;$/)
  })

  it('schedules one named daily job at 03:17 UTC that calls the function', () => {
    expect(code).toContain(
      "select cron.schedule('purge-unconfirmed-signups', '17 3 * * *', $$select public.purge_unconfirmed_signups()$$);",
    )
  })
})
