/**
 * CI guard (default unit run, no database) for the PGRST201 class fixed in
 * fix/pgrst201-category-embeds.
 *
 * service_listings has two FKs to categories (category_id, subcategory_id), so a bare
 * `categories(...)` embed reached through service_listings is ambiguous and PostgREST fails the
 * whole request with HTTP 300. The live proof (category-embeds-unambiguous.test.ts) is an
 * integration suite that CI never runs, so this file covers the two ways it could silently rot:
 *   1. drift — every select it replays must still appear verbatim in its source file;
 *   2. a new unhinted embed — every `.select(...)` string literal in src/ is parsed, and a
 *      `categories(` embed whose parent resource is service_listings must name its FK.
 *
 * The parser is deliberately small: it reads string-literal select arguments, resolves the root
 * table from the nearest preceding `.from('...')`, and tracks embed nesting with a paren stack.
 * Its own behaviour is pinned by the synthetic cases below so the scan cannot pass vacuously.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { CASES } from './category-embed-cases'

const ROOT = resolve(__dirname, '../..')
const SRC = join(ROOT, 'src')
const CATEGORY_FK_HINT = /^!service_listings_(sub)?category_id_fkey$/

const normalise = (s: string) => s.replace(/\r\n/g, '\n')

interface Violation {
  parent: string
  embed: string
}

// Embeds of `categories` whose parent resource is service_listings and that carry no FK hint.
// Also returns how many hinted ones it saw, so callers can prove the scan is not vacuous.
function scanSelect(root: string, select: string): { unhinted: Violation[]; hinted: number } {
  const unhinted: Violation[] = []
  let hinted = 0
  const stack: string[] = [root]
  // `alias:name!hint(` opens an embed; `)` closes one. `count` in `orders(count)` is a plain column.
  const token = /(?:\w+\s*:\s*)?(\w+)((?:!\w+)*)\s*\(|\)/g
  for (const m of select.matchAll(token)) {
    if (m[0] === ')') {
      if (stack.length > 1) stack.pop()
      continue
    }
    const [, name, hints] = m
    const parent = stack[stack.length - 1]
    if (name === 'categories' && parent === 'service_listings') {
      const hasFkHint = (hints.match(/!\w+/g) ?? []).some((h) => CATEGORY_FK_HINT.test(h))
      if (hasFkHint) hinted++
      else unhinted.push({ parent, embed: m[0] })
    }
    stack.push(name)
  }
  return { unhinted, hinted }
}

interface SelectCall {
  file: string
  line: number
  root: string
  select: string
}

// Every `.select(<string literal>` in a source file, with the table of the nearest preceding
// `.from('...')`. Selects whose argument is not a literal are skipped (none embed categories today).
function selectCalls(file: string, text: string): SelectCall[] {
  const calls: SelectCall[] = []
  const select = /\.select\(\s*(['"`])/g
  for (const m of text.matchAll(select)) {
    const quote = m[1]
    const start = m.index! + m[0].length
    const end = text.indexOf(quote, start)
    if (end === -1) continue
    const before = text.slice(0, m.index)
    const froms = [...before.matchAll(/\.from\(\s*['"`](\w+)['"`]\s*\)/g)]
    const root = froms.length > 0 ? froms[froms.length - 1][1] : ''
    calls.push({
      file,
      line: before.split('\n').length,
      root,
      select: text.slice(start, end),
    })
  }
  return calls
}

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue
      out.push(...sourceFiles(p))
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      out.push(p)
    }
  }
  return out
}

describe('scanSelect (parser self-test)', () => {
  it('flags a bare categories embed directly on service_listings', () => {
    expect(scanSelect('service_listings', 'id, categories(name_fr)').unhinted).toHaveLength(1)
    expect(scanSelect('service_listings', 'id, categories ( name_fr )').unhinted).toHaveLength(1)
  })

  it('flags a bare categories embed nested under service_listings', () => {
    const select = 'id, products ( categories ( name_fr ) ), service_listings ( title, categories ( name_fr ) )'
    const { unhinted } = scanSelect('orders', select)
    expect(unhinted).toHaveLength(1)
    expect(unhinted[0].parent).toBe('service_listings')
  })

  it('does not treat !inner as a disambiguating hint', () => {
    expect(scanSelect('service_listings', 'id, categories!inner(slug)').unhinted).toHaveLength(1)
  })

  it('accepts the FK hint, aliases, and bare categories under single-FK parents', () => {
    expect(scanSelect('service_listings', 'id, categories!service_listings_category_id_fkey(name_fr)')).toEqual({
      unhinted: [],
      hinted: 1,
    })
    expect(scanSelect('service_listings', 'sub:categories!service_listings_subcategory_id_fkey(name_fr)').hinted).toBe(1)
    expect(scanSelect('products', 'id, categories ( name_fr ), shops ( name )').unhinted).toEqual([])
    expect(scanSelect('service_listings', 'id, all_orders:orders(count), categories!service_listings_category_id_fkey(slug)').unhinted).toEqual([])
  })
})

describe('categories embeds through service_listings', () => {
  it.each(CASES.map((c) => [c.site, c] as const))('%s: replayed select still exists in its source file', (_site, c) => {
    const source = normalise(readFileSync(join(ROOT, c.file), 'utf8'))
    expect(source.includes(normalise(c.select))).toBe(true)
  })

  it('no select string in src/ embeds categories through service_listings without an FK hint', () => {
    const offenders: string[] = []
    let hinted = 0
    for (const path of sourceFiles(SRC)) {
      const text = normalise(readFileSync(path, 'utf8'))
      if (!text.includes('.select(')) continue
      for (const call of selectCalls(relative(ROOT, path).replace(/\\/g, '/'), text)) {
        const result = scanSelect(call.root, call.select)
        hinted += result.hinted
        for (const v of result.unhinted) offenders.push(`${call.file}:${call.line} ${v.embed.trim()}`)
      }
    }
    expect(offenders).toEqual([])
    // Non-vacuous: the scan must actually reach the hinted embeds the live suite replays.
    expect(hinted).toBeGreaterThanOrEqual(CASES.length)
  })
})
