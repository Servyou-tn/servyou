# FREELANCER WORKSPACE — DESIGN CONSTITUTION

This document is the LAW for every freelancer-space page built in PR-F1, PR-F2, PR-F3, PR-F4, and beyond. Any deviation requires explicit founder authorization documented in the PR body.

## Foundational principle

**Servyou is ONE platform.** Consumer, freelancer, and shop owner workspaces share 100% of the visual language. Only content and features differ by role.

This is not aesthetic preference — it is the **Unified Workspace Principle** from `product.md`: *"Today's smaller user types' workspaces are built with the seriousness tomorrow's larger user types deserve to find."*

## What is INHERITED from consumer (DO NOT redesign)

### Navbar
- Component: `src/components/marche/MarcheTopBar.tsx` (used as-is, despite the "Marche" name — that's a refactor for another PR, not this one)
- Layout: `[S Wordmark] ←space→ [Search] [Trouver des Produits] [Trouver des Services] [+ Publier un projet CTA] [? 🌐 🔔 MS]`
- Behavior on freelancer routes: IDENTICAL to consumer routes
- The "Publier un projet" CTA stays — a freelancer can still post projects (they're a consumer too)

### Footer
- Component: `src/components/layout/Footer.tsx`
- Used as-is on every freelancer route

### Page header
- Component: `src/components/shared/PageHeader.tsx`
- Per-page subtitle with brand-accent emphasis word + animated underline
- Premium per-word stagger reveal, Arabic-safe, prefers-reduced-motion respected
- Used on every freelancer route with a freelancer-specific subtitle

### Design tokens
- `--brand-accent: #2563EB` (the platform blue)
- `--text-primary: #0F172A`
- `--text-muted: #64748B`
- `--border-subtle: #E2E8F0`
- `--surface-base: #FFFFFF`
- Inter font, weights 400/500/600/700
- 8-point grid spacing

### Component primitives
- Dropdowns: Radix DropdownMenu (matches HelpDropdown / ProfileAvatarMenu pattern)
- Buttons: brand-accent solid pills (rounded-full, h-10, white text + icon) for primary actions
- Sidebar buttons: `interactiveSurface()` helper from `src/components/ui/interactive-surface.ts`
- Cards: white surface, subtle border, hover lift (matches consumer card style)
- Forms: match `src/components/marche/MissionForm.tsx` styling (the current-design-system reference)
- Chip multi-select: bg-blue-50 text-blue-700 rounded-full with × remove
- Repeatable cards: rounded-md border bg-gray-50 p-4 with absolutely-positioned delete button
- Pagination: numbered + ellipsis (`src/components/shared/Pagination.tsx`)
- Empty states: `src/components/marche/EmptyState.tsx`
- Toasts: Sonner

### Accessibility
- WCAG AA contrast (4.5:1 for normal text, non-negotiable — verified before merge)
- Per-WORD stagger for animations (NEVER per-character, breaks Arabic connected script)
- `prefers-reduced-motion` respected on every animation
- aria-labels on every interactive element
- Semantic HTML

## What DIFFERS by role (the only role-aware code)

### Layout shell
- Consumer: `src/components/marche/MarcheLayout.tsx` (shipped)
- Freelancer: `src/components/freelance/FreelancerLayout.tsx` (NEW in PR-F1)
- Shop owner: `src/components/boutique/ShopOwnerLayout.tsx` (LATER)

Each layout shell:
- Renders MarcheTopBar (the shared navbar)
- Renders Footer (the shared footer)
- Renders ITS OWN sidebar
- Children inside a flex container matching MarcheLayout's structure

### Sidebar component
- Consumer: `src/components/marche/MarcheSidebar.tsx`
- Freelancer: `src/components/freelance/FreelancerSidebar.tsx` (NEW)
- Shop owner: `src/components/boutique/ShopOwnerSidebar.tsx` (LATER)

Each sidebar:
- Uses IDENTICAL visual style (rounded-full pills, brand-accent active state, soft tint, brand-accent border)
- Uses IDENTICAL `interactiveSurface()` primitive
- ONLY differs in which items appear

### Freelancer sidebar items (locked)
- **Profil** — `/mon-profil-freelance` (dashboard / main)
- **Services** — `/mon-profil-freelance/services` (services list)
- **Demandes** — `/mon-profil-freelance/commandes` (incoming service requests)
- **Réponses** — `/mon-profil-freelance/reponses` (my job responses)
- **Missions sauvegardées** — `/mon-profil-freelance/missions-sauvegardees` (bookmarked job posts)

### PageHeader subtitles per freelancer page
| Route | Subtitle | Emphasis word |
|---|---|---|
| `/devenir-freelance` | Rejoignez les **freelances** de Servyou | freelances |
| `/mon-profil-freelance/creer` | Créez votre **profil** professionnel | profil |
| `/mon-profil-freelance/modifier` | Mettez à jour votre **profil** | profil |
| `/mon-profil-freelance` | Gérez votre **activité** freelance | activité |
| `/mon-profil-freelance/services` | Vos **services** proposés | services |
| `/mon-profil-freelance/services/ajouter` | Ajoutez un nouveau **service** | service |
| `/mon-profil-freelance/services/[id]/modifier` | Modifiez votre **service** | service |
| `/mon-profil-freelance/commandes` | Vos **demandes** de service reçues | demandes |
| `/emplois` | Trouvez votre prochaine **mission** | mission |
| `/emplois/[id]` | Détails de la **mission** | mission |
| `/mon-profil-freelance/reponses` | Vos **réponses** envoyées | réponses |
| `/mon-profil-freelance/missions-sauvegardees` | Vos missions **sauvegardées** | sauvegardées |

### Role switcher (the cross-workspace navigation)

The ProfileAvatarMenu (MS dropdown in navbar) gets role-aware additions when the user is a freelancer. Items added:
- **"Espace freelance"** → navigates to `/mon-profil-freelance` (only visible if user has freelancer role)
- **"Mon profil public"** → navigates to `/freelance/[id]` showing the user's public freelancer profile (only visible if freelancer role)

Implementation: the ProfileAvatarMenu reads `user.seller_type === 'freelancer'` and conditionally renders these items. NOT shipped in PR-F1.1; deferred to PR-F1.2 or later.

## File structure pattern

```
src/app/
  (consumer routes — already shipped)
  marche/
  mes-favoris/
  mes-commandes/
  mes-missions/
  ...
  (freelance routes — NEW)
  devenir-freelance/
    page.tsx
  mon-profil-freelance/
    page.tsx              ← dashboard
    creer/
      page.tsx
    modifier/
      page.tsx
    services/
      page.tsx
      ajouter/
        page.tsx
      [id]/
        modifier/
          page.tsx
    commandes/
      page.tsx
    reponses/
      page.tsx
    missions-sauvegardees/
      page.tsx
  emplois/
    page.tsx
    [id]/
      page.tsx

src/components/
  marche/                   ← consumer-specific (existing)
  freelance/                ← NEW freelancer-specific
    FreelancerLayout.tsx
    FreelancerSidebar.tsx
    FreelancerDashboard.tsx
    FreelancerForm.tsx                  (rebuilt from recovered code, new visual)
    FreelancerToolsEditor.tsx           (rebuilt from recovered code, new visual)
    FreelancerEducationEditor.tsx       (rebuilt from recovered code, new visual)
    FreelancerCertificationsEditor.tsx  (rebuilt from recovered code, new visual)
  shared/                   ← cross-role
    PageHeader.tsx
    Pagination.tsx
  layout/                   ← cross-platform
    Footer.tsx
    LanguageToggle.tsx
  ui/                       ← primitives
    interactive-surface.ts
```

## Recovery recipe for proven logic

Every business logic file deleted in commit `59cb952` is recoverable:

```bash
git show 59cb952^:src/components/FreelancerForm.tsx > /tmp/FreelancerForm.tsx
git show 59cb952^:src/components/FreelancerToolsEditor.tsx > /tmp/FreelancerToolsEditor.tsx
git show 59cb952^:src/components/FreelancerEducationEditor.tsx > /tmp/FreelancerEducationEditor.tsx
git show 59cb952^:src/components/FreelancerCertificationsEditor.tsx > /tmp/FreelancerCertificationsEditor.tsx
git show 59cb952^:src/app/mon-profil-freelance/creer/page.tsx > /tmp/creer-page.tsx
git show 59cb952^:src/app/mon-profil-freelance/modifier/page.tsx > /tmp/modifier-page.tsx
git show 59cb952^:src/app/mon-profil-freelance/page.tsx > /tmp/dashboard-page.tsx
git show 59cb952^:src/app/freelance/[id]/page.tsx > /tmp/public-page.tsx
```

For each freelancer page build:
1. Recover the relevant deleted file
2. EXTRACT the business logic (diff-save, validation, child-table handlers)
3. REWRITE the JSX/styling against the current design system using MissionForm.tsx as the reference
4. KEEP the type layer and i18n keys as-is

## Database schema rules

- Schema is the source of truth — verified live for freelancer_profiles + freelancer_tools + freelancer_education + freelancer_certifications (migration 20260606212937)
- Child tables key on `freelancer_id` (NOT the legacy `freelancer_profile_id`)
- `freelancer_tools` has `UNIQUE(freelancer_id, name)` — name field is `name`, not `tool_name`
- `freelancer_certifications.issuing_org` (NOT `issuing_organization`)
- No `display_order` columns on the new child tables
- All RLS policies match the freelancer_skills pattern (anyone SELECTs; owner manages)

## Save strategy

- **Sequential client-side writes** (profile first, then child tables)
- **NOT atomic** — accepted as MVP tradeoff
- On error: bail with error message + user retries
- Three diff flavors:
  - `freelancer_tools` → delete + insert (set-membership pattern)
  - `freelancer_education` → delete + insert + update (entity-with-id pattern)
  - `freelancer_certifications` → delete + insert + update (entity-with-id pattern)

## Forbidden patterns (catches that block merge)

- Hardcoded colors instead of design tokens (e.g., `bg-blue-600` instead of `bg-brand-accent`)
- Per-character text splits for animations (breaks Arabic)
- New CSS not derived from existing tokens
- Direct DB calls without error capture (every Supabase call must `if (error) { console.error('[Component]', error); return; }`)
- Auth checks that depend only on middleware (need layout-level check too)
- Forms without diff-save when child tables involved
- Pages without PageHeader
- Pages without auth + role guard
- Layout shells that re-render the navbar/footer (must reuse MarcheTopBar + Footer)
- Routes outside the file structure pattern above

## Required patterns (every freelancer page must)

- Use FreelancerLayout shell (or its children)
- Render PageHeader with the correct subtitle from the table above
- Pass auth check at the page level (`/mon-profil-freelance/*` requires `seller_type === 'freelancer'`)
- Use Server Components for data fetching (defer Client Components to interactive leaves)
- Read i18n strings from existing keys, not hardcoded French
- Support Arabic via the existing `lang` system
- Pass i18n parity test
- Pass build + 43-suite test
- Match MissionForm.tsx as the styling reference if forms are involved

## Per-PR discipline

For every freelancer page CC builds:
1. **PHASE 1 — DISCOVERY**: read this constitution + relevant recovered files + existing consumer parallels
2. **PHASE 2 — REPORT**: confirm what's being inherited vs built new, flag anything ambiguous
3. **PHASE 3 — BUILD**: rewrite JSX against design system, keep recovered business logic verbatim
4. **PHASE 4 — VERIFY**: build green, tests green, i18n parity, manual visual check description
5. **PHASE 5 — COMMIT**: one focused commit, no Co-Authored-By, document the inheritance + the new
