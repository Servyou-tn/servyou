# Servyou Standards Reference (2026)

> **Different from the strategic docs in project knowledge.**
> 
> The world-class spec defines WHAT to build. The tools-accounts spec defines WHICH tools and accounts to support. The data-model and engineering-standards docs define HOW the database and code are organized.
>
> **This doc defines the QUALITY BAR every page, component, and PR must clear** — the externally-defined standards (WCAG, Core Web Vitals, OWASP) plus the locally-learned standards from PR-F2.3 testing.
>
> Built: 2026-06-25
> Sources: WCAG 2.2 (ISO/IEC 40500:2025), Next.js 16 + React 19.2 official docs, OWASP Top 10:2025 (finalized January 2026)
> Use: Read once for context. Reference per-PR when reviewing. CC reads this as a checklist before claiming a PR is done.

---

## How this doc relates to the others

| Doc | Question it answers |
|---|---|
| `product.md` | Why does Servyou exist? |
| `roadmap.md` | What ships when? |
| `platform-pages-and-system.md` | What pages exist? |
| `data-model.md` | How is data structured? |
| `engineering-standards.md` | How do we write code? |
| `architecture.md` | How are systems composed? |
| `servyou-freelancer-world-class-spec.md` | What does world-class freelancer mean? |
| `servyou-freelancer-tools-accounts-spec.md` | Which tools + accounts per specialty? |
| **`servyou-standards-reference.md` (this doc)** | **What quality bar must every page clear?** |

This is a **checklist doc**, not a strategy doc. Short on prose, heavy on specifics.

---

## Section 1 — Accessibility (WCAG 2.2 AA)

**Target:** WCAG 2.2 Level AA. This is the current best-practice standard (replaces 2.1 AA which was the legal minimum until 2026). WCAG 2.2 added 9 new success criteria covering low vision, cognitive disabilities, and touch-screen accessibility.

**Why this matters for Servyou:** A Tunisian buyer with low vision opens a freelancer's profile on a 3-year-old Android phone. They use the system font-size-large setting. They need keyboard nav because their touch screen is cracked. If they can't read prices, contrast labels, or tab through the form, **they bounce and tell others "Servyou doesn't work."** That's the trust signal pillar collapsing through accessibility neglect.

### Required per page

| Item | Standard | How to verify |
|---|---|---|
| **Color contrast — text** | 4.5:1 minimum for body text, 3:1 for large text (18pt+ or 14pt bold+) | Browser DevTools color picker, axe DevTools, or WAVE extension |
| **Color contrast — UI** | 3:1 for buttons, inputs, focus indicators, icons that convey meaning | Same tools |
| **Focus visible** | Every interactive element shows a visible focus ring on keyboard tab | Tab through the page with Tab key, every focused element must show a ring |
| **Focus not obscured (new in 2.2)** | When an element receives focus, it must not be hidden by sticky headers, modals, etc. | Tab through, watch for focus disappearing behind sticky nav |
| **Target size (new in 2.2)** | Touch targets ≥ 24×24 CSS pixels minimum, 44×44 strongly preferred | Measure buttons + tap targets on mobile |
| **Keyboard navigation** | Every action achievable via keyboard alone, in logical tab order | Try the whole page without a mouse |
| **Skip links** | "Skip to main content" link at top for screen readers | Tab from page load, first focusable element should be skip link |
| **Alt text** | Every meaningful image has descriptive alt; decorative images have `alt=""` | Inspect every `<img>` / `<Image>` tag |
| **Form labels** | Every input has a `<label>` (visible or `aria-label`) associated by `for`/`id` | Inspect form HTML |
| **Helper text + errors** | Helper text linked via `aria-describedby`, errors via `aria-invalid` + `aria-describedby` | Inspect form HTML when in error state |
| **Heading hierarchy** | One `<h1>` per page, no skipped levels (don't jump h2 → h4) | Outline tool / DOM inspection |
| **Language attribute** | `<html lang="fr">` or `<html lang="ar" dir="rtl">` set per active language | Inspect `<html>` tag |
| **Reflow** | Page usable at 320px width without horizontal scroll, or at 400% zoom | DevTools mobile + zoom test |
| **Animations** | Respect `prefers-reduced-motion`; no auto-playing animations longer than 5s without pause control | CSS media query check |

### What Servyou specifically must add

- **Bilingual screen reader support** — Arabic text needs `lang="ar"` on the element, French text needs `lang="fr"`. Mixed-language pages must mark switches inline (e.g., a French page mentioning an Arabic brand name).
- **RTL focus order** — when language is Arabic, tab order must flow right-to-left logically (matches reading direction).
- **Form errors in BOTH languages** — error strings come from i18n, not hardcoded.

### Red flags to refuse

- ❌ Color as the only signal (e.g., "fill the red fields" — must also have an asterisk or icon)
- ❌ Icon-only buttons with no `aria-label` (e.g., a ❌ close button with no label)
- ❌ Modal dialogs without trap-focus or escape-key close
- ❌ Dropdowns built as `<div>`s that aren't keyboard-navigable
- ❌ Any text below 14pt (12pt is too small for our older audience)
- ❌ Validation that runs `onChange` and screams red on first keystroke (see Section 7 — forms)

### Tools to run before merge

- **axe DevTools** browser extension — runs WCAG checks, reports violations
- **Lighthouse accessibility score** — should be 95+ for every page
- **WAVE extension** — alternative WCAG scanner
- **Manual keyboard test** — Tab through the whole flow once, no mouse

---

## Section 2 — Performance (Core Web Vitals + Next.js 16)

**Target:** All three Core Web Vitals "Good" at the 75th percentile of real users (not lab data). Google ranks based on field data over a rolling 28-day window — synthetic Lighthouse scores don't move SEO, real user metrics do.

### Required Core Web Vitals targets

| Metric | "Good" target | What it means | Servyou implication |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5s | Time to render the largest above-the-fold element | Hero image / service title must load fast |
| **INP** (Interaction to Next Paint) | < 200ms | Lag between any user input and the next visual update | Buttons + form inputs must feel instant |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability — how much content jumps around | Reserve space for images, avoid late-injected banners |
| **TTFB** (Time to First Byte) | < 800ms | Server response time | Server actions, Supabase queries — keep them tight |
| **FCP** (First Contentful Paint) | < 1.8s | First text/image visible | Anything on screen quickly, even shell |

### Required Next.js 16 patterns

Per current Next.js 16 + React 19.2 documentation, these are not "optimizations" — they are baseline patterns:

1. **Server Components by default.** Only add `'use client'` to components that genuinely need interactivity (state, refs, event handlers, browser APIs). Most pages should have a small client-component tree at the edges, not a full client-side app.

2. **Eliminate data-fetching waterfalls.** Parallelize sibling fetches. If a page needs `freelancer`, `services`, and `reviews`, those three queries run in parallel — not chained. Each sequential await adds a full network round-trip to LCP.

3. **`next/image` with required props:**
   - `priority` on every above-the-fold image (LCP target)
   - `sizes` on every image that uses `fill` or responsive layout (without it, the browser downloads a 1920px image for a 400px column)
   - `alt` always — accessibility AND SEO

4. **`next/font` for all custom fonts.** Self-hosts at build time, eliminates third-party DNS lookup, kills FOIT/FOUT, no CLS from font swap.

5. **Suspense boundaries for slow data.** Wrap any component that does an awaitable fetch in `<Suspense fallback={...}>` so the rest of the page streams immediately. The shell renders in < 500ms even if a database query takes 2s.

6. **`'use cache'` directive (Next.js 16 stable feature)** — for components whose output is reusable across requests with the same input. Reduces server load, improves TTFB on cached responses.

### Required for every page

- **Lighthouse Performance score ≥ 90** in Performance category on mobile (the harder test)
- **First Load JS** for any page ≤ 200KB ideally (CC reports this from `pnpm build` output)
- **No `useEffect` for data fetching** in new components — use async Server Components instead
- **No `fetch()` in client components** unless absolutely required — Server Components or server actions

### Servyou-specific

- **Mobile is the primary battleground.** Tunisian users are mostly on mid-range Android phones. Test on Chrome DevTools "Slow 4G" throttling before claiming performance is fine.
- **Images dominate page weight.** Service detail pages will have user-uploaded images. Use Supabase Storage with the image transformations endpoint (resize on the fly, serve WebP/AVIF).
- **The freelancer profile page** is the highest-traffic page once we launch. It MUST hit Good on all 3 Core Web Vitals or buyers bounce.

### Red flags to refuse

- ❌ `useEffect(() => { fetch(...).then(setState) }, [])` — data fetching in client components
- ❌ A `<img src="...">` tag (use `next/image` instead, no exceptions for user content either)
- ❌ Loading external fonts via `<link>` tags — use `next/font`
- ❌ A page where `'use client'` is on the top-level component (means the whole subtree ships to the browser)
- ❌ Hardcoded `width` and `height` on images that don't match the rendered size (causes CLS)
- ❌ Animations triggered by scroll without `will-change` or `transform` (cause repaints, hurt INP)

---

## Section 3 — Security (OWASP Top 10:2025)

**Target:** No high-severity OWASP Top 10:2025 vulnerabilities in any shipped PR. The list was finalized January 2026, based on 175,000+ CVE records from 2021-2024.

### The 10 categories — what each means for Servyou

#### A01 — Broken Access Control (still #1)

**The risk:** Users acting outside their permissions — modifying a URL parameter to view another user's data, escalating privileges, bypassing RLS. SSRF is now folded into this category.

**For Servyou:**
- **RLS is non-negotiable.** Every table has Row Level Security enabled. Every policy is tested. Every server action that bypasses RLS via service role logs why.
- **Never trust client-supplied IDs without verifying ownership.** If a server action receives `serviceId`, it must verify `freelancer_id` matches `auth.uid()` before mutation.
- **No client-side feature gating as security.** A button being hidden in the UI doesn't stop a malicious user from calling the underlying server action. Every server action does its own auth check.

#### A02 — Security Misconfiguration (jumped from #5 to #2 in 2025)

**The risk:** Insecure defaults, missing hardening, verbose error pages, missing security headers.

**For Servyou:**
- **Set strict security headers** in `next.config.js` / middleware:
  - `Content-Security-Policy` (allowlist Supabase, allowed OAuth providers, no `unsafe-eval`)
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()` (allowlist what's actually used)
- **No verbose errors in production.** Stack traces stay in server logs, not in responses. (See PR-F2.3.1 — the `[service-detail] fetch error: {}` log leak.)
- **Audit Supabase project settings:** disable signup if not needed, enable email confirmation, set JWT expiry sensibly (1 hour access + refresh token rotation).
- **Vercel / Supabase environment isolation:** dev / preview / prod use SEPARATE Supabase projects and SEPARATE OAuth app registrations. No shared `client_secret`.

#### A03 — Software Supply Chain Failures (NEW for 2025)

**The risk:** Compromised npm packages, hijacked tags, malicious updates. Log4Shell-class events. The Trivy CVE-2026-33634 (76 hijacked tags, May 2026) is the kind of risk this category captures.

**For Servyou:**
- **Lockfile committed** (`package-lock.json` or `pnpm-lock.yaml`) — exact versions, no `^` drift
- **Dependabot or Renovate enabled** on the GitHub repo for security alerts
- **Audit before adding any new dependency:** is the package maintained? Last commit recent? Does it have GitHub Security Advisories? Use `npm audit` / `pnpm audit`.
- **Be careful with new packages** — every dependency is a supply chain risk. Prefer fewer, well-established packages.
- **CI verifies lockfile integrity** — Vercel does this automatically on build.

#### A04 — Cryptographic Failures (was #2 in 2021, down to #4)

**The risk:** Plaintext storage of sensitive data, deprecated hash functions (MD5, SHA1), weak randomness, passwords used as crypto keys.

**For Servyou:**
- **Supabase Auth handles password hashing** — bcrypt by default, don't roll your own.
- **OAuth tokens encrypted at rest** — already specified in tools-accounts spec Section 19. App-layer AES-256-GCM, key in `OAUTH_TOKEN_ENCRYPTION_KEY` env var.
- **CIN scans encrypted in Storage** — Supabase Storage default encryption, signed URLs only, admin-only RLS.
- **Use `crypto.randomUUID()` and `crypto.getRandomValues()` for tokens, state params, nonces.** Never `Math.random()` for anything security-sensitive.
- **TLS everywhere.** Vercel handles this — no HTTP traffic.

#### A05 — Injection

**The risk:** SQL injection, XSS, command injection, template injection.

**For Servyou:**
- **No raw SQL in app code.** Always use the typed Supabase client with parameter binding. Raw SQL only in migrations + RPC functions, never in route handlers or server actions.
- **No `dangerouslySetInnerHTML` for user content.** If markdown rendering is needed, use `react-markdown` with `rehype-sanitize`.
- **Validate every server action input with Zod.** Type-safe + runtime-safe.
- **HTML escape user content** — React does this by default for `{userInput}` in JSX, but be aware when stringifying for emails / non-JSX contexts.

#### A06 — Insecure Design

**The risk:** Architectural / design flaws that no amount of code review catches — business logic vulnerabilities, missing threat modeling, undefined trust boundaries.

**For Servyou:**
- **Threat-model new features before designing.** Examples:
  - Service samples upload → can a freelancer upload arbitrary files to attack viewers?
  - OAuth token storage → can the client ever access tokens directly?
  - Admin verification → can a freelancer self-verify by manipulating the verification flow?
- **The two strategic specs (`world-class-spec` and `tools-accounts-spec`) ARE the threat-model documentation** for major features. Every new feature gets its security section in the relevant spec before implementation.

#### A07 — Authentication Failures (renamed from Identification and Authentication Failures)

**The risk:** Weak passwords, missing MFA on sensitive ops, session fixation, insecure credential storage.

**For Servyou:**
- **Supabase Auth handles** the password complexity, session management, refresh token rotation. Don't reinvent.
- **MFA REQUIRED for admin role.** The admin dashboard accesses CIN scans, verification documents, reports — admin accounts must use TOTP (Supabase Auth supports this).
- **Session expiry** — access tokens 1 hour, refresh tokens rotated on use, max session age 30 days.
- **No "remember me forever" without 2FA.**
- **Email confirmation required** on signup before the user can list services or post missions.
- **OAuth provider config** — see tools-accounts spec Section 19. PKCE required, state validated, scopes minimum.

#### A08 — Software and Data Integrity Failures

**The risk:** Unsigned updates, deserialization of untrusted data, manipulated config files.

**For Servyou:**
- **No `eval()` of any user input. Ever.**
- **No `JSON.parse()` of data from URL params without validation** — use Zod to validate the parsed object before using it.
- **Webhook signature verification** — already specified in tools-accounts spec Section 19. Every webhook verifies HMAC, idempotency key, timestamp.
- **CI/CD pipeline** — Vercel handles signed deploys; GitHub Actions if used must restrict secrets to required workflows.

#### A09 — Security Logging and Alerting Failures (renamed to emphasize alerting)

**The risk:** Logs without alerts are useless. Detection without response is performative.

**For Servyou:**
- **Log security-relevant events** to `audit_logs` table (or Sentry once enabled):
  - User signup, login, logout
  - Password reset request + completion
  - OAuth connect / disconnect
  - Admin actions (verification approve / reject, user suspend)
  - Failed auth attempts (3+ in 5 min = alert)
  - Document upload + read by admin
- **Sentry integration (Phase 10 per roadmap)** — captures unhandled errors, alerts on spikes.
- **Don't log secrets or PII.** Email addresses, tokens, password attempts — sanitize before logging.

#### A10 — Mishandling of Exceptional Conditions (NEW for 2025)

**The risk:** Edge cases, error paths, and unexpected inputs creating exploitable states. Apps that fail open instead of fail closed.

**For Servyou:**
- **Fail closed, not open.** If an RLS check returns an unexpected error, deny the operation rather than fall through to "allowed."
- **Don't swallow errors silently** (see PR-F2.3.1 — `[service-detail] fetch error: {}` is exactly this pattern: empty error object swallowed, page still rendered). Either fix the underlying issue OR log meaningfully OR explicitly handle the expected-empty case without logging.
- **Validate edge cases:** empty arrays, null values, zero counts, maximum-length strings, unicode edge cases (right-to-left override characters, zero-width joiners).
- **Resource exhaustion guards:** rate limit external API calls, cap upload sizes, timeout slow database queries.

### What to check on every PR (security checklist)

```
[ ] No raw SQL in app code (only migrations + RPCs)
[ ] All server actions validate inputs with Zod
[ ] All new tables have RLS enabled in same migration
[ ] No client-side `service_role` Supabase client
[ ] No `dangerouslySetInnerHTML` with user input
[ ] No secrets / tokens / PII in console.log or error responses
[ ] No new dependencies without `npm audit` clean
[ ] Error handling: no empty catches, no silent failures
[ ] If new OAuth: PKCE + state validation + token encryption
[ ] If new uploads: file type + size validation server-side, NOT just client
[ ] If new admin actions: audit_logs entry written
```

---

## Section 4 — i18n + RTL (FR/AR parity)

**Target:** Every visible string in both languages, every layout flips correctly in RTL, no leaks. The bilingual promise IS Servyou's positioning — if AR users see French strings, the trust signal collapses.

### Required per page

| Item | Standard |
|---|---|
| **All visible strings via `t()` calls** | No hardcoded `"Mes commandes"` or `"Bientôt disponible"`. Always `t('navigation.my_orders')`. |
| **FR + AR keys exist** | Every new key added to `fr.ts` must have AR equivalent in `ar.ts` — same key path. CI should fail the build if a key exists only in one. |
| **`<html lang="...">` and `dir="..."`** | Set per active language. `lang="ar" dir="rtl"` flips the entire document. |
| **Tailwind logical properties** | Use `ps-4` (padding-start) not `pl-4` (padding-left). `me-2` not `mr-2`. `text-start` not `text-left`. |
| **Bidi-safe text** | When mixing Arabic + Latin (e.g., "PNG شعار بصيغة"), the browser handles Unicode bidi by default. Don't break it with `dir="ltr"` overrides on Arabic containers. |
| **Numbers stay LTR in RTL** | `0/1000` character counter, `180 TND` price — these stay LTR even in Arabic. This is correct Arabic typography (Western Arabic numerals are written LTR within RTL text). |
| **Date format locale-aware** | Use `Intl.DateTimeFormat('ar-TN', ...)` or `format(date, 'PPP', { locale: ar })` from date-fns. Not `date.toLocaleString()` which uses browser locale. |
| **Form labels in language** | Form labels, placeholder, helper, error messages — all translated. |
| **Server-rendered AR works** | First paint in AR must show Arabic content, not French → flip to Arabic on hydration. Set lang/dir at root layout based on cookie or URL. |

### Translation quality (especially for AR-MSA)

- **Tunisian Dinar abbreviation:** `د.ت` (not just `TND` in Arabic text). Both acceptable, but `د.ت` is more native.
- **No machine translation without review** — Google Translate or DeepL output for Arabic often makes grammatical errors. Review every new AR string.
- **Tunisian dialectal vs MSA:** UI strings are MSA. User-generated content (service descriptions, reviews) can be dialectal — don't reject it.
- **Keyboard keys stay English:** "اضغط Enter" not "اضغط إدخال". Standard convention for tech UIs.

### Servyou-specific RTL gotchas to test on every PR

- **Sidebar items:** check the WHOLE sidebar, not just the top items. The PR-F2.3 gate found 3 items leaking French. Always scroll the full sidebar in AR mode.
- **Tooltips and popovers:** position correctly in RTL (e.g., a tooltip "above and to the right" in LTR should be "above and to the left" in RTL).
- **Icons with directionality:** Back arrows, forward arrows, chevrons — should flip in RTL OR use language-neutral icons (×, +, ✓).
- **Tag chips with × buttons:** in LTR the × is right-of-chip; in RTL it should be left-of-chip. Most UI libraries handle this automatically with logical properties; verify.

### Red flags to refuse

- ❌ A new string committed without its AR translation
- ❌ Hardcoded French strings in JSX (e.g., `<Button>Annuler</Button>` — use `t('common.cancel')`)
- ❌ `padding-left`, `margin-right`, `text-left` — use logical properties
- ❌ `style={{ left: 0 }}` for absolute positioning when it should be language-aware
- ❌ A date displayed as `06/25/2026` (US format) instead of `25/06/2026` (FR) or `٢٥/٠٦/٢٠٢٦` (AR with Arabic numerals)
- ❌ AR translation that reads as broken Arabic (machine-translated)

---

## Section 5 — Mobile & Responsive

**Target:** Usable on iPhone SE (375×667) and on mid-range Android phones (typically 360×640 to 414×896). Tunisian users are mostly on Android — the iPhone SE test is the **worst-case** check.

### Required minimums

| Item | Standard |
|---|---|
| **Viewport meta tag** | `<meta name="viewport" content="width=device-width, initial-scale=1">` set in root layout. No `maximum-scale` — users must be allowed to pinch-zoom for accessibility. |
| **Min width supported** | 320px (older Androids in low-density mode). No horizontal scroll at this width. |
| **Touch target size** | 44×44 CSS pixels minimum (iOS Human Interface Guidelines). 48×48 preferred (Material Design). |
| **Tap target spacing** | At least 8px between adjacent tap targets, ideally 16px |
| **Body font size** | 16px minimum on inputs (prevents iOS zoom-on-focus). 14px acceptable on dense labels. 12px is too small — reject. |
| **Line height** | 1.5 for body text, 1.2-1.3 for headings |
| **Mobile-first CSS** | Default styles for mobile, then `md:`, `lg:`, `xl:` breakpoints for larger screens (Tailwind convention). |
| **Sticky elements use safe-area-insets** | Headers/footers respect iOS notch via `env(safe-area-inset-top)` / `pb-[env(safe-area-inset-bottom)]` |
| **Forms** | Inputs full-width on mobile, labels above (not beside), submit button reachable without scrolling |
| **Navigation** | Sidebar collapses to hamburger or moves off-screen on mobile, doesn't compete with content |

### Required test on every PR

Run these in DevTools mobile mode (or actual phones):

- **iPhone SE (375×667)** — narrowest realistic test
- **Pixel 5 or Galaxy A series (412×915)** — typical Android
- **iPad Mini (768×1024)** — small tablet

For each:
1. No horizontal scroll
2. All buttons tappable (44×44 minimum)
3. No text below 14px
4. Form usable without zooming
5. Sticky elements don't cover content

### Servyou-specific

- **Connection speed matters more than viewport.** Test with Chrome DevTools "Slow 4G" throttling. Tunisian 4G is often 1-3 Mbps in practice.
- **WhatsApp deep links** — when a button opens WhatsApp, use `https://wa.me/216XXXXXXXX` format (not `whatsapp://`) so it works on web AND mobile.
- **Phone number tappable** — wrap with `<a href="tel:+216...">` so mobile users tap to call.

---

## Section 6 — Form UX (lessons from PR-F2.3 + accessibility)

**Target:** Forms that feel friendly, not accusatory. The Gate 1 issue (red-on-load on backfilled services) is the lesson here — initial errors must not look like the form is broken.

### Required pattern

| Stage | Behavior |
|---|---|
| **Initial render (untouched)** | NO red errors. Empty fields show neutral helper text. Backfilled or invalid pre-existing data shows amber/warning (not red) — "Ces champs sont nouveaux, ajoutez-les pour publier." |
| **User starts typing in a field** | That field enters "interacted" state. Live validation runs but errors only surface AFTER blur or AFTER X seconds idle. |
| **User leaves a field (blur)** | If invalid → red error message inline. If valid → green check or no indicator. |
| **User clicks submit** | All fields enter "interacted" state. All errors surface in red. Focus jumps to first invalid field. |
| **Submit succeeds** | Toast confirms success. Redirect or clear form. Never silently succeed. |
| **Submit fails (server)** | Inline error near submit button OR toast — never a browser alert. Preserve user input. |

### Required attributes per input

- `id` matching `<label for>`
- `name` for form submission
- `required` if required (browser native)
- `aria-describedby` pointing to helper-text element ID
- `aria-invalid="true"` when in error state
- `autocomplete="..."` set appropriately (e.g., `email`, `tel`, `name`, `street-address`)
- `inputmode` on number-like inputs (`numeric`, `tel`, `email`)
- `enterkeyhint` for "Send" / "Done" semantics on mobile

### Character counters

- Show as `{current}/{max}` (e.g., `0/1000`)
- Update live as user types
- Turn amber when 80% of max, red when at max
- Don't BLOCK typing past max — let the validator handle it on blur (forcing input is annoying)

### Chip inputs (tags, deliverables, etc.)

- Commit on `Enter` OR `,` (comma)
- Show chip with × delete button
- Lowercase + trim + dedupe on commit (validator handles this)
- Inline error for invalid format ("Lettres minuscules, chiffres, tirets uniquement")
- Live counter (e.g., `3/5`)

### Required when error states are shown

- Error text adjacent to the field (not just at top of form)
- Error text starts with the field name OR is clear in context
- Error color contrast meets WCAG (red text on white = 4.5:1, dark red `#991b1b` against white = 8.49:1 ✓)
- Icon + color together (don't rely on red alone — colorblind users)
- Screen-reader-announced via `aria-live="polite"` on the error message

### Red flags to refuse

- ❌ Validation that runs `onChange` and shows red on first keystroke
- ❌ Red errors on initial render of a clean / backfilled form (PR-F2.3 Gate 1 lesson)
- ❌ Submit button that's disabled until form is valid (no — let user try, then show errors)
- ❌ Error messages that say "Invalid input" without explaining what's wrong
- ❌ Forms without autocomplete attributes
- ❌ A `<form>` without `onSubmit` (must work with Enter key)
- ❌ Inputs without labels (placeholder is NOT a label)

---

## Section 7 — Code Quality + PR Discipline

These reinforce `engineering-standards.md` — no contradictions, just the standards as a checklist.

### TypeScript

- **Strict mode enabled** in `tsconfig.json` (`"strict": true`)
- **No `any`** in shipped code — use `unknown` and narrow, or define the type
- **No `@ts-ignore`** without a comment explaining why
- **Zod schemas** for every server action input + every external API response

### React patterns

- **Server Components by default**, `'use client'` only when needed
- **No `useEffect` for data fetching** in new code
- **Custom hooks for shared client logic** — name with `use` prefix
- **No props drilling more than 2 levels** — use Context or co-locate

### Server actions

- **Always validate input** with Zod before doing anything
- **Always check auth** — verify the calling user owns the data they're mutating
- **Return typed errors** — discriminated union of success/error, not throws (per OWASP A10)
- **No `service_role` Supabase client in code paths exposed to users** — only background jobs and admin endpoints

### Database / migrations

Already covered in `data-model.md`. Reinforcing here:
- One conceptual change per migration
- Discovery before destructive changes (the PR-F2.3 search_vector lesson)
- RLS enabled in the same migration that creates the table
- Mirror to `/db/migrations/` after apply

### Commits + PRs

Per engineering-standards:
- One focused commit per PR (or 2 max if cleanly separated)
- Conventional commit prefix: `feat(scope):`, `fix(scope):`, `chore:`, etc.
- No `Co-Authored-By` trailers
- Commit body cites the relevant spec section
- PR description includes: discovery findings, what changed, screenshots for visual changes, regression test results

### Red flags to refuse

- ❌ `any` type without justification
- ❌ Server action that takes `formData` without validation
- ❌ A new table without RLS enabled
- ❌ Co-Authored-By trailer
- ❌ Multiple unrelated changes in one PR
- ❌ Missing the commit body context

---

## Section 8 — Testing minimums per PR

Not a TDD doctrine — pragmatic minimums to ship safely.

### Required per PR (matching what worked on PR-F2.3)

| Test type | When required |
|---|---|
| **Discovery report** | Before any schema change. List existing state, flag conflicts, propose plan, WAIT for approval. |
| **Unit tests** | When adding a pure function (validators, transformers, utilities). Cover happy path + 2-3 edge cases minimum. |
| **Build green** | `pnpm build` must succeed, no warnings about missing types, no unused imports. |
| **i18n parity check** | If new strings added, both `fr.ts` and `ar.ts` have the keys. |
| **Visual gate (manual)** | For any UI change: walk the affected pages, screenshot evidence of working. |
| **AR/RTL spot check** | Toggle to Arabic, verify the affected pages render correctly. |
| **Mobile 375px spot check** | DevTools iPhone SE viewport, verify the affected pages. |
| **Regression check** | If touching a flow that PR-X already verified, rerun PR-X's gates briefly. |

### NOT required (yet)

- E2E tests (Playwright / Cypress) — defer to post-launch when surface is stable
- 100% code coverage — meaningless metric, focus on critical paths
- Performance tests — Lighthouse on the deployed Vercel preview URL is enough at MVP

---

## Section 9 — Internal Servyou standards (lessons learned)

These are LOCAL standards — born from actual PR experience, not external authorities.

### Standard A — Discovery-first migrations

**Origin:** PR-F2.3 search_vector trap (CC discovered the column was GENERATED STORED, not a trigger — the brief was wrong).

**Standard:** Every schema-change PR includes a discovery phase. CC runs `execute_sql` reads first, reports findings, **stops and waits for approval** before applying any migration. No exceptions, no "quick fix" migrations.

### Standard B — Defer-don't-rush risky migrations

**Origin:** PR-F2.3 deferred the search_vector recreate to a future PR-F2.X.search instead of bundling it with the 4-column add.

**Standard:** When a migration has two unrelated parts and one is materially riskier, split into two PRs. Track the deferred work in `docs/design-phase/pending-migrations.md`. Never sneak a risky change into a low-risk PR.

### Standard C — Validator-as-home-for-normalization

**Origin:** PR-F2.3 architectural choice — put trim/lowercase/dedupe logic IN the validator, not in the server action.

**Standard:** Server actions call validators. Validators do normalization + validation as pure functions. Both create and update flows share the same validator. Unit tests live on the validator. This makes invariants testable and consistent.

### Standard D — Spec-citation in commits

**Origin:** Both strategic specs explicitly require this.

**Standard:** Every commit body cites the spec section it implements ("Per tools-accounts spec Section 18, ..."). Makes git log a useful index of "where in the spec is this implemented."

### Standard E — One PR, one focus

**Origin:** PR-F2.3.1 plan locked the rule explicitly after the "build everything at once" temptation.

**Standard:** Each PR ships one focused thing. Bugs found out-of-scope during a PR get logged for a future PR, NOT fixed inline. This prevents scope creep and keeps debugging tractable.

### Standard F — Visual gate before merge

**Origin:** PR-F2.3 6-gate walkthrough.

**Standard:** Before any PR with UI changes merges to main, a human (founder or trusted reviewer) walks the affected pages:
- Create flow
- Read flow (public)
- Edit flow
- AR/RTL toggle
- Mobile 375px
- The "around-it" surface (any page that links to the changed surface)

Found bugs out-of-scope? Log them. Don't block merge unless functional regression.

### Standard G — Pre-existing bugs don't block PR closure

**Origin:** PR-F2.3 gates 6 found 3 broken sidebar links (pre-existing), 1 silent log error (pre-existing).

**Standard:** When a gate walkthrough finds bugs that pre-date the current PR, document them in a follow-up PR (like PR-F2.3.1), but DO NOT hold the current PR. The current PR is judged on its own changes, not on the surface debt around it.

---

## Section 10 — How to use this doc

### For Moatez (founder review)

Before approving a PR for merge:
- Scan the 9 sections like a checklist
- Spot the obvious violations (e.g., did CC add a `<img>` tag instead of `next/image`?)
- For deeper PRs, run the test gates (Section 8)

### For Claude (strategic review)

When writing a PR prompt for CC:
- Cite the relevant section of this doc in the prompt (e.g., "Per standards reference Section 6, the form must not show red errors on initial render")
- Include the "red flags" of each section as anti-patterns CC should avoid

### For CC (execution)

Read this doc once at the start of any session. Reference specific sections when designing approach. Before claiming a PR is done, walk the relevant checklists:
- Did I add `'use client'` only where needed? (Section 2)
- Are all visible strings in both fr.ts and ar.ts? (Section 4)
- Does the form follow the interacted-state pattern? (Section 6)
- Are RLS policies in the same migration as the table? (Section 3 A01)
- Did I enable any logging that contains secrets or PII? (Section 3 A09)

### When to update this doc

- New WCAG version published (next is WCAG 3.0, in draft as of 2026)
- New OWASP Top 10 edition (next expected ~2028)
- New Next.js major version with API changes
- A new internal standard emerges from a PR experience (add to Section 9)

---

## Appendix A — Quick reference summary

**Accessibility:** WCAG 2.2 AA, contrast 4.5:1, focus visible, touch targets 44×44

**Performance:** LCP < 2.5s, INP < 200ms, CLS < 0.1, mobile Lighthouse ≥ 90

**Security:** OWASP Top 10:2025, RLS on every table, encrypted tokens, PKCE OAuth, no client-side service_role

**i18n:** Every string in fr.ts + ar.ts, logical Tailwind properties, RTL tested

**Mobile:** 375px tested, 44×44 targets, 16px input fonts, no horizontal scroll

**Forms:** No red on initial render, blur-then-error pattern, character counters, ARIA labels

**Code:** TypeScript strict, Zod validation, Server Components default, server actions for writes

**Process:** Discovery first, one PR one focus, spec citation in commits, visual gate before merge

---

## Appendix B — Sources

- **WCAG 2.2** — W3C published 5 October 2023, updated 12 December 2024. ISO/IEC 40500:2025 published as international standard.
- **Next.js 16** — Released late 2025. Cache Components (`'use cache'`) and Turbopack-as-default are stable. Compatible with React 19.2.
- **React 19.2.4+** — Required for serialization fixes from CVE-2026-* RSC issues.
- **OWASP Top 10:2025** — Released November 2025 at Global AppSec Conference (Washington, D.C.). Finalized January 2026. Built from 175,000+ CVE records, 248 CWEs mapped.
- **Core Web Vitals** — Google PageSpeed Insights field data, 75th percentile over 28-day window. Real user data only (field), not Lighthouse synthetic data.

---

**End of standards reference.**

This is a living document. Add to Section 9 when new internal standards emerge. Refresh external sections when WCAG / Next.js / OWASP publish new versions. Don't let it grow into a wishlist — keep it focused on the bar every PR must clear.
