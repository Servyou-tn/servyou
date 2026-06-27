---
name: servyou-i18n-vocabulary-lock
description: |
  Use this skill ANY time the work involves user-visible text, labels, translations, internationalization, or bilingual content. MUST trigger when the user mentions: "i18n", "translation", "translate", "FR", "AR", "French", "Arabic", "fr.ts", "ar.ts", "string", "label", "placeholder", "helper text", "error message", "success message", "toast", "alert", "button label", "menu item", "page title", "heading", "subtitle", "tab name", "filter label", "sidebar item", "navbar item", "t() call", "t('...')", "useTranslations", "vocabulary", "wording", "copy", "microcopy", "UX copy", "RTL", "right-to-left", "bilingual", "Tunisia", "Tunisian Dinar", "TND", "د.ت", "Dinar", "language toggle", "language switch", "locale". ALSO trigger when CC adds a NEW key to fr.ts or ar.ts, when CC writes any string in JSX between tags or in alt/placeholder/aria-label, when CC writes a Zod error message or form validator message, when CC writes a date or currency format, or when CC encounters a hardcoded string in a component. If you find yourself typing a French OR English OR Arabic word inside a .tsx file that the user will see — this skill applies. ALWAYS trigger when modifying a sidebar, topbar, page header, form, status pill, badge, or any user-facing component.
---

# Servyou i18n + Vocabulary Lock

Servyou is FR-first with full AR parity. Every visible string lives in both `src/lib/i18n/fr.ts` and `src/lib/i18n/ar.ts`. Translations are NOT independent decisions — they're locked in the design system reference Section 6. The Arabic content is what makes Servyou trustworthy to non-French-fluent Tunisians; broken Arabic = collapsed trust pillar.

## The 5-step i18n loop

For every change involving user-visible text:

**Step 1 — Never hardcode strings in JSX.** Every visible string goes through `t('namespace.key.path')`. If you write `<Button>Save</Button>` or `placeholder="Search..."` — STOP. Convert to `t('common.save')` / `t('common.search_placeholder')`.

**Step 2 — Reuse the locked vocabulary before inventing keys.** Before adding a new translation key, check design system reference `servyou-design-system-reference-v1.md` Section 6. The platform has locked French translations for: sidebar items (6.1), status labels (6.2), action labels (6.3), empty states (6.4). Use those exactly. Do not invent synonyms.

**Step 3 — Add FR + AR keys atomically in the same commit.** Every new key gets BOTH translations in the SAME commit. The CI parity check (when ready) will fail builds otherwise. Until CI checks, you self-enforce:
```typescript
// fr.ts
'freelance.services.empty.title': 'Aucun service pour l\'instant',

// ar.ts
'freelance.services.empty.title': 'لا توجد خدمات بعد',
```

**Step 4 — Use Tailwind logical properties for ALL layout.** Servyou flips entire pages to RTL when language is Arabic. Use `ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`, `border-s`, `border-e`. NEVER `pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right`, `border-l`, `border-r`.

**Step 5 — Format dates, numbers, currency per locale.** Use locale-aware formatting:
```typescript
// Date
format(date, 'dd MMMM yyyy', { locale: lang === 'ar' ? ar : fr })

// Currency (Tunisian Dinar)
const formatTND = (amount: number, lang: 'fr' | 'ar') => {
  const formatted = amount.toLocaleString(lang === 'ar' ? 'ar-TN' : 'fr-TN')
  return lang === 'ar' ? `${formatted} د.ت` : `${formatted} TND`
}
```
NEVER `date.toLocaleDateString('fr-FR')` hardcoded — it ignores AR mode (this bug is documented in PR-F2.3.1 report, do not reintroduce).

## Locked vocabulary — must use these exactly

From design system Section 6.1 — sidebar items:

| English | **French (LOCKED)** | **Arabic (LOCKED)** |
|---|---|---|
| Dashboard | **Tableau de bord** | **لوحة التحكم** |
| My Profile | **Mon profil** | **ملفي الشخصي** |
| Services | **Mes services** | **خدماتي** |
| Projects | **Mes engagements** ⚠️ NOT "Projets" | **المهام الجارية** |
| Proposals | **Mes propositions** | **عروضي** |
| Earnings | **Mes revenus** | **أرباحي** |
| Reviews | **Avis clients** | **تقييماتي** |
| Messages | **Messages** | **الرسائل** |
| Orders | **Mes commandes** | **مشترياتي** |
| Saved Items | **Mes favoris** | **المحفوظات** |
| Settings | **Paramètres** | **الإعدادات** |

Status pills (Section 6.2) and action labels (Section 6.3) — full tables in the design system doc. Do not translate these independently.

## Red flags — refuse these

❌ **Hardcoded strings in JSX** — `<h1>My Services</h1>`. Use `<h1>{t('freelance.services.heading')}</h1>`.
❌ **Hardcoded English labels** — even temporarily. The platform is FR-first.
❌ **English in French file** — `'common.save': 'Save'`. The value must be French.
❌ **Missing AR parity** — adding to fr.ts without ar.ts. Reject the diff.
❌ **Inventing translations** — "Projets" instead of locked "Mes engagements". Use the design system vocabulary.
❌ **Machine-translated AR** — Google Translate / DeepL output for Arabic UI strings often has grammar errors. If you must use a tool, mark the string for human review (`// REVIEW_AR_TRANSLATION`).
❌ **Directional Tailwind classes** — `pl-4`, `text-left`, `ml-auto`, `border-r`. ALWAYS logical: `ps-4`, `text-start`, `ms-auto`, `border-e`.
❌ **Hardcoded `'fr-FR'` locale in `.toLocaleDateString()` or `.toLocaleString()`** — locale must derive from active language.
❌ **Mixed bidi text without testing** — Arabic text containing English brand names (e.g., "Figma", "WhatsApp") must render correctly. Test both modes.
❌ **Servyou-specific symbols missed in AR** — TND in FR mode but Arabic mode must use `د.ت`. Numbers stay LTR within Arabic text (Tunisian convention).

## Worked example — adding a new component string

❌ **Wrong:**
```tsx
<Button>Save Changes</Button>
```

✅ **Right:**
```tsx
<Button>{t('common.save_changes')}</Button>
```

```typescript
// fr.ts — add atomically with ar.ts
'common.save_changes': 'Enregistrer les modifications',

// ar.ts — same commit
'common.save_changes': 'حفظ التعديلات',
```

## Worked example — formatted date in card

❌ **Wrong:**
```tsx
<span>{new Date(createdAt).toLocaleDateString('fr-FR')}</span>
```

✅ **Right:**
```tsx
import { format } from 'date-fns'
import { fr, ar } from 'date-fns/locale'

<span>
  {format(new Date(createdAt), 'dd MMMM yyyy', {
    locale: language === 'ar' ? ar : fr
  })}
</span>
```

## Worked example — Tunisian Dinar in stat tile

❌ **Wrong:**
```tsx
<p>{amount} TND</p>
```

✅ **Right:**
```tsx
<p>
  {amount.toLocaleString(language === 'ar' ? 'ar-TN' : 'fr-TN')}
  {' '}
  {language === 'ar' ? 'د.ت' : 'TND'}
</p>
```

## Self-check before claiming the PR done

Run this mental checklist:

1. ☐ Every visible string goes through `t()` — no hardcoded JSX text
2. ☐ Every new key has FR value in fr.ts AND AR value in ar.ts — same commit
3. ☐ All vocabulary matches design system Section 6 (no "Projets", uses "Mes engagements")
4. ☐ All Tailwind utilities are logical (`ps-` `pe-` `ms-` `me-` `text-start`)
5. ☐ Dates use `date-fns` with locale, not hardcoded `'fr-FR'`
6. ☐ Currency formats per locale, Dinar = TND in FR mode, د.ت in AR mode
7. ☐ Page tested in BOTH languages — no leakage either way
8. ☐ Special characters in AR (right-to-left override, zero-width joiners) — none accidentally introduced

## Coordination with other skills

- Always pair with `servyou-design-system-compliance` — visual changes have strings
- Pair with `servyou-visual-gate` — Gate 4 of the 6-gate walkthrough tests AR mode

## Reference

- Full vocabulary table: design system reference Section 6
- i18n technical patterns: standards reference Section 4
- Existing keys: `src/lib/i18n/fr.ts` and `src/lib/i18n/ar.ts`
