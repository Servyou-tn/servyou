// Skill matching for the proposal form (D-H12-4). job_post_skills.skill and freelancer_skills.skill are both FREE TEXT,
// so « Next.js » and « next.js » or « Rédaction » and « redaction » are the same skill typed twice. Matching is accent-
// and case-insensitive; what is STORED keeps the spelling of the item it matched (the post's, for a required skill).
//
// Pure — no I/O — so the form (client) and the server action (the real check) run the same code.

/** Lower-case, accent-stripped, whitespace-collapsed key. */
export function skillKey(skill: string): string {
  return skill
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Trim, drop blanks, and keep the first spelling of each skill (accent/case-insensitive). */
export function uniqueSkills(skills: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of skills) {
    const trimmed = s.trim()
    const key = skillKey(trimmed)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

/**
 * The picker's pre-selection and sections: the post's required skills the freelancer already has (stored with the POST's
 * spelling), and the rest of the freelancer's own skills.
 */
export function splitSkills(
  required: readonly string[],
  mine: readonly string[],
): { required: string[]; others: string[]; preselected: string[] } {
  const req = uniqueSkills(required)
  const own = uniqueSkills(mine)
  const ownKeys = new Set(own.map(skillKey))
  const reqKeys = new Set(req.map(skillKey))
  return {
    required: req,
    others: own.filter((s) => !reqKeys.has(skillKey(s))),
    preselected: req.filter((s) => ownKeys.has(skillKey(s))),
  }
}

/**
 * Server-side: keep only skills inside the allowed pool (post skills ∪ the freelancer's own), canonicalised to the pool's
 * spelling and de-duplicated. `rejected` is what was outside the pool — the action refuses the whole submit when it is
 * not empty, rather than quietly dropping what the freelancer chose.
 */
export function canonicalizeSkills(
  chosen: readonly string[],
  required: readonly string[],
  mine: readonly string[],
): { accepted: string[]; rejected: string[] } {
  const pool = new Map<string, string>()
  for (const s of [...uniqueSkills(required), ...uniqueSkills(mine)]) if (!pool.has(skillKey(s))) pool.set(skillKey(s), s)
  const accepted: string[] = []
  const rejected: string[] = []
  const seen = new Set<string>()
  for (const raw of chosen) {
    const key = skillKey(raw)
    if (!key) continue
    const canonical = pool.get(key)
    if (!canonical) {
      rejected.push(raw)
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    accepted.push(canonical)
  }
  return { accepted, rejected }
}
