// Pure set-diff for reconciling a saved child-table row set (shop_payment_methods.method,
// shop_categories.category_id) against a new selection from the configuration form.
//
// G2 step 2 saves are whole-set replacements, not appends: unchecking a payment method or category
// that was previously saved must delete its row, not just skip re-inserting it. A naive "insert
// what's checked" leaves stale rows behind — this is the fix, isolated so it's testable without a
// live DB (data-integrity logic, must-test per CLAUDE.md).
export function reconcile(
  previous: readonly string[],
  selected: readonly string[],
): { toDelete: string[]; toInsert: string[] } {
  const previousSet = new Set(previous)
  const selectedSet = new Set(selected)
  return {
    toDelete: previous.filter((value) => !selectedSet.has(value)),
    toInsert: [...selectedSet].filter((value) => !previousSet.has(value)),
  }
}
