/**
 * Service taxonomy invariants added by H6 PR-2 (founder rulings 2026-10-23):
 *   • every skill carries a stable id (stored in service_listings.tags), and one id never means two
 *     different skills — a recurring skill keeps the same id AND labels in every pool;
 *   • « Photographie & retouche produit » sits under design-graphique-logo (92 subcategories), with
 *     the slug the categories row was inserted under (migration 20261023212933).
 */

import { describe, it, expect } from 'vitest'
import { findSkillByLabel, getSkill, getSubcategory, serviceCategories } from '@/lib/taxonomy/service-categories'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

describe('skill ids', () => {
  const all = serviceCategories.flatMap((s) => s.skills.map((skill) => ({ sector: s.id, ...skill })))

  it('every skill has a slug-shaped id', () => {
    for (const skill of all) expect(skill.id, `${skill.sector}: ${skill.labelFr}`).toMatch(SLUG)
  })

  it('one id never names two different skills', () => {
    const byId = new Map<string, { labelFr: string; labelAr: string }>()
    for (const skill of all) {
      const seen = byId.get(skill.id)
      if (seen) expect({ labelFr: skill.labelFr, labelAr: skill.labelAr }, skill.id).toEqual(seen)
      else byId.set(skill.id, { labelFr: skill.labelFr, labelAr: skill.labelAr })
    }
  })

  it('ids are unique within a sector pool', () => {
    for (const s of serviceCategories) {
      const ids = s.skills.map((k) => k.id)
      expect(new Set(ids).size, s.id).toBe(ids.length)
    }
  })

  it('resolves every id, and every FR/AR label back to its id within its own sector', () => {
    for (const skill of all) {
      expect(getSkill(skill.id)?.labelFr).toBe(skill.labelFr)
      expect(findSkillByLabel(skill.labelFr, skill.sector)?.id, `${skill.sector}: ${skill.labelFr}`).toBe(skill.id)
      expect(findSkillByLabel(skill.labelAr, skill.sector)?.id, `${skill.sector}: ${skill.labelAr}`).toBe(skill.id)
    }
  })

  it('only the known pair of different skills shares a label (a new one must be a conscious choice)', () => {
    const fold = (s: string) => s.trim().toLocaleLowerCase('fr')
    const idsByLabel = new Map<string, Set<string>>()
    for (const skill of all) {
      for (const label of [skill.labelFr, skill.labelAr]) {
        const ids = idsByLabel.get(fold(label)) ?? new Set<string>()
        ids.add(skill.id)
        idsByLabel.set(fold(label), ids)
      }
    }
    const shared = [...idsByLabel].filter(([, ids]) => ids.size > 1).map(([label, ids]) => [label, [...ids].sort()])
    // « الكتابة الإعلانية » = copywriting (Rédaction) AND copywriting publicitaire (Marketing):
    // findSkillByLabel resolves it from the freelancer's own sector first. Flagged for AR review.
    expect(shared).toEqual([['الكتابة الإعلانية', ['copywriting', 'copywriting-publicitaire']]])
  })
})

describe('photography subcategory', () => {
  it('is a design-graphique-logo subcategory under the migrated slug', () => {
    expect(getSubcategory('design-graphique-logo', 'photographie-retouche-produit')?.labelFr).toBe(
      'Photographie & retouche produit',
    )
  })

  it('keeps 13 sectors and brings subcategories to 92', () => {
    expect(serviceCategories).toHaveLength(13)
    expect(serviceCategories.reduce((n, s) => n + s.subcategories.length, 0)).toBe(92)
  })
})
