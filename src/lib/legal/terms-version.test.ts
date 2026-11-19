import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { TERMS_VERSION } from './terms-version'
import { t } from '@/lib/i18n'

// The version step 2 sends must equal the database's private.current_terms_version(), and both are built from the two
// pages' « Mise à jour » dates. When a legal page changes its date, this fails until the constant AND a migration move.
const MONTHS: Record<string, string> = {
  janvier: '01', février: '02', mars: '03', avril: '04', mai: '05', juin: '06',
  juillet: '07', août: '08', septembre: '09', octobre: '10', novembre: '11', décembre: '12',
}
const iso = (frDate: string) => {
  const [day, month, year] = frDate.split(' ')
  return `${year}-${MONTHS[month]}-${day.padStart(2, '0')}`
}

describe('TERMS_VERSION', () => {
  it('is built from the « Mise à jour » dates of /conditions and /confidentialite', () => {
    expect(TERMS_VERSION).toBe(`cgu-${iso(t('legal.updatedDate', 'fr'))}+confidentialite-${iso(t('legal.privacy.updatedDate', 'fr'))}`)
  })

  it('equals the newest private.current_terms_version() in db/migrations', () => {
    const dir = join(process.cwd(), 'db/migrations')
    const latest = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .filter((sql) => sql.includes('function private.current_terms_version()'))
      .pop()
    expect(latest).toBeDefined()
    expect(latest).toContain(`select '${TERMS_VERSION}'::text`)
  })
})
