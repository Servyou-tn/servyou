# Servyou Freelancer World-Class Specification

> **Strategic reference document** — every element a Tunisian freelancer needs across the platform, mapped to global best practices (Fiverr, Upwork, Toptal, Malt, Behance, Dribbble, LinkedIn) and adapted to the Tunisian market.
>
> **Status:** Strategic — drives all future freelancer PRs.
> **Last updated:** 2026-06-25
> **Use:** Both human strategic reference AND Claude Code reads this before any freelancer-related PR.

---

## How to use this document

1. **For design decisions:** Look up the relevant page or feature, check what world-class platforms include, decide what to include vs defer based on the Tunisia-specific guidance.
2. **For DB schema decisions:** Every field listed here is a candidate column. The "Phase" column indicates when it should ship.
3. **For PR scoping:** Each section maps to one or more PRs. Don't try to build everything at once.
4. **For consistency:** Servyou's design principle — **Trust signals + Bilingual (FR/AR) + WhatsApp** — applies to every section. If a feature doesn't reinforce one of these three, deprioritize it.

---

## Table of contents

- [Section 1 — Universal core profile fields](#section-1--universal-core-profile-fields)
- [Section 2 — Per-specialty profile extensions](#section-2--per-specialty-profile-extensions)
- [Section 3 — Portfolio system](#section-3--portfolio-system)
- [Section 4 — Social media & external presence](#section-4--social-media--external-presence)
- [Section 5 — Professional tools by specialty](#section-5--professional-tools-by-specialty)
- [Section 6 — Payment methods & financial preferences (Tunisia)](#section-6--payment-methods--financial-preferences-tunisia)
- [Section 7 — Verification & trust signals](#section-7--verification--trust-signals)
- [Section 8 — Availability & business preferences](#section-8--availability--business-preferences)
- [Section 9 — Communication preferences](#section-9--communication-preferences)
- [Section 10 — Tunisia-specific differentiators](#section-10--tunisia-specific-differentiators)
- [Section 11 — DB schema implications](#section-11--db-schema-implications)
- [Section 12 — Implementation phases](#section-12--implementation-phases)

---

## Section 1 — Universal core profile fields

These fields apply to **every freelancer regardless of specialty**. They form the baseline profile.

### Identity block

| Field | Type | Required | Phase | Notes |
|---|---|---|---|---|
| Avatar photo | image, square crop 1:1 | optional but strongly recommended | 1 (Storage) | Min 200x200, professional headshot encouraged. Default to letter avatar from name. |
| Banner image | image, 3:1 aspect | optional | 2 (Storage) | Branding surface, not blocker. |
| Full name | text, 2-100 chars | ✅ | 1 | Inherited from `profiles.full_name`, editable. |
| Display name | text, 2-50 chars | optional | 2 | If different from full name (e.g. business name "Atelier Sahbeni" instead of "Moatez Sahbeni"). |
| Professional headline | text, 10-100 chars | ✅ | 1 | The single most important field. Should follow "[Role] + [Specialty] + [Differentiator]" formula. Example: "Photographe e-commerce produits — fond blanc & retouche pro". |
| Bio / description | text, 100-2000 chars | ✅ | 1 | Long-form pitch. Rich text optional, support line breaks. |
| Tagline / one-liner | text, max 140 chars | optional | 2 | Twitter-style hook, shows on cards. |

### Location block

| Field | Type | Required | Phase | Notes |
|---|---|---|---|---|
| City | dropdown of Tunisian cities | ✅ | 1 | Reuse Tunisian governorate list. |
| Governorate | dropdown | ✅ | 1 | Auto-populated from city. |
| Service area | enum (Local / Regional / National / International / Remote only) | ✅ | 1 | Indicates how far they'll travel or accept remote. |
| Travel willingness | enum (Yes / No / Negotiable) | optional | 2 | Critical for photographers, event services, repair people. |
| Open to international clients | boolean | optional | 2 | Important for developers, designers, translators. |

### Skills & languages block

| Field | Type | Required | Phase | Notes |
|---|---|---|---|---|
| Primary skills (chips, max 15) | array of text | ✅ min 3 | 1 | Used for search + matching. |
| Skill proficiency level per skill | enum (Débutant / Intermédiaire / Avancé / Expert) | optional | 2 | Upwork-style. Honest signal to clients. |
| Years of experience overall | integer 0-50 | optional | 1 | Surfaces on profile as "X années d'expérience". |
| Spoken languages | array of {language, proficiency} | ✅ min 1 | 1 | Proficiency: Natif / Courant / Conversationnel / Notions. Critical for Tunisia (FR/AR/EN/IT). |

### Professional summary block

| Field | Type | Required | Phase | Notes |
|---|---|---|---|---|
| Education entries | array of {institution, degree, field, year_start, year_end} | optional | 2 | year_end null = ongoing. |
| Certifications | array of {name, issuing_org, year, credential_url} | optional | 2 | credential_url enables click-through verification. |
| Years freelancing | integer 0-50 | optional | 2 | Separate from "years experience". |
| Work history | array of {company, role, start_date, end_date, description} | optional | 3 | LinkedIn-style. Lower priority for MVP. |

---

## Section 2 — Per-specialty profile extensions

Different freelancer categories need different fields. The form should adapt dynamically based on the primary category selected.

### 2.1 — Graphic / UI/UX Designer

**Extra fields:**
- Design tools mastered (chip array from controlled list — see Section 5.1)
- Design style preferences (Minimalist / Bold / Corporate / Playful / Artistic — multi-select)
- Niche specialties (Logo, Branding, Web UI, Mobile UI, Print, Packaging, Illustration, Motion)
- Hourly OR per-deliverable pricing (radio)
- Source files included? (Yes/No/On premium tier)
- Commercial usage rights included? (Yes/No)
- Number of initial concepts per project (e.g. "3 initial concepts")

**Critical portfolio expectations:** Minimum 6 visual samples, 1080x1080 minimum, before/after pairs valued highly.

**Social media that matters:** Behance, Dribbble, Instagram, LinkedIn.

### 2.2 — Web / Mobile / Software Developer

**Extra fields:**
- Programming languages (chip array — see Section 5.2)
- Frameworks & libraries (chip array)
- Databases worked with (chip array)
- Cloud platforms (AWS / Azure / GCP / Supabase / Vercel / DO — multi-select)
- Development methodologies (Agile / Scrum / Kanban / Waterfall)
- DevOps tooling (Git / Docker / K8s / CI-CD — multi-select)
- Code review / pair programming offered? (boolean)
- Open source contributions count or link
- Stack Overflow reputation / profile link
- Specialty (Frontend / Backend / Full-stack / Mobile / DevOps / Data / AI/ML / Embedded / Game dev — multi-select)
- Years per language (optional, for senior signal)

**Critical portfolio expectations:** GitHub profile link is THE proof. Live URL deployments preferred over screenshots. Code samples or case studies.

**Social media that matters:** GitHub, GitLab, Stack Overflow, LinkedIn, Dev.to, personal blog.

### 2.3 — Content Writer / Copywriter

**Extra fields:**
- Writing languages (FR/AR/EN — with proficiency per language)
- Content types (Blog / Article / Whitepaper / Case study / Web copy / Email / Social media / Press release / Technical / Academic — multi-select)
- Niches written for (Tech, Finance, Health, Travel, Fashion, Food, etc. — multi-select)
- Writing style examples (Conversational / Formal / SEO-optimized / Storytelling — multi-select)
- SEO knowledge level (None / Basic / Intermediate / Expert)
- Words per project minimum / maximum
- Turnaround time per 1000 words
- Plagiarism guarantee statement
- AI usage disclosure (None / Assisted / Heavy — honesty signal)
- Average words written per month

**Critical portfolio expectations:** 5+ published clips with URLs, or PDF samples. Bilingual sample if claiming bilingual work.

**Social media that matters:** Medium, Substack, personal blog, LinkedIn, X/Twitter.

### 2.4 — Marketing / Social Media Manager

**Extra fields:**
- Marketing specialties (SEO / SEM / Social Media / Email / Content / Influencer / Affiliate / PR / Brand strategy / Growth hacking — multi-select)
- Platforms managed (Facebook / Instagram / TikTok / LinkedIn / YouTube / X — multi-select with proficiency)
- Industries worked in (B2B / B2C / E-commerce / SaaS / Local business — multi-select)
- Ad platforms mastered (Meta Ads / Google Ads / TikTok Ads / LinkedIn Ads — multi-select)
- Analytics tools (Google Analytics / Meta Insights / Hootsuite — multi-select)
- Past campaign results (3-5 case studies with metrics: "Increased Instagram followers by X% in Y months")
- Industries excluded (some marketers refuse certain niches like gambling, adult content)
- Languages for content creation
- Content production capability (Just strategy / Strategy + copy / Strategy + copy + design / Full production)

**Critical portfolio expectations:** Account links of past clients (with permission), case studies with metrics.

**Social media that matters:** Their own social presence is their portfolio.

### 2.5 — Photographer / Videographer

**Extra fields:**
- Photography specialties (Product / Wedding / Event / Portrait / Architecture / Fashion / Food / Real estate / Travel — multi-select)
- Style (Documentary / Editorial / Studio / Lifestyle / Cinematic — multi-select)
- Equipment owned (camera bodies + lenses, simple text field or chip array)
- Studio access (Own studio / Shared studio / On-location only)
- Drone certification (boolean + license number)
- Video offered? (boolean + types)
- Post-processing included? (boolean + software used)
- Delivery format (Digital / Print / Both)
- Delivery turnaround time
- Number of photos delivered per service tier
- Travel willingness with cost structure
- Model release management (Yes / Provided by client / N/A)

**Critical portfolio expectations:** 12+ images, varied subjects, before/after for retouching skills, video reels for videographers.

**Social media that matters:** Instagram (primary), 500px, Behance, YouTube/Vimeo for video.

### 2.6 — Video Editor / Motion Designer

**Extra fields:**
- Software mastered (Adobe Premiere / Final Cut / DaVinci / After Effects / Cinema 4D — multi-select)
- Content types (YouTube videos / Short-form Reels/TikTok / Wedding films / Corporate / Documentary / Music videos / Motion graphics / 2D animation / 3D animation — multi-select)
- Average project length capability (≤1 min / 1-5 min / 5-30 min / 30+ min)
- Color grading offered (boolean)
- Sound design offered (boolean)
- Subtitle services (FR / AR / EN — multi-select)
- Stock footage / music sources used
- Raw delivery time per finished minute
- Revision policy

**Critical portfolio expectations:** Showreel (60-90 seconds), 3-5 finished pieces of varying types.

**Social media that matters:** YouTube, Vimeo, Behance, Instagram Reels, TikTok.

### 2.7 — Translator

**Extra fields:**
- Language pairs offered (with direction: e.g. "Anglais → Français", "Français → Arabe")
- Specialization domains (Legal / Medical / Technical / Marketing / Literary / Financial / General — multi-select)
- Words per day capacity
- CAT tools (SDL Trados / memoQ / OmegaT — multi-select, signals professional)
- Certifications (sworn translator, ATA, etc.)
- Native language (single select — critical signal)
- Editing/proofreading offered (boolean)
- Localization vs literal translation philosophy
- Rate per word (sometimes preferred over per-project)

**Critical portfolio expectations:** Sample translations, anonymized client lists, sworn certifications scanned.

**Social media that matters:** LinkedIn, ProZ.com, TranslatorsCafe.

### 2.8 — Virtual Assistant / Administrative

**Extra fields:**
- Service categories (Email management / Calendar / Data entry / CRM / Research / Customer support / Bookkeeping / Travel planning — multi-select)
- Software mastered (MS Office / Google Workspace / Notion / Trello / Asana / HubSpot / Salesforce / QuickBooks — multi-select)
- Hours available per week
- Time zones can work in
- Languages of communication
- Sensitive data handling experience (boolean — for legal/medical/finance work)
- NDA willingness
- Industries previously assisted

**Critical portfolio expectations:** Testimonials more critical than visuals. Process documentation samples.

**Social media that matters:** LinkedIn primarily.

### 2.9 — Consultant (Business / Finance / Legal)

**Extra fields:**
- Consulting specialty (Strategy / Operations / Marketing / Finance / Legal / HR / IT / Sustainability / Tax / Compliance — multi-select)
- Industries worked with
- Company sizes served (Startup / SME / Enterprise)
- Engagement types (Hourly advisory / Fixed project / Retainer / Equity)
- Professional credentials (CPA / CFA / Bar admission / MBA / etc.) with verification
- Years in industry vs years consulting
- Client confidentiality policy
- Geographic regulatory expertise (Tunisia / North Africa / EU / etc.)
- Languages business-fluent in

**Critical portfolio expectations:** Case studies (anonymized OK), testimonials, credentials.

**Social media that matters:** LinkedIn (essential), industry blogs.

### 2.10 — Voice talent / Audio professional

**Extra fields:**
- Voice characteristics (deep / warm / authoritative / friendly / energetic — multi-select)
- Accents available (FR Tunisian / FR Parisian / AR Tunisian / AR Levantine / AR Egyptian / English variants)
- Gender of voice (or both)
- Studio setup (Home studio / Pro studio / Both)
- Audio software (Pro Tools / Logic / Audacity — multi-select)
- Sample types ready (Commercial / Narration / IVR / E-learning / Audiobook / Character — multi-select)
- Per-word or per-finished-minute pricing
- Turnaround time per 1000 words

**Critical portfolio expectations:** Audio reel (30-60 sec), categorized samples.

**Social media that matters:** SoundCloud, YouTube, Voice123 / Voices.com profile.

### 2.11 — Educator / Tutor

**Extra fields:**
- Subjects taught (with level: primary / secondary / university / professional)
- Teaching languages
- Format (In-person / Remote video / Recorded course / Group / 1-on-1 — multi-select)
- Hourly rate or per-course pricing
- Curriculum followed (Tunisian national / French / IB / Cambridge / Custom — multi-select)
- Test prep specialties (BAC / DELF / IELTS / TOEFL / SAT — multi-select)
- Teaching philosophy / approach
- Age groups served
- Years teaching

**Critical portfolio expectations:** Student testimonials, results achieved, sample lesson plans.

**Social media that matters:** YouTube (if recording educational content), LinkedIn.

### 2.12 — Architect / 3D / Interior Designer

**Extra fields:**
- Software (AutoCAD / Revit / SketchUp / 3DS Max / Blender / Lumion / Rhino / V-Ray — multi-select)
- Project types (Residential / Commercial / Office / Restaurant / Healthcare / Educational — multi-select)
- Services offered (Concept / Schematic / DD / CDs / Site supervision / Renders only — multi-select)
- Style range (Modern / Traditional / Contemporary / Mediterranean / Industrial — multi-select)
- License or registration number
- Years registered
- Square meter range typically worked
- BIM proficiency

**Critical portfolio expectations:** Rendered images, plans, before/after for renovations, project descriptions with scope/timeline/budget.

**Social media that matters:** Instagram, Behance, ArchDaily portfolio, Pinterest.

### 2.13 — Influencer / Content creator / Brand ambassador

**Extra fields:**
- Primary platform + handle
- Other platforms with follower counts (auto-update via API later)
- Niche / vertical (Beauty / Fashion / Food / Tech / Lifestyle / Fitness / Business / etc.)
- Audience demographics (age, gender, location breakdown)
- Engagement rate per platform
- Content formats offered (Static post / Story / Reel / Video / Live / Blog mention — multi-select with pricing)
- Past brand collaborations (logos + descriptions)
- Brand exclusivity rules
- Content creation included or client-provided
- Disclosure compliance (FTC / Tunisian advertising standards)

**Critical portfolio expectations:** Media kit PDF, top performing posts, collaboration case studies.

**Social media that matters:** Their platforms ARE their portfolio.

---

## Section 3 — Portfolio system

The portfolio is the freelancer's silent salesperson. Industry research shows portfolios with samples are 50% more likely to land work (Upwork data).

### 3.1 — Portfolio piece structure

Each portfolio entry contains:

| Field | Type | Required | Notes |
|---|---|---|---|
| Title | text, 5-100 chars | ✅ | Outcome-named preferred over project-named. |
| Cover image | image | ✅ | Single hero shot, 1200x900 recommended. |
| Additional images | image array, max 10 | optional | Process shots, details, variants. |
| Video (optional) | video URL or upload | optional | YouTube/Vimeo embed or direct upload max 50MB. |
| Description | text, 100-1500 chars | ✅ | The story: context, problem, approach, outcome. |
| Role | text, 5-100 chars | optional | If team project. |
| Client (or "Personal project") | text | optional | Permission required if named. |
| Date completed | date | optional | Lets buyers see recency. |
| Skills/tools used | chip array | optional | Links to skills filter on profile. |
| Category | dropdown | ✅ | Same categories as services. |
| Live URL | text | optional | For web/dev work. |
| Source files | file upload | optional | For design work, on premium. |
| Featured order | integer | optional | Drag-to-reorder display. |

### 3.2 — Portfolio display modes

- **Grid view (default)** — Pinterest-style masonry of cover images. Most visual specialties.
- **List view** — Title + thumbnail + short description. Better for writers, consultants.
- **Case study view** — Long-form per piece, scrollable. Better for designers/developers with depth.

**Servyou specific:** Let freelancer choose display mode per their profile.

### 3.3 — Portfolio policies

- Min 3 pieces to mark profile "complete" (boost profile strength meter).
- Max 30 pieces (avoid overwhelming).
- Watermark warnings if image shared (basic deterrent).
- Report function for stolen work.
- "Featured" flag — 3 pinned pieces show first on profile.

### 3.4 — Portfolio inspiration sources (for freelancers)

Surface these as helpful links during portfolio creation:
- Behance.net (design)
- Dribbble.com (UI/visual)
- GitHub.com (dev)
- Vimeo.com / YouTube (video)
- Medium.com (writing)
- LinkedIn (universal)

---

## Section 4 — Social media & external presence

### 4.1 — Universal social links

Every freelancer can add ANY of these. Stored as `{platform, url, verified}` entries.

| Platform | Icon | Verification possible? | Trust signal |
|---|---|---|---|
| LinkedIn | linkedin | OAuth verification possible | High |
| Instagram | instagram | API verification possible | Medium |
| Facebook | facebook | OAuth | Medium |
| X (Twitter) | twitter / x | OAuth | Medium |
| TikTok | tiktok | API | Medium |
| YouTube | youtube | API | Medium |
| GitHub | github | OAuth | High (devs) |
| GitLab | gitlab | OAuth | High (devs) |
| Behance | behance | URL only | High (designers) |
| Dribbble | dribbble | URL only | High (designers) |
| Stack Overflow | stackoverflow | URL only | High (devs) |
| Medium | medium | URL only | High (writers) |
| Substack | substack | URL only | Medium |
| Pinterest | pinterest | URL only | Medium (visual) |
| Vimeo | vimeo | URL only | Medium (video) |
| SoundCloud | soundcloud | URL only | Medium (audio) |
| 500px | 500px | URL only | Medium (photo) |
| ArtStation | artstation | URL only | Medium (3D/illustration) |
| Personal website | globe | URL only | High |
| Personal blog | rss | URL only | Medium |
| Custom URL | link | URL only | Low |

### 4.2 — Display logic

- On profile: show as icon row with hover/tooltip, links open in new tab with `rel="noopener noreferrer"`.
- Max 10 social links visible (avoid clutter); rest in "Plus de liens" expandable.
- Verified badge if OAuth-confirmed (phase 3+).
- AR/RTL: icon row reverses naturally.

### 4.3 — Privacy considerations

- Each social link has visibility setting (Public / Logged-in users only / Hidden).
- Default to Public for portfolio platforms (Behance, GitHub) since they're meant for discovery.
- Default to Logged-in-only for personal social (Instagram, Facebook) to reduce spam/stalking.

### 4.4 — Tunisia-specific notes

- **LinkedIn** is the most universal trust signal regardless of specialty.
- **Instagram** is the de-facto portfolio for visual freelancers in Tunisia.
- **Facebook** still matters — many Tunisian SMBs find services via Facebook pages.
- **WhatsApp Business** profile link should be optional and standard (Tunisia primary comm).

---

## Section 5 — Professional tools by specialty

Tools listed on profile build trust (signals professional setup) and enable filtering (clients searching for "Figma designer" find Figma users).

### 5.1 — Design tools

**Industry standard list (controlled vocabulary):**
- Figma, Sketch, Adobe XD
- Adobe Photoshop, Adobe Illustrator, Adobe InDesign, Adobe After Effects, Adobe Premiere Pro, Adobe Lightroom
- Canva, Affinity Designer, Affinity Photo, Affinity Publisher
- Procreate, Clip Studio Paint
- Blender, Cinema 4D, 3DS Max, Maya, ZBrush
- Webflow, Framer
- InVision, Marvel, Zeplin, Abstract

### 5.2 — Development tools / languages

**Languages:** JavaScript, TypeScript, Python, Java, Kotlin, Swift, PHP, Ruby, Go, Rust, C, C++, C#, SQL, R, Dart, Solidity.

**Frontend frameworks:** React, Next.js, Vue, Nuxt, Angular, Svelte, SolidJS, Astro.

**Backend frameworks:** Node.js, Express, NestJS, Django, Flask, FastAPI, Laravel, Rails, Spring, .NET, Phoenix.

**Mobile:** React Native, Flutter, Swift/SwiftUI, Kotlin/Compose.

**Databases:** PostgreSQL, MySQL, MongoDB, Redis, Supabase, Firebase, DynamoDB.

**Cloud:** AWS, GCP, Azure, Vercel, Netlify, Supabase, DigitalOcean, Heroku.

**Dev tools:** Git, Docker, Kubernetes, VS Code, JetBrains IDEs, Linux, Bash.

### 5.3 — Marketing tools

Meta Ads Manager, Google Ads, Google Analytics 4, Google Tag Manager, SEMrush, Ahrefs, Mailchimp, Klaviyo, HubSpot, Salesforce, Hootsuite, Buffer, Later, Sprout Social, Canva, Notion, Airtable.

### 5.4 — Photo / Video tools

**Photo:** Adobe Lightroom, Capture One, DxO PhotoLab, Affinity Photo, Adobe Photoshop.

**Video:** Adobe Premiere Pro, Final Cut Pro, DaVinci Resolve, Adobe After Effects, Cinema 4D, Adobe Audition, Blender.

**Cameras (free-text usually):** Sony A7 series, Canon R5/R6, Nikon Z series, etc.

### 5.5 — Writing tools

Google Docs, MS Word, Notion, Scrivener, Grammarly, Hemingway, ProWritingAid, Ulysses, Substack.

### 5.6 — Translation tools

SDL Trados Studio, memoQ, OmegaT, Wordfast, MateCat, Smartcat.

### 5.7 — Project / collaboration

Slack, Notion, Trello, Asana, ClickUp, Linear, Monday, Jira, Discord, MS Teams, Zoom, Google Meet.

### 5.8 — Display format

Tools shown as small chips with brand icons. Max 12 visible, rest behind "Voir tous les outils".

---

## Section 6 — Payment methods & financial preferences (Tunisia)

This is where Servyou genuinely differentiates against global platforms — none of them handle Tunisian payment methods natively.

### 6.1 — Payment methods to support

| Method | Tunisia adoption | Use case | Phase |
|---|---|---|---|
| **Cash (Paiement à la livraison)** | Universal | COD-default, current Servyou model | 1 (current) |
| **Bank transfer (Virement bancaire)** | High among professionals | Larger projects, B2B | 1 |
| **D17 (La Poste digital wallet)** | Growing — millions of users | Small-to-medium consumer payments | 2 |
| **Flouci** | 250,000+ active accounts, growing | Modern digital wallet, QR/phone-based | 2 |
| **TUNPAY (umbrella from BCT)** | New 2026 standard | Will unify Flouci, D17, bank-backed wallets | 2-3 |
| **Bank card (Visa/Mastercard)** | Common in cities | Direct online payment | 3 |
| **Carte Technologique** | Limited (1000 TND/year cap) | International tech purchases | 3 |
| **PayPal** | Restricted in Tunisia | International clients only | 3 |
| **Payoneer** | Used by freelancers receiving from abroad | Receive from international clients | 3 |
| **Wise (TransferWise)** | Used by freelancers | International receive | 3 |
| **Western Union / MoneyGram** | Common for diaspora | Receive from abroad | 4 |
| **Cryptocurrency** | Banned in Tunisia (2026) | Not supported | N/A |

### 6.2 — Freelancer financial preferences fields

| Field | Type | Required | Phase | Notes |
|---|---|---|---|---|
| Accepted payment methods | multi-select from above | ✅ | 1 | Min 1 required. |
| Preferred payment method | dropdown of accepted methods | optional | 2 | Their #1 choice, surfaces in checkout. |
| Bank account info | encrypted text | optional | 3 | RIB for bank transfers. Stored encrypted. |
| D17 phone number | phone | optional | 2 | For D17 payments. |
| Flouci wallet ID | text | optional | 2 | For Flouci payments. |
| PayPal email | email | optional | 3 | For international clients. |
| Wise / Payoneer email | email | optional | 3 | For international clients. |
| Deposit required for projects > X TND | percentage + threshold | optional | 2 | Sets buyer expectations. |
| Currency willing to invoice in | multi-select (TND / EUR / USD) | optional | 3 | International work. |
| VAT-registered? | boolean + VAT number | optional | 3 | For business clients. |
| Issues receipts/invoices? | boolean | optional | 2 | Trust signal. |

### 6.3 — Display logic

- Show payment methods as small badges on profile (e.g. "💵 Espèces · 📱 D17 · 🏦 Virement").
- Public freelancer profile shows accepted methods only (privacy on actual numbers).
- Buyer-side checkout shows ONLY methods both buyer and freelancer accept.
- "Paiement à la livraison" remains the platform default to lower friction.

### 6.4 — Future state — escrow system

When Servyou eventually adds in-platform payments (post-MVP), the platform itself becomes a payment method:
- Buyer pays Servyou.
- Servyou holds in escrow.
- Released on milestone or delivery confirmation.
- This is THE long-term play but requires significant compliance work (BCT licensing).

---

## Section 7 — Verification & trust signals

In a nascent marketplace, trust is the #1 conversion factor.

### 7.1 — Verification levels

| Verification | How | Visibility | Phase | Trust impact |
|---|---|---|---|---|
| **Email verified** | Standard confirmation link | Badge on profile | 1 (already exists) | Low (baseline) |
| **Phone verified** | SMS code | Badge on profile | 1 | High in Tunisia |
| **CIN (national ID) verified** | Manual review of uploaded CIN | Badge "Identité vérifiée" | 2 | Very high |
| **Address verified** | Utility bill upload | No public badge, internal only | 3 | Low public, high admin |
| **Education verified** | Diploma upload | Badge per credential | 3 | High for tutors/consultants |
| **Professional license** | License doc upload | Badge "Profession réglementée" | 3 | Critical for architects, lawyers, accountants |
| **Bank account verified** | Micro-deposit or open banking | Badge "Paiement vérifié" | 3 | High |
| **Background check** | Third-party service | Badge "Antécédents vérifiés" | 4 | Critical for in-home services |

### 7.2 — Trust signals on profile

These are the visible elements every freelancer profile should surface:

- Verification badges (row of icons)
- Member since date ("Membre depuis Mars 2026")
- Profile completion percentage
- Services completed count
- Response time average ("Répond en moyenne en 2h")
- Response rate ("95% de réponses")
- Last seen / activity recency
- Languages spoken
- Reviews/ratings (deferred per roadmap)
- "Top Rated" / "Featured" badges (when introduced)
- Profile views count (optional vanity metric)

### 7.3 — Anti-fraud signals (internal admin)

Track but don't display:
- Account age vs. activity ratio (very new + very active = suspicious)
- IP / device duplication with other accounts
- Off-platform contact attempts in messages
- Repeated cancellations or disputes
- Payment method mismatches

---

## Section 8 — Availability & business preferences

### 8.1 — Availability fields

| Field | Type | Required | Phase | Notes |
|---|---|---|---|---|
| Availability status | enum (Disponible / Occupé / En vacances / Indisponible) | ✅ | 1 | Sets profile badge + filter eligibility. |
| Working hours | array of {day, start, end} | optional | 2 | Sets buyer expectations. |
| Vacation dates | date range | optional | 2 | Auto-sets status to "En vacances". |
| Response time commitment | enum (≤1h / ≤4h / ≤24h / ≤48h / 2-3 days) | optional | 2 | Trust signal + expectation. |
| Maximum concurrent projects | integer | optional | 3 | Helps prevent overcommit. |
| Lead time required | text ("Disponible sous 1 semaine") | optional | 2 | Realistic capacity signal. |
| Rush order available | boolean + surcharge | optional | 2 | Upsell opportunity. |

### 8.2 — Business preferences

| Field | Type | Required | Phase | Notes |
|---|---|---|---|---|
| Project minimum value | numeric TND | optional | 2 | "Je travaille sur des projets à partir de 100 TND". |
| Project maximum value | numeric TND | optional | 3 | Indicates scope range. |
| Engagement types preferred | multi-select (Project / Hourly / Retainer / Long-term) | optional | 2 | |
| Client size preference | multi-select (Particulier / TPE / PME / Grande entreprise) | optional | 2 | |
| Industries served | multi-select | optional | 2 | |
| Industries refused | multi-select | optional | 3 | Some refuse gambling, alcohol, adult, etc. |
| Contract type | enum (Per-project / Recurring / Both) | optional | 2 | |
| NDA willingness | boolean | optional | 2 | |
| IP transfer included | enum (Yes / No / Per agreement) | optional | 2 | Critical for design/dev. |
| Revisions philosophy | text | optional | 3 | "Je propose 2 révisions gratuites, puis 50 TND par révision supplémentaire". |

---

## Section 9 — Communication preferences

### 9.1 — Communication channels

| Channel | Tunisia priority | Phase | Notes |
|---|---|---|---|
| **In-platform messaging** | Should exist for safety | 3 | Required for dispute protection. |
| **WhatsApp** | THE primary channel in Tunisia | 1 | One-tap button after engagement. |
| **Phone call** | Common for B2B | 1 | Reveal after engagement only. |
| **Email** | Common for professionals | 2 | Reveal after engagement. |
| **Video call (Meet/Zoom)** | Growing for consultants | 2 | Schedule via platform. |
| **In-person meeting** | For local services | 2 | City filter critical here. |

### 9.2 — Communication preferences fields

- Preferred communication channel (dropdown)
- WhatsApp number (with country code default +216)
- Hide phone number until engagement (boolean default true)
- Preferred call hours (text)
- Languages of communication
- Response time commitment (already in availability)
- Auto-response message (when offline)

### 9.3 — Tunisian-specific notes

- **WhatsApp is non-negotiable.** Most Tunisian SMBs and individuals prefer WhatsApp over any other channel.
- **Voice notes are common** in Tunisian WhatsApp culture. Don't fight this.
- **Bilingual messaging** — many conversations mix French and Arabic mid-sentence. Platform should support this.

---

## Section 10 — Tunisia-specific differentiators

Where Servyou wins against Fiverr/Upwork:

### 10.1 — The five pillars

1. **WhatsApp-first communication** — embraced, not hidden
2. **Bilingual (FR + AR) native** — not translated, designed bilingually
3. **TND-first pricing** — no currency confusion
4. **Local categories** — Tunisian-specific (Hijab styling, Couscous classes, Henna art, Calligraphie arabe, Tabbouleh delivery, etc.)
5. **Local payment methods** — Flouci, D17, bank transfer, COD-first

### 10.2 — Cultural specifics

- **Family / relationship-based commerce** — testimonials matter more than star ratings
- **Bargaining is normal** — allow "Faire une offre" alternative to fixed price
- **Cash is still king** in many areas — COD-default is correct
- **Phone verification feels safer than email** — emphasize phone
- **Local pride matters** — "Made in Sousse" / "Tunisien expatrié" filters
- **Ramadan adjustments** — availability calendar should support fasting hours

### 10.3 — Geographic filters

- Governorate (24 in Tunisia)
- City within governorate
- Neighborhood for large cities (Tunis, Sfax)
- "Près de moi" using GPS
- "Sur place" / "À distance" / "Hybride"

### 10.4 — Tunisia-specific service categories worth adding

Beyond global standards:
- Tabbouleh / Couscous / pastry home delivery
- Hijab styling and consultation
- Henna art for events
- Arabic calligraphy
- Wedding planning (Tunisian-style)
- Hammam / spa at home
- Coran tutoring
- Tunisia tour guiding
- Diaspora services (paperwork for Tunisians abroad)
- French-Arabic bilingual content creation
- Maghrebi cuisine catering
- Berber craft and pottery
- Olive oil / agricultural products

---

## Section 11 — DB schema implications

This section maps the fields above to required DB tables.

### 11.1 — Existing tables to extend

**`freelancer_profiles` — add:**
- `display_name` text
- `tagline` text
- `service_area` text (enum)
- `travel_willingness` text (enum)
- `accepts_international` boolean
- `availability_status` text (enum)
- `response_time_commitment` text (enum)
- `project_min_value_tnd` numeric
- `project_max_value_tnd` numeric
- `years_freelancing` smallint
- `working_hours` jsonb (array of day/start/end)
- `vacation_until` date
- `auto_response_message` text
- `nda_willing` boolean
- `vat_registered` boolean
- `vat_number` text
- `issues_invoices` boolean

**`service_listings` — already extended in PR-F2.3:**
- `deliverables` text[]
- `revisions_count` smallint
- `tags` text[]
- `buyer_briefing` text

Future additions:
- `samples` jsonb (array of {url, type, alt}) — when Storage ready
- `faq` jsonb (array of {q, a})
- `process_steps` jsonb (array of {title, description})

### 11.2 — New tables needed

**`freelancer_languages`**
- `freelancer_id` FK
- `language_code` text (fr/ar/en/it/de/es)
- `proficiency` text (enum: natif/courant/conversationnel/notions)
- `is_primary` boolean

**`freelancer_skills`** (if upgrading from text[])
- `freelancer_id` FK
- `skill_name` text
- `proficiency` text (enum: débutant/intermédiaire/avancé/expert)
- `years_experience` smallint
- `is_featured` boolean

**`freelancer_education`**
- `freelancer_id` FK
- `institution` text
- `degree` text
- `field` text
- `year_start` smallint
- `year_end` smallint nullable
- `description` text nullable

**`freelancer_certifications`**
- `freelancer_id` FK
- `name` text
- `issuing_org` text
- `year` smallint
- `credential_url` text nullable
- `is_verified` boolean

**`freelancer_tools`**
- `freelancer_id` FK
- `tool_name` text
- `tool_category` text
- `proficiency` text (enum) nullable

**`freelancer_social_links`**
- `freelancer_id` FK
- `platform` text (enum from Section 4.1)
- `url` text
- `is_verified` boolean
- `visibility` text (enum: public/logged_in/hidden)
- `display_order` smallint

**`freelancer_payment_methods`**
- `freelancer_id` FK
- `method` text (enum from Section 6.1)
- `is_preferred` boolean
- `account_info_encrypted` text (for sensitive data)

**`freelancer_portfolio`**
- `id` uuid
- `freelancer_id` FK
- `title` text
- `description` text
- `cover_image_url` text
- `additional_images` text[]
- `video_url` text nullable
- `category_id` FK nullable
- `role` text nullable
- `client_name` text nullable
- `completed_at` date nullable
- `live_url` text nullable
- `is_featured` boolean
- `display_order` smallint
- `created_at`, `updated_at`

**`freelancer_portfolio_tools`** (M2M)
- `portfolio_id` FK
- `tool_name` text

**`saved_missions`** (for the deferred missions sauvegardées page)
- `freelancer_id` FK
- `job_post_id` FK
- `saved_at` timestamp

**`freelancer_verifications`**
- `freelancer_id` FK
- `verification_type` text (enum: phone/email/cin/address/education/license/bank/background)
- `status` text (enum: pending/verified/rejected)
- `verified_at` timestamp nullable
- `evidence_url` text nullable (S3 path)
- `notes` text nullable

### 11.3 — RLS principles for all freelancer tables

- SELECT: public for visibility-public rows, owner-only for sensitive
- INSERT/UPDATE/DELETE: owner only (freelancer_id = auth.uid() via freelancer_profiles join)
- Verification tables: insert by owner, status updated by admin only

---

## Section 12 — Implementation phases

### Phase 1 — MVP launch (now → next 2-3 weeks)

**Goal:** Freelancers can sign up, create profile, list services, receive demandes, respond to jobs.

PRs:
- PR-F2.3 (in progress) — Service form world-class fields
- PR-F3 — Demandes page
- PR-F4 — Réponses page (with active count enforcement)
- PR-F5 — Missions sauvegardées (DB + page)
- PR-F6 — Job board detail page
- PR-F7 — Profile creation wizard (3 steps: Basics → Skills + Languages → Configurable workspace + Payment methods)
- PR-F8 — Public freelancer profile page
- PR-F9 — Dashboard upgrade (profile %, onboarding checklist, availability toggle)
- PR-F10 — "Become a Freelancer" marketing page
- PR-F11 — Service delete + duplicate (small UX)

**Verification level supported:** Email + Phone.
**Payment methods supported:** Cash (COD), Bank transfer, Flouci, D17.
**Communication:** WhatsApp + Phone (after engagement).

### Phase 2 — Trust & polish (weeks 4-8)

**Goal:** Build trust signals, add gallery, deepen profile.

PRs:
- PR-F12 — Sample images on services (requires Supabase Storage setup)
- PR-F13 — Avatar + banner upload on profile
- PR-F14 — Portfolio system (3-piece minimum to mark "complete")
- PR-F15 — Education + Certifications repeatable rows
- PR-F16 — CIN verification (manual admin review flow)
- PR-F17 — Tools / software chips on profile
- PR-F18 — Social media links system
- PR-F19 — Skill proficiency levels
- PR-F20 — Vacation mode / working hours
- PR-F21 — Service performance analytics (views, contacts)

### Phase 3 — Communication & engagement (weeks 9-12)

**Goal:** In-platform messaging, notifications, reviews.

PRs:
- PR-F22 — In-platform messaging
- PR-F23 — Notifications inbox
- PR-F24 — Reviews and ratings system (per docs.md, deferred from earlier)
- PR-F25 — Direct hire flow (skip job post entirely)
- PR-F26 — Multi-tier pricing (Basic / Standard / Premium)
- PR-F27 — Add-ons / extras on services

### Phase 4 — Financial & operational depth (months 4-6)

**Goal:** Real financial infrastructure.

PRs:
- PR-F28 — Earnings dashboard / financial reports
- PR-F29 — Invoice generation (PDF)
- PR-F30 — Escrow / in-platform payments (requires BCT compliance work)
- PR-F31 — Withdrawals via Flouci/bank
- PR-F32 — Tax statement export
- PR-F33 — Background checks integration
- PR-F34 — Professional license verification

### Phase 5 — Scale & advanced (month 6+)

**Goal:** Power-user features, scale optimizations.

PRs:
- PR-F35 — Saved searches with email alerts
- PR-F36 — Saved proposal templates
- PR-F37 — Service templates library
- PR-F38 — Skill assessments / badges
- PR-F39 — Intro video upload
- PR-F40 — Featured / promoted listings (monetization)
- PR-F41 — Calendar booking system
- PR-F42 — Team / agency accounts (Upwork-style)
- PR-F43 — API for power users (mobile app integration)

---

## Section 13 — How CC should reference this document

For every freelancer-related PR, CC should:

1. **Identify which section(s) apply** (e.g., "Building Demandes page → Section 11, see also Section 9 for communication patterns")
2. **Check phase indication** — only build phase-appropriate fields
3. **Verify Tunisia-specific guidance** in Section 10 is honored
4. **Confirm DB schema implications** in Section 11 are followed
5. **Cite this doc in commit body** when implementing patterns from it ("Per spec Section 6.2, accepted payment methods stored in freelancer_payment_methods table")

This document is **a strategic compass, not a rigid blueprint.** Adapt where reality requires. Update this doc when strategy shifts.

---

## Appendix A — Competitor feature comparison matrix

(Snapshot as of 2026-06)

| Feature | Fiverr | Upwork | Toptal | Malt | Servyou (target) |
|---|---|---|---|---|---|
| Profile completion meter | ✅ | ✅ | N/A (vetted) | ✅ | ✅ Phase 1 |
| Multi-tier pricing | ✅ (3 tiers) | Project Catalog | N/A | ❌ | 🟢 Phase 3 |
| Portfolio | ✅ | ✅ | ✅ | ✅ | ✅ Phase 2 |
| Social media links | ✅ | ✅ | ✅ | ✅ | ✅ Phase 2 |
| Tools/software | ✅ | ✅ | ✅ | ✅ | ✅ Phase 2 |
| Verification badges | ✅ | ✅ (Top Rated) | ✅ (manually) | ✅ | ✅ Phase 1-3 |
| Availability toggle | ✅ | ✅ | ✅ | ✅ | ✅ Phase 1 |
| Multiple languages | ✅ EN-first | ✅ EN-first | ✅ EN-first | ✅ multi-EU | ✅ FR+AR native |
| Local payment methods | ❌ (Stripe global) | ❌ | ❌ | Partial (EU) | ✅ Phase 1 (Flouci/D17/COD) |
| WhatsApp integration | ❌ (forbidden) | ❌ (forbidden) | ❌ | ❌ | ✅ Phase 1 |
| In-platform messaging | ✅ | ✅ | ✅ | ✅ | 🟢 Phase 3 |
| Escrow payments | ✅ | ✅ | ✅ | ✅ | 🟢 Phase 4 |
| Reviews/ratings | ✅ | ✅ (JSS) | ✅ | ✅ | 🟢 Phase 3 |
| Geographic filtering | Basic | Basic | N/A | Country-level | ✅ Phase 1 (governorate+city) |
| Cultural relevance | Generic global | Generic global | Western | EU-centric | ✅ Tunisia-native |

---

## Appendix B — Glossary

- **CIN** — Carte d'Identité Nationale (Tunisian national ID)
- **COD** — Cash on Delivery (Paiement à la livraison)
- **D17** — Digital wallet from La Poste Tunisienne
- **Flouci** — Tunisian digital banking startup
- **TUNPAY** — 2026 BCT umbrella label for unified digital wallets
- **BCT** — Banque Centrale de Tunisie
- **RIB** — Relevé d'Identité Bancaire (bank account identifier)
- **TND** — Tunisian Dinar
- **TPE/PME** — Très Petite Entreprise / Petite et Moyenne Entreprise (Tunisia SMB terminology)
- **JSS** — Job Success Score (Upwork)
- **NDA** — Non-Disclosure Agreement
- **KYC** — Know Your Customer
- **RLS** — Row Level Security (Supabase)

---

**End of specification document.**

This document should evolve as Servyou learns from real users. Major revisions should be commit-tracked in the project, with each version dated.
