import { it } from 'vitest'
import { fr } from './fr'
import { frPlurals } from './plurals'
import { en, enPlurals } from './en'
import { enOwnerOf } from './en/ownership'

// English coverage report — always passes, prints what is left. Run it by path:
//   npx vitest run src/lib/i18n/en.coverage.test.ts --silent=false --reporter=verbose                       → counts per owner
//   EN_OWNER=freelancer npx vitest run src/lib/i18n/en.coverage.test.ts --silent=false --reporter=verbose   → + every missing key of that owner
// (PowerShell: $env:EN_OWNER="freelancer"; then the same command)
it('English coverage', () => {
  const rows: Record<string, { total: number; done: number; missing: string[] }> = {}
  const add = (key: string, done: boolean, plural: boolean) => {
    const owner = enOwnerOf(key)
    const r = (rows[owner] ??= { total: 0, done: 0, missing: [] })
    r.total++
    if (done) r.done++
    else r.missing.push(plural ? `${key} (plural)` : key)
  }
  for (const key of Object.keys(fr)) add(key, key in en, false)
  for (const key of Object.keys(frPlurals)) add(key, key in enPlurals, true)
  const lines = Object.entries(rows).map(([o, r]) => `${o.padEnd(11)} ${String(r.done).padStart(5)} / ${r.total}  (${Math.round((100 * r.done) / r.total)} %)`)
  console.log('\nEnglish coverage\n' + lines.join('\n'))
  const only = process.env.EN_OWNER
  if (only && rows[only]) console.log(`\nMissing for ${only} (${rows[only].missing.length}):\n` + rows[only].missing.join('\n'))
})
