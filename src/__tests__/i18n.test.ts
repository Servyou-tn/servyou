/**
 * Unit tests for the t() helper and fr dictionary.
 *
 * These are pure unit tests — no DB, no Supabase, no browser.
 * Run: npx vitest run src/__tests__/i18n.test.ts
 */

import { describe, it, expect } from 'vitest'
import { t } from '@/lib/i18n'

describe('t() — known keys', () => {
  it('returns the French string for a known key', () => {
    expect(t('nav.profile', 'fr')).toBe('Mon profil')
  })

  it('defaults to fr when lang is omitted', () => {
    expect(t('nav.logout')).toBe('Déconnexion')
  })

  it('ar falls back to the French string (no ar.ts yet)', () => {
    expect(t('nav.profile', 'ar')).toBe('Mon profil')
  })

  it('returns the correct value for a common key', () => {
    expect(t('common.error_generic', 'fr')).toBe('Une erreur est survenue. Veuillez réessayer.')
  })

  it('returns the correct value for a login key', () => {
    expect(t('login.title', 'fr')).toBe('Connexion')
  })

  it('returns the correct value for a missions key', () => {
    expect(t('missions.title', 'fr')).toBe('Tableau des missions')
  })
})

describe('t() — missing keys', () => {
  it('returns the raw key when the key is not in the dictionary', () => {
    expect(t('nonexistent.key', 'fr')).toBe('nonexistent.key')
  })

  it('returns the raw key for ar too (no ar.ts, falls back to fr, key missing)', () => {
    expect(t('totally.unknown', 'ar')).toBe('totally.unknown')
  })
})

describe('t() — interpolation', () => {
  it('replaces {n} with the provided value', () => {
    const result = t('respond.error_cap_active', 'fr', { n: 5 })
    expect(result).toBe('Vous avez atteint le maximum de 5 réponses actives.')
  })

  it('replaces {n} in the cap_active_full message', () => {
    const result = t('respond.cap_active_full', 'fr', { n: 3 })
    expect(result).toContain('3 réponses actives')
  })

  it('leaves unreferenced placeholders unchanged', () => {
    const result = t('respond.error_cap_active', 'fr', { n: 5, unused: 'x' })
    expect(result).toBe('Vous avez atteint le maximum de 5 réponses actives.')
  })

  it('leaves {n} literal when no vars are passed', () => {
    const result = t('respond.error_cap_active', 'fr')
    expect(result).toContain('{n}')
  })
})
