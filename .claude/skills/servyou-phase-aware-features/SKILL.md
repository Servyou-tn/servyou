---
name: servyou-phase-aware-features
description: |
  Use this skill ANY time CC is about to build a widget, stat tile, dashboard section, chart, table, or feature that displays data from features marked as deferred to a future Servyou phase. MUST trigger when the user mentions or CC encounters: "earnings", "revenu", "wallet", "withdraw", "payout", "balance", "transactions", "rating", "review", "reviews", "stars", "5-star", "verified", "verification badge", "job success", "completion rate", "rank", "top 15%", "leaderboard", "analytics", "views", "clicks", "conversion", "trends", "deltas", "↑ 18%", "from last month", "this month", "earnings overview", "earnings breakdown", "earnings by source", "available balance", "pending balance", "top opportunities", "recently viewed", "performance overview", "proposal analytics", "response rate", "avg response time", "best seller", "sale", "discount", "premium", "upgrade", "billing", "subscription". ALSO trigger when CC is about to render a number that does not yet have a real data source, when CC is about to build a chart, when CC is about to display a stat tile with delta, when CC is reviewing a design that says "[Phase 3]" or "[Phase 4]" or "deferred". If you find yourself writing fake placeholder numbers (e.g., `value={2450}` or `rating={4.9}` in seed/test data that will ship to production) — this skill applies. The job is to PROTECT Servyou from looking broken (fake "0" everywhere) AND from looking dishonest (invented metrics).
---

# Servyou Phase-Aware Features

The agency design shows the FULL Servyou — earnings charts, ratings, reviews, opportunities, analytics. Servyou's actual MVP doesn't have payments (Phase 4), reviews (Phase 3), or recommendation engine (Phase 5) yet. This skill prevents two failure modes:

1. **Fake data leaks** — CC seeds "4.9 rating" or "2,450 TND earnings" that look real but aren't. Users see false trust signals → trust collapse when discovered.
2. **Empty zeros everywhere** — CC honestly renders "0" for every deferred metric. Page looks broken → users bounce.

The fix is **honest deferred placeholders** that match the design's visual language but communicate "coming soon" clearly.

## The phase-aware decision flow

For EVERY widget, stat, chart, or data display:

**Step 1 — Identify the feature's phase.** Check `servyou-design-system-reference-v1.md` Section 7 (per-page reference). Each page lists which features are **[Phase 3]** or **[Phase 4]** or **MVP-shippable**.

Also reference `roadmap.md` if unclear which phase a feature belongs to.

**Step 2 — Apply the right pattern per phase status.**

| Feature status | What to ship | What NOT to ship |
|---|---|---|
| **MVP-shippable** (data exists today) | Real data via Supabase query | — |
| **[Phase 3]** (e.g., reviews, ratings) | "Bientôt disponible" placeholder card, same visual frame as the eventual widget | Fake stars, fake "4.9", fake review count |
| **[Phase 4]** (e.g., earnings, wallet, payouts) | Placeholder card with honest message about payment feature timeline | Fake TND amounts, fake "↑ 18% from last month", fake transaction tables |
| **[Phase 5]** (e.g., recommendations) | Placeholder OR hide entirely if not core to page | Fake "Top Opportunities for You" with invented matches |

**Step 3 — Honor the design's visual layout.** The deferred placeholder occupies the SAME card frame as the eventual real widget. Same width, same height, same position. This way:
- The page doesn't shift when the feature ships
- Users see the future shape and understand what's coming
- The design system migration completes cleanly

**Step 4 — Write the placeholder copy carefully.** Use these locked patterns:

```typescript
// fr.ts
'common.coming_soon.title': 'Bientôt disponible',
'common.coming_soon.earnings': 'Suivi des revenus à venir dans la prochaine mise à jour',
'common.coming_soon.ratings': 'Les avis clients arriveront prochainement',
'common.coming_soon.opportunities': 'Recommandations personnalisées en préparation',

// ar.ts
'common.coming_soon.title': 'قريباً',
'common.coming_soon.earnings': 'سيتم تتبع الأرباح في التحديث القادم',
'common.coming_soon.ratings': 'ستصل التقييمات قريباً',
'common.coming_soon.opportunities': 'التوصيات المخصصة قيد الإعداد',
```

## The placeholder component pattern

Build ONCE in `src/components/marche/ComingSoonCard.tsx`, reuse everywhere:

```tsx
interface ComingSoonCardProps {
  icon: ReactNode  // Lucide icon matching the eventual feature
  heading: string  // The eventual widget title (e.g., "Total Earnings")
  message: string  // Translation key for the coming-soon line
  phase: 3 | 4 | 5  // For internal tracking
}

// Renders the same card shell as a real widget but with:
// - Slightly muted styling (lower opacity icon)
// - "Bientôt disponible" pill in top-right
// - Honest 1-line message instead of fake numbers
// - No interactive elements (no buttons, no clicks)
```

## Red flags — refuse these

❌ **Hardcoded fake numbers in production code** — `value={2450}` for earnings, `rating={4.9}` for reviews. NEVER ship invented metrics.
❌ **Loading state used as permanent display** — showing a skeleton loader that never resolves because the query doesn't exist. That's lying to the user.
❌ **"Demo data" comments** — `value={2450} // demo data` — comments don't reach the user. They see "2450 TND" and believe it.
❌ **Empty zeros without context** — rendering `0 TND` and `0 reviews` everywhere makes Servyou look broken. Use the placeholder pattern instead.
❌ **Fake deltas** — `↑ 18% from last month` when there's no last month data. Drop the delta entirely on placeholder cards.
❌ **Fake charts** — rendering a line chart with invented data points. Hide the chart, show the placeholder.
❌ **Inventing recommendations** — Top Opportunities for You with random services. Either real recommendation logic or honest empty state.
❌ **Showing "Verified" badges on unverified profiles** — verification is a real flow that doesn't exist yet. Don't fake it. (See `tools-accounts-spec` Section 19 for the eventual verification flow.)

## Worked example — Dashboard Total Earnings tile

The design shows: "Total Earnings 2,450 TND ↑ 18% from last month" with blue icon.

**MVP reality:** No payment system yet. Earnings data doesn't exist.

❌ **Wrong (fake data):**
```tsx
<StatTile
  icon={<Briefcase />}
  iconColor="blue"
  label="Total Earnings"
  value="2,450 TND"
  delta={{ value: 18, direction: 'up' }}
  subtitle="From last month"
/>
```

✅ **Right (honest placeholder):**
```tsx
// Per design system Section 7.1 — Total Earnings is [Phase 4]
<ComingSoonCard
  icon={<Briefcase />}
  heading={t('freelance.dashboard.total_earnings')}
  message={t('common.coming_soon.earnings')}
  phase={4}
/>
```

✅ **OR ALTERNATIVELY (real MVP substitute):**
```tsx
// Replace earnings (Phase 4) with services-completed count (works today)
<StatTile
  icon={<Briefcase />}
  iconColor="blue"
  label={t('freelance.dashboard.services_completed')}
  value={completedServicesCount}
  subtitle={t('freelance.dashboard.services_completed_subtitle')}
/>
```

The second approach is BETTER when there's a meaningful MVP substitute. Discuss with Moatez which to use per stat tile.

## Worked example — Profile rating display

The design shows: "4.9 ⭐ Rating (32 reviews)" in the profile hero stats grid.

**MVP reality:** Review system is Phase 3.

❌ **Wrong:**
```tsx
<div>
  <span>{rating}</span>
  <Star className="text-yellow-400" />
  <span>({reviewCount} reviews)</span>
</div>
```

✅ **Right:**
```tsx
// Per design system Section 7.2 — Rating + Reviews are [Phase 3]
<ComingSoonCard
  variant="inline-stat"
  icon={<Star />}
  heading={t('freelance.profile.rating')}
  message={t('common.coming_soon.ratings')}
  phase={3}
/>
```

## When in doubt about phase status

If you're uncertain whether a feature is MVP/Phase 3/Phase 4:
1. Check `roadmap.md`
2. Check design system Section 7 for the specific page
3. Check `servyou-freelancer-world-class-spec.md` for feature-to-phase mapping
4. Ask Moatez before shipping

## Self-check before claiming the PR done

1. ☐ Every stat tile traces to a real data query OR is a ComingSoonCard
2. ☐ No hardcoded fake numbers anywhere in production code
3. ☐ No "demo data" leaks via comments
4. ☐ Deferred features use the ComingSoonCard pattern with proper phase label
5. ☐ Placeholder copy is honest, not marketing-y ("Bientôt" not "Coming soon — get excited!")
6. ☐ Cards maintain the same visual frame as the eventual real widget

## Coordination with other skills

- Pair with `servyou-design-system-compliance` — placeholders use design system tokens
- Pair with `servyou-i18n-vocabulary-lock` — "Bientôt disponible" exists in both FR and AR
- Pair with `servyou-visual-gate` — Gate 2 (Read flow) verifies no fake data slipped through

## Reference

- Per-page phase markers: `servyou-design-system-reference-v1.md` Section 7
- Phase plan: `roadmap.md`
- Feature-to-specialty mapping: `servyou-freelancer-world-class-spec.md`
