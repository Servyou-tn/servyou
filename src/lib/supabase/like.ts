// An EXACT, case-insensitive name match through PostgREST's `ilike` (pre-launch audit pass 2).
//
// `ilike('name', name)` treats the user's text as a PATTERN: `%` and `_` are SQL wildcards and PostgREST also turns
// `*` into `%`. A shop named `_` or `*` therefore « collided » with other shops (a false « nom déjà pris »), or matched
// several rows and errored. So: escape the SQL wildcards, fetch a few candidates, and keep only a true
// case-insensitive equality. `*` cannot be escaped reliably through PostgREST, so a name containing it can only widen
// the candidate set — never produce a false positive. The database's lower(name) unique index stays the authority
// (23505 → the same « nom déjà pris »).

export const LIKE_CANDIDATE_LIMIT = 20

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}

export function sameNameIgnoringCase(a: string, b: string): boolean {
  return a.toLocaleLowerCase('fr') === b.toLocaleLowerCase('fr')
}
