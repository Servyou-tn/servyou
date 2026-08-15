export type LanguageEntry = { language: string; proficiency: string }

// Composite-key diff for freelancer_languages, NOT a reuse of shops/reconcile.ts.
//
// reconcile.ts diffs on a single scalar identity (shop_payment_methods.method,
// shop_categories.category_id) — the row IS the value. A language row is (language, proficiency);
// keying on `language` alone (reconcile.ts's shape) would make a niveau-only change invisible: rows
// previous=[{fr,natif}] selected=[{fr,courant}] have the SAME language set, so reconcile() would
// return {toDelete: [], toInsert: []} and the edit silently vanishes. Keying on the composite
// `language|proficiency` instead makes that edit a real delete+insert.
//
// UNIQUE (freelancer_profile_id, language) means the caller MUST apply toDelete before toInsert —
// inserting the new (fr, courant) row before deleting the old (fr, natif) one collides on the
// still-present (profile_id, 'fr') unique key (23505).
export function diffLanguages(
  previous: readonly LanguageEntry[],
  selected: readonly LanguageEntry[],
): { toDelete: string[]; toInsert: LanguageEntry[] } {
  const key = (e: LanguageEntry) => `${e.language}|${e.proficiency}`
  const previousKeys = new Set(previous.map(key))

  // Dedupe by full (language, proficiency) key — mirrors reconcile.ts's own defensive dedupe of
  // its selected set. Two selected rows for the SAME language with DIFFERENT proficiency are not
  // deduped here (that is a UI bug, not a double-submit): both would generate an insert and the
  // second collides on UNIQUE (freelancer_profile_id, language) at the DB layer, which is the
  // right place for that case to surface loudly rather than be silently resolved here.
  const selectedByKey = new Map(selected.map((e) => [key(e), e]))

  return {
    toDelete: previous.filter((e) => !selectedByKey.has(key(e))).map((e) => e.language),
    toInsert: [...selectedByKey.values()].filter((e) => !previousKeys.has(key(e))),
  }
}
