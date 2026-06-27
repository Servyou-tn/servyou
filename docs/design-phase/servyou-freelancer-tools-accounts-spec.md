# Servyou Freelancer Tools & Professional Accounts Specification

> **Companion document to `servyou-freelancer-world-class-spec.md`.**
>
> Defines: which **tools** and which **professional accounts** matter for each of the **top 15 freelancer categories**, how the platform **suggests them**, how the freelancer **connects them**, how they **show up in the portfolio**, how the **codebase implements them** on Servyou's existing Next.js 16 + Supabase stack, and the **security + scalability** standards every implementation must meet.
>
> **Status:** Strategic — drives Phase 1 freelancer profile wizard (PR-F7) and all later profile-deepening PRs.
> **Last updated:** 2026-06-25
> **Use:** Both human strategic reference AND Claude Code reads this before any tools / accounts / portfolio PR.

---

## How to use this document

1. **For the profile wizard:** When a freelancer picks their specialty, the form pre-suggests the tools and accounts in the corresponding Section 1-15. The freelancer accepts, removes, or adds.
2. **For DB schema decisions:** Section 18 is the authoritative table layout. All migrations follow it.
3. **For OAuth integration PRs:** Section 16-17 define the connection patterns. Section 19 defines the security rules each integration must follow.
4. **For category seed data:** Each Section 1-15 contains the seed list of tools + accounts to populate in the catalog tables. The full master seed is consolidated in Section 22.
5. **For Servyou's principles:** Every recommendation honors the three pillars — **Trust signals + Bilingual (FR/AR) + WhatsApp**. Tools or accounts that don't support one of these get deprioritized.

---

## Table of contents

**Strategic — the 15 categories:**
- [Section 0 — Universal tools (apply to every freelancer)](#section-0--universal-tools)
- [Section 1 — Graphic Designer](#section-1--graphic-designer)
- [Section 2 — UI / UX Designer](#section-2--ui--ux-designer)
- [Section 3 — Web Developer](#section-3--web-developer)
- [Section 4 — Mobile Developer](#section-4--mobile-developer)
- [Section 5 — UGC Creator](#section-5--ugc-creator)
- [Section 6 — Social Media Manager](#section-6--social-media-manager)
- [Section 7 — Digital Marketer / SEO Specialist](#section-7--digital-marketer--seo-specialist)
- [Section 8 — Content Writer / Copywriter](#section-8--content-writer--copywriter)
- [Section 9 — Translator](#section-9--translator)
- [Section 10 — Video Editor / Motion Designer](#section-10--video-editor--motion-designer)
- [Section 11 — Photographer / Videographer](#section-11--photographer--videographer)
- [Section 12 — Voice Over Artist / Audio Producer](#section-12--voice-over-artist--audio-producer)
- [Section 13 — Data Analyst / Data Scientist](#section-13--data-analyst--data-scientist)
- [Section 14 — AI Specialist / Prompt Engineer / ML Engineer](#section-14--ai-specialist)
- [Section 15 — Virtual Assistant / Admin Support](#section-15--virtual-assistant--admin-support)

**Architectural — how it lives in the codebase:**
- [Section 16 — Tool & account connection patterns](#section-16--connection-patterns)
- [Section 17 — Portfolio integration patterns](#section-17--portfolio-integration-patterns)
- [Section 18 — Codebase integration architecture (DB schema)](#section-18--codebase-integration-architecture)
- [Section 19 — Security standards](#section-19--security-standards)
- [Section 20 — Scalability standards](#section-20--scalability-standards)
- [Section 21 — Implementation phases](#section-21--implementation-phases)
- [Section 22 — Master seed catalog](#section-22--master-seed-catalog)

---

## How categories were chosen

The 15 categories are drawn from 2026 Fiverr + Upwork data (Upwork Future Workforce Index 2026, Fiverr's 2025 Business Trends Report), filtered to what is **realistic in the Tunisian freelance market** in the next 24 months. AI services are growing the fastest globally (Upwork reports +109% YoY demand for AI-related freelance skills), UGC is reshaping the creator economy, and traditional software/design/marketing categories still dominate paid work. The list intentionally **does not** include hyper-niche categories (game dev, blockchain dev, animator, illustrator, life coach, music producer, accountant) — those can be added as `autre` (other) free-text specialties at signup, and graduated into their own sections only when usage justifies it.

---

## Section 0 — Universal tools

Every freelancer, regardless of specialty, needs these. They are pre-suggested in **every** profile wizard as a separate "Outils universels" group, opt-in by checkbox.

### Communication
- **WhatsApp** — non-negotiable in Tunisia, primary client channel
- **Email** (Gmail / Outlook) — formal threads, contracts
- **Slack / Discord** — for clients with team workflows
- **Zoom / Google Meet** — discovery calls, briefings, presentations
- **Loom** — async video walkthroughs (huge for explaining work to clients)

### Project & time management
- **Notion** — content management, client briefs, personal CRM (top universal pick)
- **Trello / ClickUp / Asana** — kanban/task tracking for client work
- **Toggl Track / Clockify** — time tracking for hourly contracts
- **Calendly / Cal.com** — booking discovery calls without back-and-forth

### File handling
- **Google Drive / Google Workspace** — primary file sharing in Tunisia (free, ubiquitous)
- **Dropbox** — large file delivery to international clients
- **WeTransfer** — quick one-off large transfers (no account needed for client)

### Billing & finance
- **Wave / FreshBooks** — invoicing (international clients)
- **Notion or Google Sheets** — personal income tracking (most TN freelancers start here)
- **Flouci / D17 / Bank app** — local payment receipt
- **PayPal / Wise** — international payment receipt (capital control caveats apply, see world-class spec Section 6)

### Productivity & focus
- **Google Workspace (Docs/Sheets/Slides)** — almost universal in Tunisia
- **Microsoft 365** — corporate clients often require Word/Excel deliverables
- **Obsidian / Roam** — personal knowledge (niche, opt-in)

**Pre-checked universal defaults for every freelancer:** WhatsApp, Email, Google Drive, Zoom, Notion, Calendly. The freelancer can deselect any.

---

## Section 1 — Graphic Designer

Covers: logo design, branding, print design, packaging, illustration, social media graphics.

### Essential tools (tier 1 — pre-checked)

| Tool | Category | Notes |
|---|---|---|
| **Adobe Photoshop** | Raster editing | Industry standard for photo manipulation, social graphics |
| **Adobe Illustrator** | Vector design | Industry standard for logos, branding, print |
| **Adobe InDesign** | Layout | Print/multi-page (magazines, brochures, packaging) |
| **Figma** | Multi-purpose | Increasingly used for branding presentations + social templates |
| **Canva** | Entry/templates | Many clients ask for editable Canva files; junior designers live here |

### Professional tools (tier 2 — suggested as opt-in chips)
- **Affinity Designer / Photo / Publisher** — Adobe alternative, one-time purchase, popular with budget-conscious designers
- **Procreate** — iPad illustration
- **Adobe After Effects** — animated logos, motion branding
- **CorelDRAW** — niche, still common in older agencies
- **Sketch** — Mac-only, declining (7% market share)

### Showcase & portfolio platforms
- **Behance** (Adobe-owned, primary platform for graphic designers globally — every serious designer has one)
- **Dribbble** — community + small visual shots (also strong for designers)
- **Instagram** — increasingly important as portfolio (visual-first)
- **Personal site** (Adobe Portfolio if Creative Cloud subscriber — free, integrated with Behance)

### Professional accounts (suggested)
- **LinkedIn** — essential for B2B work
- **Behance** — primary portfolio account
- **Dribbble** — secondary portfolio account (invitation-based historically, now open)
- **Instagram** — work-only account, separate from personal

### Verification signals
- Adobe Creative Cloud subscription (claimed, not verified by platform)
- Behance account verified via OAuth → instant trust signal
- Certifications: Adobe Certified Professional, Coursera/CalArts certifications

### Tunisia-specific notes
- Logo design + brand identity is the highest-volume entry-level category
- Restaurant menus, salon branding, real estate signage are bread-and-butter local work
- Arabic typography skills (Naskh, Kufic, modern Arabic display fonts) command premium

---

## Section 2 — UI / UX Designer

Covers: web design, mobile app design, product design, prototyping, design systems, UX research.

### Essential tools (tier 1 — pre-checked)

| Tool | Category | Notes |
|---|---|---|
| **Figma** | Design + prototyping | The dominant tool — 83% of professional UI designers use it as primary (UX Tools 2024 Survey). Multiplayer, browser-based, ecosystem of 5000+ plugins. |
| **FigJam** | Whiteboarding | Workshops, user flows, brainstorming |
| **Adobe XD** | Design + prototyping | Declining (3% market share) but still in corporate workflows |
| **Sketch** | UI design (Mac-only) | 7% market share, loyal macOS-native base |

### Professional tools (tier 2 — opt-in)
- **Framer** — design + publish live React-backed websites (rising fast for portfolios and landing pages)
- **Penpot** — open-source Figma alternative, 500k+ active users, self-hostable
- **ProtoPie** — high-fidelity interactive prototypes (sensor-based, complex states)
- **Axure RP** — enterprise wireframes with complex conditional logic
- **Balsamiq** — low-fi wireframing
- **Miro** — collaborative whiteboarding, research synthesis
- **Whimsical** — wireframes + flowcharts + sticky notes (fast UX docs)
- **Mobbin** — pattern library / real-world reference (research stage)

### User testing tools (opt-in)
- **Maze** — unmoderated remote testing
- **Lyssna** (formerly UsabilityHub) — 5-second tests, preference tests
- **Dscout** — diary studies, mobile research
- **Hotjar** — heatmaps + session recordings
- **Microsoft Clarity** — free Hotjar alternative
- **UserTesting** — moderated testing platform

### Showcase & portfolio platforms
- **Behance** — primary for case studies (writeup + visuals)
- **Dribbble** — micro-shots, animations, polished concepts
- **Personal site** — Framer is the rising tool of choice for UX portfolios in 2026
- **Notion case studies** — increasingly common, linked from personal site
- **Read.cv / **Cargo** / **Semplice** — alternative portfolio platforms

### Professional accounts (suggested)
- **LinkedIn** — essential
- **Behance** — primary portfolio account
- **Dribbble** — secondary portfolio account
- **Twitter/X** — UX Twitter is active for thought leadership

### Verification signals
- Figma Pro / Organization seat (claimed)
- Behance / Dribbble OAuth-verified profile
- Certifications: Nielsen Norman UX Certification, Google UX Design Certificate, Interaction Design Foundation

### Tunisia-specific notes
- Strong demand from European startups (Tunisia timezone alignment + lower rates)
- French + English bilingualism is competitive advantage
- Local SMBs increasingly need Arabic RTL UX work (banking apps, telco, e-gov)

---

## Section 3 — Web Developer

Covers: frontend, backend, full-stack, e-commerce, CMS (WordPress, Webflow), no-code.

### Essential tools (tier 1 — pre-checked)

| Tool | Category | Notes |
|---|---|---|
| **VS Code** | IDE | Dominant editor (free, extensible) |
| **Cursor** | AI-IDE | Rapidly growing, AI-pair programming |
| **Git** | Version control | Universal |
| **GitHub** | Code hosting | Primary portfolio platform for developers |
| **Terminal / iTerm2 / Windows Terminal** | CLI | Daily driver |
| **Chrome DevTools** | Browser tools | Universal debug |

### Frontend stack (opt-in chips)
- **React** + **Next.js** + **Tailwind CSS** (most common 2026 stack)
- **Vue** + **Nuxt** (Europe especially strong)
- **Svelte / SvelteKit** (rising)
- **Angular** (enterprise)
- **HTML / CSS / JavaScript / TypeScript** (universal baseline)
- **Webflow / Framer / Squarespace / Wix** (no-code/low-code clients)
- **WordPress** + Elementor + WooCommerce (still massive in Tunisia for SMB sites)

### Backend stack (opt-in chips)
- **Node.js** + Express / Fastify / Hono
- **Python** + Django / FastAPI / Flask
- **Ruby on Rails**
- **PHP** + Laravel / Symfony (huge in Tunisia, local agencies live here)
- **Go**, **Rust**, **Java/Spring** (specialist)

### Database & data
- **PostgreSQL** (best-in-class open source RDBMS)
- **MySQL / MariaDB**
- **MongoDB** (document)
- **Supabase** (Postgres + auth + storage — rising fast)
- **Firebase** (Google equivalent)
- **Redis** (caching)

### Cloud & deployment
- **Vercel** (Next.js + frontend)
- **Netlify**
- **AWS / Amazon EC2 / Lambda / S3**
- **Google Cloud Platform**
- **Microsoft Azure**
- **DigitalOcean / Linode / Hetzner** (cost-conscious)
- **Cloudflare** (CDN, Workers, Pages)

### DevOps tooling (opt-in)
- **Docker** + **Kubernetes**
- **GitHub Actions / GitLab CI / CircleCI**
- **Terraform** (infra-as-code)
- **Sentry / DataDog / New Relic** (monitoring)

### Showcase & portfolio platforms
- **GitHub** — THE proof for developers; clients check it before anything else
- **Personal portfolio site** with **live deployed demos** (the demo matters more than the screenshot)
- **CodeSandbox / StackBlitz** for interactive snippets
- **Dev.to / Hashnode / personal blog** for thought leadership

### Professional accounts (suggested)
- **GitHub** (verified via OAuth)
- **LinkedIn**
- **Stack Overflow** (rep is a signal)
- **GitLab** (if relevant)
- **Dev.to** / **Hashnode** (writing)
- **Discord** developer community presence (Next.js, React, etc.)

### Verification signals
- GitHub OAuth → public repos, stars, contribution graph, top languages displayed
- Stack Overflow reputation badge (linked profile)
- Open-source contributions (linked PRs to popular repos)
- Cloud certifications: AWS Certified Solutions Architect, GCP Professional Cloud Architect

### Tunisia-specific notes
- PHP + WordPress + WooCommerce is the dominant local stack (TN SMBs)
- React/Next.js + Supabase rising for new builds
- Strong outsourcing demand from France, Germany, US (timezone + French)
- Cybersecurity dev rising (banking sector compliance pressure)

---

## Section 4 — Mobile Developer

Covers: iOS, Android, cross-platform (React Native, Flutter), mobile games (Unity/Unreal — light coverage).

### Essential tools (tier 1 — pre-checked)

| Tool | Platform | Notes |
|---|---|---|
| **Xcode** | iOS native | Required for iOS |
| **Android Studio** | Android native | Official Android IDE |
| **VS Code / Cursor** | Cross-platform | RN, Flutter, web |
| **Git + GitHub** | Universal | Same as web dev |
| **Terminal** | Universal | |

### Cross-platform frameworks (opt-in)
- **React Native** + Expo (most common cross-platform)
- **Flutter** + Dart (Google-backed, rising)
- **Ionic / Capacitor** (web-tech wrappers)
- **Kotlin Multiplatform** (newer)

### Languages
- **Swift** (iOS)
- **Kotlin** (Android primary)
- **Java** (Android legacy)
- **Objective-C** (iOS legacy)
- **Dart** (Flutter)
- **JavaScript / TypeScript** (RN)

### Backend services (mobile-friendly)
- **Firebase** (auth, Firestore, push notifications, Crashlytics — dominant for indie/SMB mobile)
- **Supabase** (rising alternative)
- **AWS Amplify**
- **Backend4Apps**

### Distribution & analytics
- **App Store Connect** (iOS — required publisher account, $99/yr)
- **Google Play Console** (Android — required, $25 one-time)
- **TestFlight** (iOS beta distribution)
- **Firebase App Distribution** (cross-platform beta)
- **Fastlane** (CI/CD for mobile)
- **Mixpanel / Amplitude / Firebase Analytics** (product analytics)
- **App Annie / Sensor Tower** (market intelligence)

### Showcase & portfolio platforms
- **App Store / Play Store links** — the actual published app is the proof
- **GitHub** (open-source samples, repo READMEs)
- **YouTube** demo videos
- **Personal site** with phone-frame screenshots + download badges

### Professional accounts (suggested)
- **GitHub**
- **LinkedIn**
- **App Store Connect** (verified Apple Developer Program = trust signal)
- **Google Play Console** (verified publisher account)
- **Stack Overflow**

### Verification signals
- Apple Developer Program membership (claimed, hard to verify externally — admin can ask for screenshot)
- Published apps with public Store URLs (click-through verification — fetch and validate Store metadata)
- GitHub OAuth for mobile-related repos

### Tunisia-specific notes
- iOS development less common (lower iPhone penetration in Tunisia + dev hardware cost)
- Android + React Native + Flutter dominate
- Many devs publish on Play Store but hit App Store $99/yr barrier — Servyou should show this realistically

---

## Section 5 — UGC Creator

Covers: User-Generated Content for brand advertising. Distinct from influencer (no audience needed) — UGC creators are paid to make brand-style native content the brand uses in their own ads. **Fastest-growing creator category in 2026.**

### Essential equipment (different from "tools" — but pre-checked as a chip group)

| Equipment | Notes |
|---|---|
| **Smartphone** (iPhone 12+ or equivalent Android) | Primary camera — 90% of UGC is phone-shot |
| **Ring light or LED panel** | Even lighting, essential for skin and product close-ups |
| **Lavalier mic** (Rode Wireless Go II, DJI Mic, BOYA) | Cleans up audio dramatically vs phone mic |
| **Tripod / phone mount** | Stable shots, hands-free |
| **Natural light spot** (window) | Free, often best |

### Essential editing tools (tier 1 — pre-checked)

| Tool | Notes |
|---|---|
| **CapCut** | Built by ByteDance (TikTok parent), 200M+ MAU, free, mobile + desktop, dominates UGC editing |
| **InShot** | Mobile, fast, beginner-friendly |
| **Adobe Premiere Rush** | Mobile + desktop, Adobe ecosystem |
| **Descript** | AI transcription + edit-by-text + AI voices (huge productivity tool for UGC) |

### Subtitle / caption tools (essential — brands often watch with sound off)
- **Submagic** (auto-captions, viral subtitle styles)
- **Kapwing**
- **CapCut auto-captions** (built-in)
- **Veed.io**

### Audio enhancement
- **Adobe Enhance AI** (one-click cleanup)
- **Krisp** (background noise removal)
- **Auphonic** (levels + mastering)

### UGC marketplaces (where creators FIND work — separate from showcase)
- **Billo** — DTC video ad focus, $79+/video, US-leaning
- **Collabstr** — 78K+ creators, marketplace, used by 130K+ brands (McDonald's, Wealthsimple)
- **JoinBrands** — 250K+ creators, US-focused, credit-based
- **SideShift** — 500K+ US creators, Gen Z + TikTok-first
- **Insense** — paid social campaign focus
- **Cohley** — enterprise UGC + photo + reviews, 100K+ creators
- **Creator.co** — beginner-friendly, brand briefs
- **Aspire (formerly AspireIQ)** — 1M+ creators, ambassador programs

### Project management (essential at scale)
- **Notion / Trello / Airtable** — track briefs, deadlines, revision rounds, usage rights expiration
- **Frame.io / Google Drive** — delivery to brands
- **DocuSign / HelloSign** — contracts before filming

### Showcase & portfolio platforms (the actual content lives on...)
- **TikTok** — primary UGC showcase, brands recruit here
- **Instagram Reels** — secondary showcase
- **YouTube Shorts** — growing
- **Personal portfolio site** (often Carrd, Linktree-style, or a Notion site)
- **TikTok Creative Center** — public showcase of viral content (creators reference their own hits)

### Professional accounts (suggested)
- **TikTok Business Account** — analytics + business features
- **Instagram Creator / Professional Account**
- **TikTok Creator Marketplace** (TTCM) profile — verified UGC creator status
- **LinkedIn** — increasingly used for B2B UGC sales/positioning
- **A UGC marketplace profile** (Billo, Collabstr — verified via OAuth or profile claim)

### Verification signals
- TikTok OAuth (verified handle + follower count + engagement)
- Instagram OAuth (verified handle + content count)
- Marketplace verified status (Billo Pro, JoinBrands Certified, etc.)
- Authenticity rating from prior brand reviews

### Tunisia-specific notes — IMPORTANT
- **UGC is one of the strongest emerging Tunisian opportunities** — low capital required (phone + ring light = under 200 TND), pays in international currency, work travels well across borders
- Bilingual FR/AR content is competitive advantage for MENA brands
- Tunisian creators have been picked up by Gulf brands paying in USD
- Authenticity > production value (the whole point of UGC)
- **Servyou must handle UGC pricing differently** — UGC is per-video pricing, not hourly, often with usage rights tiers (organic vs paid ads vs whitelisting)

---

## Section 6 — Social Media Manager

Covers: content strategy, post creation, community management, paid social, social analytics.

### Essential tools (tier 1 — pre-checked)

| Tool | Category | Notes |
|---|---|---|
| **Canva** | Visual design | Universal — every SMM lives here for quick graphics |
| **Buffer / Hootsuite / Later** | Scheduling | Multi-platform post scheduling + queue |
| **Meta Business Suite** | Native FB/IG | Direct Meta scheduling + insights |
| **TikTok Business Center** | TikTok | Native scheduling + analytics |
| **Google Drive** | Asset library | Storage shared with clients |

### Professional scheduling tools (opt-in)
- **Sprout Social** — agency-grade, expensive
- **Metricool** — Europe-favored, affordable
- **Loomly** — content calendar focus
- **Planoly** — Instagram grid planning
- **CoSchedule**

### Design & content creation
- **Canva Pro** (with brand kit)
- **Adobe Express**
- **Figma** (custom social templates)
- **CapCut** (video for Reels, Shorts, TikTok)
- **InShot**
- **VSCO / Lightroom Mobile** (photo editing)

### Analytics & listening
- Native platform analytics (free — Insights on every platform)
- **Hootsuite Analytics**
- **Sprout Social Reports**
- **Metricool reports**
- **Iconosquare** (Instagram focus)
- **Brand24 / Mention / Brandwatch** (social listening)
- **TikTok Creative Center** (trend research)

### Engagement & community
- Native DM inboxes (Meta Inbox, etc.)
- **Sparkcentral**
- **Reply.io**

### Influencer / UGC integration
- Brand briefs from UGC marketplaces (see Section 5)
- **Modash / HypeAuditor** (influencer discovery + vetting)

### Showcase & portfolio platforms
- **Case studies** on personal site or Notion (growth metrics: followers, engagement rate, reach lift)
- **Managed account links** (with permission)
- **Behance** for content design case studies
- **Awards & features** (Cannes Lions for big agencies, regional awards)

### Professional accounts (suggested)
- **LinkedIn** — essential for B2B sales
- **Personal Instagram / TikTok** showcasing thought leadership
- **Twitter/X** for industry conversation
- **Threads / Bluesky** (newer platforms increasingly important)

### Verification signals
- LinkedIn OAuth + Meta Business Partner badge (if achieved)
- Certifications: Meta Blueprint, Hootsuite Social Marketing Certification, Hubspot Social Media Marketing
- Past managed accounts shown with permission (logos + metrics)

### Tunisia-specific notes
- Knowledge of Tunisian holiday calendar (Eid, Ramadan posting patterns, national holidays)
- Religious sensitivity (no alcohol promos during Ramadan, no pork-based content)
- French + Arabic + Tunisian dialect (in posts) is the local advantage
- WhatsApp Business as a "social channel" — increasingly part of TN SMM scope

---

## Section 7 — Digital Marketer / SEO Specialist

Covers: SEO (technical + content), SEM/PPC, growth marketing, conversion optimization, marketing analytics.

### Essential tools (tier 1 — pre-checked)

| Tool | Category | Notes |
|---|---|---|
| **Google Search Console** | SEO | Free, essential — real Google data |
| **Google Analytics 4** | Analytics | Free, essential — site performance |
| **Google Ads** | Paid search | Account access required for PPC work |
| **Google Tag Manager** | Tracking | Tag deployment without dev help |
| **Google Keyword Planner** | Keyword research | Free, decent baseline |

### SEO toolkits (opt-in, but most pros have at least one)
- **SEMrush** — all-in-one (SEO + PPC + content + social); 6.68% market share in SEO/SEM
- **Ahrefs** — best-in-class backlinks (35T+ link index), 14.83% market share, gold standard for link analysis
- **Moz Pro** — beginner-friendly, Domain Authority is widely cited
- **SE Ranking** — agency-favored (multi-client management at lower cost)
- **Screaming Frog SEO Spider** — technical site audit ($149/yr, essential for technical SEO)
- **Sitebulb** — newer technical audit alternative
- **Ubersuggest** — entry-level (Neil Patel)
- **Keywords Everywhere** — instant in-browser keyword data

### Content optimization
- **Surfer SEO** — SERP-based content optimization ($79+/mo)
- **Frase** — research + briefs ($15+/mo, the best-value option)
- **Clearscope** — semantic relevance ($170+/mo)
- **MarketMuse** — topic authority planning
- **Answer the Public** — question-based keyword research
- **AlsoAsked**

### AI SEO + GEO (Generative Engine Optimization — new in 2026)
- **SEMrush AI Visibility** — track AI Overview mentions
- **Perplexity Comet** — AI visibility assessment
- **Brightedge** — enterprise GEO
- AI Overviews now appear in 48% of Google searches (BrightEdge 2026 research)

### Paid ads
- **Google Ads** (Search + Display + YouTube + Demand Gen)
- **Meta Ads Manager** (Facebook + Instagram + WhatsApp)
- **TikTok Ads Manager** (rising fast for B2C)
- **LinkedIn Ads** (B2B)
- **Microsoft Advertising** (Bing — underrated in B2B)
- **Snapchat / Pinterest Ads** (niche)

### Conversion / analytics
- **Hotjar** — heatmaps, session recordings, surveys
- **Microsoft Clarity** — free Hotjar alternative
- **VWO** — A/B testing
- **Optimizely** — enterprise A/B
- **Looker Studio** — free dashboarding
- **Triple Whale** (e-commerce attribution)
- **Northbeam / Rockerbox** (attribution)

### Project management
- **Notion** — campaign plans
- **Airtable** — content calendars
- **n8n / Zapier / Make** — automation
- **Gumloop** — AI-native workflow automation (rising)

### Showcase & portfolio platforms
- **Case studies** on personal site / Medium — metrics-led ("Drove +127% organic traffic in 6 months")
- **Linked accounts** with permission (showing real client growth)
- **Side project sites** with public traffic stats (e.g., side blogs ranking on Google)
- **Conference talks** (Brighton SEO, MozCon)

### Professional accounts (suggested)
- **LinkedIn** (essential)
- **Twitter/X** (SEO Twitter is highly active)
- **Personal blog** (signal: SEO marketers should rank for SEO topics)
- **Github** (for technical SEO — schema markup repos, scripts)

### Verification signals
- Certifications: Google Ads, Google Analytics, Meta Blueprint, Hubspot, SEMrush Academy, Ahrefs certifications
- Linked side-project domain ranking on Google for relevant terms (best proof)
- LinkedIn verified employment at known marketing roles

### Tunisia-specific notes
- Local SEO knowledge for Tunisian businesses (Google My Business, governorate-level targeting)
- Arabic SEO is a competitive niche — different keyword research mindset, RTL UX implications
- Strong demand from European e-commerce brands needing French-language SEO
- B2B SEO for Tunisian export businesses (oil, textile, IT outsourcing)

---

## Section 8 — Content Writer / Copywriter

Covers: blog writing, SEO content, copywriting (ads, landing pages, emails), ghostwriting, technical writing.

### Essential tools (tier 1 — pre-checked)

| Tool | Category | Notes |
|---|---|---|
| **Google Docs** | Writing | Universal collaborative writing |
| **Notion** | Drafting + organization | Content calendar, brief storage, second brain |
| **Grammarly** | Grammar / clarity | Essential editing layer — universal across writers |
| **Hemingway Editor** | Readability | Free web tool, sentence-level clarity |

### AI writing assist (every modern writer uses at least one)
- **Claude** (Anthropic) — best for raw prose quality, long-form coherence
- **ChatGPT** (OpenAI) — most-used (100M+ weekly active users), broad ecosystem
- **Gemini** (Google) — strong on research integration
- **Perplexity** — research with live citations
- **Jasper** — brand-voice-trained, template library, B2B marketing teams ($59+/mo)
- **Copy.ai** — short-form marketing copy
- **Writesonic** — SEO + marketing copy
- **Anyword** — predictive performance scoring for ads

### SEO content tools
- **Surfer SEO** — SERP-based optimization
- **Frase** — research + briefs ($15/mo, best value)
- **Clearscope** — semantic relevance
- **MarketMuse**
- **Keyword research:** Ahrefs / SEMrush / Google Keyword Planner

### Long-form & books
- **Scrivener** ($59.99 one-time) — long manuscripts
- **Ulysses** (Mac)
- **ProWritingAid** ($10/mo) — deeper analysis than Grammarly
- **QuillBot** — paraphrasing, plagiarism check

### Multilingual & translation
- **DeepL** — best French↔English, French↔Arabic improving
- **Reverso Context** — translation in context
- **Linguee** — bilingual examples
- **Google Translate** (baseline only)

### Research
- **Perplexity** — primary research AI
- **Feedly** — RSS aggregation
- **Pocket / Readwise** — clipping + revisiting
- **Connected Papers** (academic graphs)
- **Semantic Scholar / Google Scholar** (academic)

### Project management & invoicing
- **Notion** (one source of truth)
- **Airtable** (content calendars)
- **FreshBooks / Wave** (invoicing)
- **Toggl** (time tracking, if hourly)
- **Calendly**

### Showcase & portfolio platforms
- **Personal site / blog** (most credible — writers prove writing by writing)
- **Medium** — easy entry, decent reach
- **Substack** — newsletter + portfolio combo
- **Contently** — writer portfolio + assignments marketplace
- **LinkedIn articles**
- **Clippings.me** / **Journo Portfolio** (curated writing portfolio)
- **Published work links** (with bylines)

### Professional accounts (suggested)
- **LinkedIn** — essential
- **Medium** — secondary portfolio
- **Substack** (if newsletter writer)
- **Twitter/X** — content marketing Twitter is active
- **Contently** (if pursuing premium content marketing work)

### Verification signals
- Linked Medium account (OAuth-fetchable post count, followers)
- Substack account with subscriber count
- Published bylines verified by URL fetch (article exists at claimed URL)
- LinkedIn-verified employment at media/agency roles

### Tunisia-specific notes
- **Bilingual writing is the killer differentiator** — FR↔EN↔AR copy commands premium
- Strong demand from European media outlets for French content at Tunisian rates
- Arabic content writing for Gulf clients (Saudi, UAE) — pays USD
- Local clients usually need French copy + product descriptions for e-commerce
- Religious-sensitive content adjustments for MENA markets

---

## Section 9 — Translator

Covers: written translation, localization, sworn translation, interpretation. Tunisia is uniquely positioned — French, Arabic (MSA + dialectal), English trifecta is rare globally.

### Essential tools (tier 1 — pre-checked)

| Tool | Category | Notes |
|---|---|---|
| **Microsoft Word / Google Docs** | Drafting | Universal |
| **DeepL** | Machine translation | Best-in-class for EU languages; pro plan keeps data private |
| **Reverso / Linguee / WordReference** | Reference | Bilingual context lookup |
| **DeepL Glossary / WordReference** | Terminology | Per-client term consistency |

### CAT tools (Computer-Assisted Translation — opt-in, signals professional)
- **SDL Trados Studio** — industry standard ($600+ — high barrier, mostly agency-owned)
- **memoQ** — second most-used pro CAT tool
- **OmegaT** — open-source, free
- **MateCat** — web-based, free
- **Smartcat** — cloud-based, free tier + marketplace integration
- **Phrase (formerly Memsource)** — enterprise-leaning
- **Wordfast Pro** — alternative pro tool

### QA & terminology
- **Xbench** — QA checking
- **Verifika** — QA across CAT tools
- **Terminologue** — terminology management
- **MultiTerm** (Trados ecosystem)
- **Antidote** (French specifically)

### Voice / interpretation (if also interpreter)
- **Zoom** with simultaneous interpretation channels
- **KUDO / Interprefy** — remote simultaneous interpretation platforms
- **Microsoft Teams** (with interpretation features)

### Showcase & portfolio platforms
- **ProZ.com** profile (THE platform for translators — KudoZ points = credibility currency)
- **TranslatorsCafe** profile
- **Smartcat** marketplace profile
- **Personal site** with sample translations (anonymized client work + permissions)
- **LinkedIn** with language pairs prominently displayed

### Professional accounts (suggested)
- **LinkedIn** — essential
- **ProZ.com** — primary translator profile (verification + KudoZ + jobs)
- **TranslatorsCafe** — secondary marketplace
- **ATA (American Translators Association)** member directory (if certified)
- **CIOL (Chartered Institute of Linguists)** — UK certification

### Verification signals
- ProZ.com Pro membership badge
- **Sworn translator status** (Tunisia: assermenté near a Tunisian court) — uploaded scan + admin verification → "Sworn Translator" badge
- CAT tool certifications (SDL, memoQ)
- University degree in translation (Higher Institute of Languages of Tunis — ISLT) → admin verifies diploma
- Native speaker self-declaration per language

### Tunisia-specific notes
- **Tunisian translator advantage:** FR↔AR↔EN trifecta is rare and valuable
- **Sworn translation is a regulated profession** — Servyou must support uploaded credentials + admin verification flow
- High-demand pairs: FR↔AR (legal, marketing), EN↔AR (Gulf clients), FR↔EN (European clients)
- Dialectal Tunisian Arabic transcription for media/UGC is a growing niche
- Italian and German are growing as Tunisian universities expand language programs

---

## Section 10 — Video Editor / Motion Designer

Covers: video editing (YouTube, TikTok, weddings, corporate, documentary), motion graphics, animation, color grading, sound design.

### Essential tools (tier 1 — pre-checked, depending on subspecialty)

| Tool | Category | Notes |
|---|---|---|
| **Adobe Premiere Pro** | Editing | Industry standard, $22.99/mo — collaboration + plugins ecosystem |
| **DaVinci Resolve** (Studio $295 one-time, or free) | Editing + color | Best color grading in industry, one-time pricing |
| **Final Cut Pro** ($299.99 one-time, Mac) | Editing | Mac performance leader, native Apple Silicon |
| **CapCut** (free) | Editing | Best mobile-first short-form, owned by ByteDance/TikTok |

### Motion graphics & animation (opt-in)
- **Adobe After Effects** — industry standard for motion graphics
- **Cinema 4D** — 3D motion design (often paired with AE)
- **Blender** — free open-source 3D (rising fast)
- **Cavalry** — newer procedural motion tool
- **Apple Motion** (paired with FCP)

### Color & audio specialist tools
- **DaVinci Resolve** — best color grading
- **FilmConvert** — film emulation
- **Adobe Audition** — audio post
- **iZotope RX** — audio repair industry standard
- **Krisp** — noise removal (real-time)
- **Pro Tools / Logic Pro / Reaper** (audio specialists)

### Stock & assets (opt-in)
- **Artgrid** — premium footage (sister of Artlist)
- **Storyblocks** — stock + templates
- **Envato Elements** — stock + AE templates
- **Motion Array** — templates + footage + music
- **Pexels / Pixabay** (free)
- **Music: Epidemic Sound, Artlist, Musicbed, MusicVine**

### Asset organization & delivery
- **Frame.io** (Adobe) — review + approval
- **Wipster** — alternative review tool
- **Google Drive / Dropbox** — delivery
- **WeTransfer** — large one-off transfers
- **WeFire / MASV** — pro-grade file delivery

### AI-assisted editing (2026 reality)
- **Adobe Firefly** in Premiere (Generative Extend, Enhance Speech, Object Mask)
- **Runway** (Magic Tools, Gen-3)
- **Descript** (edit by transcript — game-changing for talking-head edits)
- **CapCut auto-captions, auto-cuts, AI dubbing**
- **mStudio** (AI-native generative video)
- **ElevenLabs / Murf** (AI voices for VO)

### Showcase & portfolio platforms
- **Vimeo** (Pro $7/mo) — THE professional video portfolio platform (high-quality playback, no ads, password protection)
- **YouTube** — for reach + SEO + lead generation (separate from professional showcase)
- **Personal site** (Squarespace, Wix, Webflow, Adobe Portfolio with Behance)
- **Showreel = 60-90 seconds of best work at top of portfolio**
- **Behance** for motion graphics case studies (Adobe-connected)
- **Carbonmade** — gallery of working video editor portfolios

### Professional accounts (suggested)
- **Vimeo Pro** (essential — clients expect Vimeo links for serious work)
- **LinkedIn**
- **YouTube channel**
- **Behance** (for motion design)
- **IMDb** (if narrative film credits — episodic, feature)

### Verification signals
- Vimeo Pro account (paid signal of commitment)
- Published YouTube videos with view counts
- IMDb credits (verified for industry work)
- Adobe Creative Cloud All Apps subscription
- Past client logos with permission

### Tunisia-specific notes
- Wedding videography is a major local market (high-volume, lower-margin)
- Corporate explainer videos (banking, telco, insurance) — well-paid
- YouTube/TikTok content editing for international creators — strong remote opportunity
- Arabic subtitle work + Arabic typography animation is a niche specialty
- Tunisia has a small but growing film industry (Carthage Film Festival) — credits matter

---

## Section 11 — Photographer / Videographer

Covers: product, wedding, event, portrait, fashion, architecture, food, real estate, travel, photojournalism.

### Essential tools (tier 1 — pre-checked)

| Tool | Category | Notes |
|---|---|---|
| **Adobe Lightroom Classic + Mobile** | Photo editing | Industry standard for catalog + edits |
| **Adobe Photoshop** | Retouching | Industry standard for advanced retouch |
| **Capture One** | Tethered shoots + editing | Pro alternative, often preferred for studio/product |
| **Bridge / Photo Mechanic** | Culling | Fast image culling (pro workflow) |

### Professional tools (opt-in)
- **Luminar Neo** — AI-assisted edits
- **DxO PureRAW** — RAW noise reduction
- **Topaz Photo AI** — sharpen, denoise, upscale
- **Affinity Photo** — Photoshop alternative
- **GIMP** — free, less common professionally

### Backup & catalog
- **Adobe Creative Cloud Storage**
- **External SSD/HDD redundancy**
- **Backblaze** (offsite backup)
- **PhotoSync** (mobile to desktop)

### Client gallery + delivery
- **Pixieset** — most popular client galleries for wedding/portrait
- **ShootProof** — alternative client gallery + sales
- **Pic-Time** — newer, premium
- **SmugMug** — gallery + portfolio combo
- **Cloud delivery** (Google Drive / Dropbox for raw deliveries)

### Studio business tools
- **HoneyBook / Dubsado / Studio Ninja** — CRM + contracts + invoicing for photographers
- **17hats**
- **Tave**

### Showcase & portfolio platforms
- **Instagram** — for many photographers, the primary discovery channel (especially Tunisia)
- **500px** — pro photography community (free tier with 7 images/week; paid for portfolio site)
- **Behance** — strong adobe ecosystem integration (Lightroom/PS sync upload)
- **Flickr** — established community, archive, geotagged map (40M+ MAU)
- **Adobe Portfolio** — free with Creative Cloud, integrates with Behance
- **Personal site** — Squarespace (popular), Wix, Format (photo-first), Pixpa, Zenfolio (sales-friendly), Semplice (designer-favorite, $100 one-time, WordPress)
- **Fstoppers** (community + features)

### Professional accounts (suggested)
- **Instagram** (verified handle when possible)
- **500px**
- **Behance**
- **LinkedIn** (for commercial work)
- **Pinterest** (huge for wedding + lifestyle discovery)
- **Google My Business** (for local — wedding inquiries, family portrait)

### Verification signals
- 500px profile (verified via OAuth — though API limitations exist post-2018 ownership change)
- Adobe Creative Cloud subscription (Photography Plan)
- Published features (Vogue Italia, National Geographic Your Shot, etc. — admin-verified)
- Print publication credits
- Awards: WPPI, WPJA (wedding), Sony World Photography, etc.

### Equipment claims (worth surfacing in profile)
- Camera body(s) — Canon R5, Sony A7IV, Nikon Z8, Fujifilm GFX, etc.
- Lens kit
- Studio access (own studio / shared / on-location only)
- Drone certification (Tunisian Civil Aviation Authority license)

### Tunisia-specific notes
- **Wedding photography is the #1 local volume** — high competition but consistent
- **Tourism photography** has international resale potential (Tunisia is a Mediterranean destination)
- **Product photography** for e-commerce SMBs is rising fast
- **Real estate / architecture** photography for European holiday rentals (Djerba, Sidi Bou Said)
- Cultural sensitivity in portrait work — modest dress, family permission for women's portraits
- Outdoor/landscape: stunning subjects available (Sahara, Mediterranean coast, ancient ruins)

---

## Section 12 — Voice Over Artist / Audio Producer

Covers: commercials, e-learning narration, audiobooks, IVR, animation/character voice, podcast production.

### Essential equipment (different than software — pre-checked as equipment group)

| Equipment | Notes |
|---|---|
| **Quality microphone** — Shure SM7B (dynamic, podcast-friendly), Rode NT1A (condenser, budget pro), Neumann TLM 102/103 (premium), Sennheiser MKH 416 (shotgun) | The single most important investment |
| **Audio interface** — Focusrite Scarlett (budget), Universal Audio Apollo (premium), SSL 2+ | Converts mic to digital |
| **Studio headphones** — Sony MDR-7506, Beyerdynamic DT 770/990, Audio-Technica M50x | For monitoring while recording |
| **Pop filter** — minimizes plosives ("p" and "b" sounds) | Cheap, essential |
| **Acoustic treatment** — DIY booth, portable VO booth (Kaotica Eyeball), foam panels | Quiet, dead room |

### Essential software (tier 1 — pre-checked)

| Tool | Notes |
|---|---|
| **Audacity** | Free, simple, sufficient for most VO |
| **Adobe Audition** | Subscription, pro standard for VO + audio post |
| **Pro Tools** | Industry standard for studio/film/TV work |
| **Reaper** | One-time $60-225, full-featured DAW, beloved by indie VO |
| **Logic Pro** ($199 one-time, Mac) | Mac VO + music |
| **Hindenburg Journalist Pro** | Built for spoken-word/podcast |

### Audio quality (opt-in)
- **iZotope RX** — industry-standard audio repair
- **Krisp** — real-time noise removal (for remote sessions)
- **Auphonic** — automated mastering for podcasts
- **CrumplePop** — niche audio cleanup
- **ElevenLabs / Murf** (AI voice — for VOs who offer AI voice cloning of their own voice)

### AI tools (controversial but real)
- **ElevenLabs** voice cloning — VOs increasingly clone their own voice for scale
- **Descript Overdub** — record + AI generates additional phrases in your voice
- **Resemble AI** — voice cloning
- *Important*: AI cloning of your OWN voice (with consent) is a service freelancers can offer; cloning someone else's without consent is unethical/illegal

### Recording session software (for remote sessions with directors)
- **Source-Connect** — industry standard for remote VO sessions
- **ipDTL**
- **Cleanfeed**
- **Zoom / Riverside.fm** (entry-level for podcast guesting)

### VO marketplaces (where work is found — distinct from showcase)
- **Voices.com** — largest marketplace, $499+/yr membership, 20% commission, escrow protection
- **Voice123** — 0% commission (you negotiate direct), membership $49 entry / $495+ Pro / $4,950 Elite
- **Bunny Studio** (formerly VoiceBunny) — curated, fast-turnaround focus
- **Audiobird** — agency + marketplace hybrid
- **ACX (Audiobook Creation Exchange)** — Amazon-owned, audiobooks
- **Findaway Voices** — audiobooks alternative

### Showcase & portfolio platforms
- **SoundCloud** — embedded audio player on profile
- **Personal website with embedded player** (essential — every VO needs this)
- **Voice123 / Voices.com profile** (where buyers actually search)
- **YouTube channel** with VO reels (for SEO + reach)
- **LinkedIn** with media samples

### Professional accounts (suggested)
- **LinkedIn**
- **Voice123 profile**
- **Voices.com profile**
- **SoundCloud**
- **IMDb** (for narrative/animation/film VO credits)
- **AFTRA / SAG-AFTRA** (US union — niche, but signals tier)

### Verification signals
- Voice123 / Voices.com profile verified via OAuth or admin
- ACX-approved audiobook narrator
- IMDb credits
- Equipment shown in profile (Neumann mic + treated room = serious investment)

### Demo reels (essential portfolio piece)
- **Commercial demo** — 60-90 seconds, multiple short spots
- **Narration demo** (e-learning, documentary) — 60-90 seconds
- **Character demo** (animation, gaming) — if applicable
- **Audiobook demo** — 2-3 minute sample of long-form

### Tunisia-specific notes
- **AR-MSA (Modern Standard Arabic) narration** is high-demand from Gulf clients paying USD
- **French narration** for European audiobooks, e-learning, documentaries
- **English narration** depends heavily on accent quality (neutral or American/British acceptable)
- **Tunisian dialect** for ads targeting local market
- **Bilingual VO** (same artist, multiple languages) is a premium offering
- Low overhead (home studio) + low cost of living = competitive on global rates
- Capital controls affect international payment receipt — see world-class spec Section 6

---

## Section 13 — Data Analyst / Data Scientist

Covers: data analysis, business intelligence, data engineering, machine learning, data visualization.

### Essential tools (tier 1 — pre-checked)

| Tool | Category | Notes |
|---|---|---|
| **Python** + pandas + numpy + scikit-learn | Languages + libraries | Dominant data science stack |
| **SQL** | Querying | Universal — every analyst needs it |
| **Jupyter Notebook / JupyterLab** | Interactive environment | Standard for exploration |
| **Google Colab** | Cloud notebooks | Free GPU, collaboration |
| **VS Code** | IDE | For productionized data work |
| **Git + GitHub** | Version control | Reproducible analyses |

### Languages (opt-in beyond Python/SQL)
- **R** — statistical analysis, academic, biostatistics
- **Julia** — numerical computing (niche)
- **Scala** — Spark/big data
- **Java** — enterprise data engineering

### Visualization tools
- **Tableau** ($75+/mo) — industry standard BI
- **Power BI** (free desktop, Pro $10/mo) — Microsoft ecosystem, dominant in enterprise
- **Looker Studio** (free, Google) — embedded reporting
- **Tableau Public** (free) — portfolio platform
- **Plotly / Dash** (Python) — interactive web dashboards
- **Streamlit** — Python → web app fast
- **Seaborn / matplotlib / ggplot2** — static charts
- **D3.js** — custom web visualizations

### Big data / cloud data
- **Snowflake** — cloud data warehouse (rising fast)
- **Google BigQuery** — Google's data warehouse
- **AWS Redshift** — Amazon's data warehouse
- **Databricks** — unified analytics + Spark
- **Apache Spark** (PySpark) — distributed computing
- **dbt** — data transformation (analytics engineering)
- **Apache Airflow** — workflow orchestration

### ML & deep learning (overlaps with Section 14)
- **scikit-learn** — classical ML
- **XGBoost / LightGBM** — gradient boosting
- **TensorFlow / Keras** — deep learning
- **PyTorch** — deep learning (research favorite)
- **Hugging Face Transformers** — NLP

### Competition & learning platforms
- **Kaggle** — competitions, datasets, notebooks (essential for portfolio)
- **DrivenData** — social-impact competitions
- **Zindi** — African data science competitions (geographically relevant!)
- **StrataScratch** / **LeetCode** — interview prep

### Showcase & portfolio platforms
- **GitHub** — primary portfolio (repos with READMEs, clean code, Jupyter notebooks)
- **Kaggle profile** — competition rankings, public notebooks, datasets
- **Tableau Public** — published interactive dashboards
- **Personal blog / Medium / Substack** — analysis writeups (data storytelling)
- **Streamlit Cloud / Hugging Face Spaces** — deployed demo apps
- **LinkedIn**
- **Hugging Face profile** (for ML/NLP work)

### Professional accounts (suggested)
- **GitHub** (essential — verified via OAuth)
- **Kaggle** (essential)
- **LinkedIn**
- **Tableau Public** (if visualization-heavy)
- **Hugging Face** (for ML)
- **Stack Overflow** (Q&A reputation)
- **DataCamp / Coursera certifications**

### Verification signals
- GitHub OAuth → public repos, commit history, project READMEs
- Kaggle competition medals (Bronze / Silver / Gold) — public verifiable rank
- Tableau Public published dashboards
- Cloud certifications: AWS Data Analytics, GCP Professional Data Engineer, Azure Data Scientist Associate
- University degree in stats/CS/math/economics

### Tunisia-specific notes
- Strong math + engineering education in Tunisia (ENIT, ENSI, INSAT) produces capable data professionals
- Strong demand from French startups for data analysts at Tunisian rates
- Growing local demand: banking sector, telco (Tunisie Telecom, Ooredoo, Orange), e-commerce
- Limited local big-data infrastructure → most senior data work is remote-for-international

---

## Section 14 — AI Specialist / Prompt Engineer / ML Engineer

Covers: LLM applications, RAG, fine-tuning, prompt engineering, AI agents, voice/image AI integration, AI product development. **Fastest-growing freelance category globally — Upwork reports +109% YoY demand for AI skills in 2026.**

### Essential tools (tier 1 — pre-checked)

| Tool | Category | Notes |
|---|---|---|
| **Python** | Language | Universal in ML/AI |
| **Git + GitHub** | Version control | Same as data science |
| **VS Code / Cursor** | IDE | Cursor especially relevant for AI-assisted coding |
| **OpenAI API** | LLM provider | GPT-5.x — dominant API |
| **Anthropic Claude API** | LLM provider | Best for prose quality, long context |
| **Google Gemini API** | LLM provider | Strong research integration, free tier generous |

### LLM frameworks (opt-in)
- **LangChain** — most popular LLM orchestration framework
- **LlamaIndex** — RAG-focused framework
- **Haystack** — alternative orchestration (deepset)
- **AutoGen** (Microsoft) — multi-agent systems
- **CrewAI** — agentic workflows
- **Pydantic AI** — type-safe LLM apps
- **Hugging Face Transformers** — open-source models

### Vector databases (essential for RAG)
- **Pinecone** — managed vector DB (most-used)
- **Weaviate** — open-source, schema-driven
- **Chroma** — embedded, dev-friendly
- **Qdrant** — performance-focused
- **Milvus** — enterprise scale
- **Supabase pgvector** — Postgres-backed (relevant — Servyou itself uses Supabase)
- **Redis** — vector search via RedisSearch

### Open-source models & deployment
- **Hugging Face Hub** — model + dataset + Spaces hosting (THE platform)
- **Replicate** — model deployment + inference API
- **Modal** — Python-first serverless GPU
- **RunPod** — GPU rental
- **Together AI** — open-model inference
- **Groq** — fast inference
- **Ollama** — local LLM runner

### Fine-tuning & training
- **OpenAI fine-tuning** (GPT-4o-mini etc.)
- **LoRA / QLoRA** — parameter-efficient fine-tuning
- **Axolotl** — fine-tuning framework
- **Unsloth** — fast LoRA training
- **TRL (Hugging Face)** — RLHF / DPO

### Prompt engineering & evaluation
- **Promptfoo** — prompt testing
- **Helicone** — LLM observability
- **LangSmith** (LangChain) — tracing + evals
- **Weights & Biases (W&B)** — experiment tracking
- **Arize Phoenix** — observability

### AI image / video / voice generation
- **Midjourney** (image)
- **DALL-E 3** (image, OpenAI)
- **Stable Diffusion / ComfyUI / Automatic1111** (image, open)
- **Flux** (image, rising)
- **ElevenLabs** (voice cloning, TTS)
- **Suno / Udio** (music)
- **Runway** (video)
- **Sora / Veo** (video — when available)

### Showcase & portfolio platforms
- **GitHub** — repos with model code, notebooks, READMEs
- **Hugging Face Spaces** — deployed demo apps (live, interactive — best showcase)
- **Replicate** profile — deployed models as APIs
- **Kaggle** — notebooks + competitions
- **Personal blog** — technical writeups of prompts, fine-tunes, evals
- **Twitter/X** — AI Twitter is THE community
- **Discord** (LangChain, OpenAI dev community, Hugging Face)

### Professional accounts (suggested)
- **GitHub** (essential)
- **Hugging Face** (essential)
- **LinkedIn**
- **Twitter/X** (essential — AI conversation lives here)
- **Kaggle**
- **Discord** community presence (signals participation, harder to verify)

### Verification signals
- GitHub OAuth → AI project repos
- Hugging Face profile (verified models, downloads, likes)
- Replicate deployed models with usage stats
- Kaggle competition medals (especially LLM-related)
- Twitter/X verified handle + AI community follow signals

### Specific subspecialties to surface
- **Prompt engineer** — fast iteration on prompts, eval-driven
- **RAG developer** — vector DBs, retrieval pipelines
- **AI agent builder** — multi-step, tool-using agents
- **Fine-tune specialist** — domain-specific model adaptation
- **AI product engineer** — integrate LLMs into existing products
- **AI safety / red-teaming** — adversarial testing

### Tunisia-specific notes
- **Massive opportunity** — global demand at +109% YoY, low local supply, high willingness to pay
- Strong math/engineering education base means Tunisian engineers can pivot fast
- French + English + Arabic = ability to work on Arabic AI applications (LLMs for MSA, dialectal NLP)
- Local AI ecosystem is small but growing (Instadeep was Tunisia-founded, acquired by BioNTech)
- **Servyou should heavily promote this category** — it's the highest-value freelance future for Tunisia

---

## Section 15 — Virtual Assistant / Admin Support

Covers: administrative VA, executive assistant, customer support, project coordination, lead generation, data entry. Tunisia advantage: timezone overlap with EU + Gulf, bilingual workforce, lower cost.

### Essential tools (tier 1 — pre-checked)

| Tool | Category | Notes |
|---|---|---|
| **Google Workspace** (Docs/Sheets/Slides/Drive) | Productivity | Universal |
| **Microsoft 365** | Productivity | Corporate clients require |
| **Notion** | Knowledge management | Modern client favorite |
| **Slack** | Team communication | Most clients run here |
| **Email** (Gmail / Outlook) | Communication | Universal |
| **Zoom / Google Meet / Teams** | Video calls | Universal |

### Project & task management
- **Asana / ClickUp / Monday.com / Trello** — task tracking
- **Notion / Airtable** — flexible databases
- **Jira** (if working with dev teams)
- **Basecamp** (older but still used)
- **Linear** (modern alternative for tech clients)

### Time tracking (often REQUIRED by client)
- **Toggl Track** — most popular
- **Time Doctor** — surveillance-heavy (some clients require)
- **Hubstaff** — alternative with screenshots
- **RescueTime** — productivity tracking
- **Clockify** — free alternative

### CRM tools
- **HubSpot CRM** (free tier strong)
- **Pipedrive**
- **Salesforce** (enterprise)
- **Zoho CRM**
- **Notion / Airtable as CRM** (many SMBs)

### Scheduling
- **Calendly** — most-used
- **Cal.com** — open-source alternative
- **Acuity Scheduling**
- **SavvyCal**

### Communication tools
- **Loom** — async video (huge for VAs explaining work)
- **Slack / Discord**
- **WhatsApp** (Tunisia + client communication)

### Email management
- **Boomerang / Mixmax / Superhuman** — email power tools
- **Mailchimp / ConvertKit / Beehiiv** — newsletter management
- **Front** — team email

### Lead generation tools
- **Apollo.io / Lemlist / Hunter.io** — outbound prospecting
- **LinkedIn Sales Navigator**
- **Clay** — data enrichment
- **Phantombuster** — automation

### Bookkeeping / finance
- **QuickBooks** — small business bookkeeping
- **Xero**
- **Wave** (free)
- **FreshBooks**
- **Stripe / PayPal** (payment processing)

### Customer support tools
- **Intercom / Zendesk / HelpScout / Freshdesk** — support ticketing
- **Tidio / Crisp** — chat widgets
- **Notion / Slite** — internal knowledge base

### Automation
- **Zapier / Make (Integromat) / n8n** — no-code automation
- **Notion automations / Airtable automations**
- **Gumloop** (AI-native, rising)

### Showcase & portfolio platforms
- **Testimonials** (essential — VA work isn't visual, social proof is the proof)
- **Case studies** — "I reduced response time by 40% in 3 months"
- **Process documentation samples** — SOPs they've built
- **LinkedIn profile** with detailed scope of past roles
- **Upwork / Fiverr ratings** — historical proof

### Professional accounts (suggested)
- **LinkedIn** (essential)
- **Upwork** profile (with JSS rating)
- **Fiverr** profile (with rating)
- **Personal site** with testimonials + case studies
- **YouTube** (if VA produces "how I VA" content)

### Verification signals
- LinkedIn-verified employment at past roles
- Upwork JSS (Job Success Score) and badges (Top Rated, Rising Talent)
- Fiverr seller level (Level 1/2, Top Rated, Pro)
- Certifications: HubSpot Inbound, Google Workspace Admin, Microsoft 365 Specialist
- Specific software certifications (Salesforce Admin, etc.)

### Tunisia-specific notes
- **Tunisian VAs serve EU/Gulf clients well** — timezone overlap + bilingual French/Arabic + English
- Lower hourly rates than EU/US VAs but higher language coverage
- Strong opportunity for **bilingual customer support** (French + Arabic for Gulf-EU brands)
- **Capital controls** affect receiving international hourly payments — see world-class spec
- Remote work culture growing in Tunisia post-2020

---


## Section 16 — Connection patterns

How tools and accounts get **into Servyou**. Four patterns, ranked by trust level.

### Pattern A — OAuth verification (highest trust)

The freelancer signs into the third-party service via OAuth 2.0 with PKCE. Servyou receives a verified identity + (optionally) scoped access to public profile data. Award a **green verified badge**.

| Platform | OAuth supported? | Notes |
|---|---|---|
| **LinkedIn** | ✅ OAuth 2.0 + OIDC | New Authentication API is OIDC-compliant. Returns ID token. Refresh tokens available for partners. Scopes: `openid`, `profile`, `email` minimum. |
| **GitHub** | ✅ OAuth 2.0 (NOT OIDC) | Must call `/user` API after token exchange. Use **GitHub App** over OAuth App for refresh tokens (OAuth App tokens don't expire but are revoked after 1 year of inactivity). |
| **Behance** | ✅ via Adobe ID OAuth | Adobe-owned, OAuth via Adobe IMS. |
| **Dribbble** | ✅ OAuth 2.0 | Standard flow. |
| **Vimeo** | ✅ OAuth 2.0 | Read scopes are sufficient. |
| **Instagram** | ✅ via Meta OAuth | Basic Display API (limited) + Graph API (business accounts). Requires Meta App Review for production scopes. |
| **Facebook** | ✅ OAuth 2.0 | public_profile auto-granted, email no review; deeper scopes need App Review. |
| **TikTok** | ✅ OAuth 2.0 | Login Kit + Display API. |
| **Twitter / X** | ✅ OAuth 2.0 + PKCE | Free tier limited; rate-limited for verification. |
| **YouTube / Google** | ✅ OAuth 2.0 + OIDC | Standard Google identity. |
| **Hugging Face** | ✅ OAuth 2.0 | Sign-in with Hugging Face. |
| **Kaggle** | ⚠️ No public OAuth | Click-through only (URL validation). |
| **500px** | ⚠️ Deprecated public API since 2018 sale | Click-through only. |
| **Stack Overflow** | ✅ OAuth 2.0 (via Stack Exchange) | Standard flow. |
| **Voice123** | ❌ No public OAuth | Click-through. |
| **Voices.com** | ❌ No public OAuth | Click-through. |
| **ProZ.com** | ❌ No public OAuth | Click-through + admin verification (sworn translators upload diploma). |
| **App Store Connect / Play Console** | ❌ Apple/Google don't expose to third parties | Click-through to public app listing URL. |

**Implementation rules** (per Section 19 security):
- Use Authorization Code flow + PKCE.
- Validate `state` parameter (CSRF protection).
- Server-side token exchange only — never expose `client_secret` to browser.
- Request **minimum scopes** (read-only profile typically enough).
- Store tokens encrypted at rest (see Section 19).
- Cache fetched profile data for 24h to avoid rate limits.

### Pattern B — Click-through verification (medium trust)

The freelancer pastes their profile URL. Servyou validates format, optionally fetches the public page, and if it loads (200 OK) + contains expected metadata (og:title, og:image matching platform), award a **claimed-profile badge** (yellow). Not as strong as OAuth, but better than blind trust.

**Validation checks per platform:**
- URL must match expected platform regex (e.g. `^https://www\.linkedin\.com/in/[a-zA-Z0-9-]+/?$` for LinkedIn)
- HEAD request to URL returns 200
- (Optional) Fetch page, extract og:tags, verify they match platform
- If all pass → "Profile claimed" badge

### Pattern C — Manual entry (lowest trust)

Free text input. No verification. Used for:
- Niche platforms not on either list
- Equipment lists ("Camera body: Sony A7IV")
- Software the freelancer uses but no public profile
- Custom tools

No badge. Just stored.

### Pattern D — Document upload + admin verification (highest formal trust)

For credentials that justify a strong trust signal:
- Sworn translator certification (Tunisia: assermenté status)
- University diploma (UMK, ISLT, ENIT, INSAT, etc.)
- Professional certifications (Adobe Certified Professional, AWS Certified, etc.)
- Government IDs (CIN — handled separately, see world-class spec Section 7)

Freelancer uploads PDF / image. Stored in Supabase Storage `verifications/` bucket (NOT public). Admin reviews via the admin dashboard. If approved → **Servyou-verified badge** (blue).

Document deleted from active storage after verification recorded — only a hash + verification date kept.

---

## Section 17 — Portfolio integration patterns

How portfolio items render on the public freelancer page.

### Pattern 1 — Embedded media (iframe-based)

For platforms that allow embedding:
- **YouTube** — `<iframe src="https://www.youtube.com/embed/{VIDEO_ID}">` with privacy-enhanced mode (`youtube-nocookie.com`)
- **Vimeo** — `<iframe src="https://player.vimeo.com/video/{VIDEO_ID}">` with player params
- **SoundCloud** — `<iframe src="https://w.soundcloud.com/player/?url={ENCODED_URL}">`
- **CodeSandbox / StackBlitz** — interactive code embed
- **Spotify** — for podcast VOs

**UX**: Lazy-loaded. Click thumbnail → expand into player. Mobile-optimized aspect ratios.

**Security**: All embeds use sandbox attributes + Content Security Policy `frame-src` allowlist. No arbitrary third-party iframes.

### Pattern 2 — Direct upload (Supabase Storage)

For first-party portfolio media:
- **Images** (photographers, designers, motion graphics stills) — uploaded to `portfolio-media/` bucket
- **Short videos** (showreels under 100MB) — uploaded
- **PDFs** (case studies, briefs, articles) — uploaded
- **Audio samples** (VO reels, podcast clips) — uploaded

**Format requirements:**
- Images: JPEG / PNG / WebP, max 10MB, served as WebP via Next.js Image with progressive loading
- Videos: MP4 (H.264), max 100MB per file (Phase 1) → larger Phase 2 with CDN
- Audio: MP3 / WAV / OGG, max 50MB
- PDFs: max 20MB

**Storage organization:**
```
portfolio-media/
  ├── {freelancer_id}/
  │   ├── images/
  │   │   ├── {item_id}-{idx}-{size}.webp
  │   ├── videos/
  │   ├── audio/
  │   └── documents/
```

**Public access**: Yes, but URLs include `{item_id}` slug to prevent enumeration.

### Pattern 3 — Link-out cards

For platforms that don't allow embedding:
- **GitHub repos** — fetch public README + stats via API → display card
- **Behance projects** — fetch via API → card with cover image + project link
- **Dribbble shots** — fetch via API → card
- **Live deployed sites** (Vercel, Netlify) — screenshot generated server-side OR uploaded manually
- **App Store / Play Store apps** — fetch store page metadata → card with icon + description + ratings
- **Medium articles** — open graph metadata extraction → card
- **Kaggle notebooks** — link with notebook preview image

**UX**: Card showing thumbnail + title + description + platform icon + "View on {Platform}" button (opens in new tab with `rel="noopener noreferrer"`).

### Pattern 4 — Hybrid showcase card

The most flexible option — combine elements:
- Title + description (text)
- Thumbnail (uploaded OR fetched from primary URL)
- Tags (associated tools used)
- Primary "View" link (link-out)
- Optional embed (if supported)
- Optional related links (companion case study, source code, etc.)

This is the **default portfolio item structure** in the DB schema (Section 18).

---

## Section 18 — Codebase integration architecture

Maps directly to Servyou's existing Next.js 16 + Supabase architecture. Follows the same patterns established in `engineering-standards.md` and `data-model.md`.

### Naming conventions

- Table names: `freelancer_*` prefix for freelancer-scoped tables (consistent with existing `freelancer_profiles`)
- Catalog tables (admin-managed master data): `*_catalog` suffix
- Mapping/junction tables: `freelancer_specialty_tools` (no suffix, plain join semantics)
- Enum-like text columns: CHECK constraints (consistent with existing `seller_type` pattern)

### Schema — new tables

```sql
-- ==========================================================================
-- 1. TOOL & ACCOUNT CATALOG (admin-managed, public read)
-- ==========================================================================

-- Master catalog of recognized tools
CREATE TABLE public.freelancer_tool_catalog (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,           -- 'figma', 'photoshop', 'github'
  name        text NOT NULL,                  -- 'Figma'
  category    text NOT NULL CHECK (category IN (
    'design', 'development', 'marketing', 'writing', 'video',
    'photo', 'audio', 'data', 'ai', 'admin', 'communication',
    'productivity', 'finance', 'other'
  )),
  icon_url    text,                           -- /brand/tools/figma.svg
  website_url text,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  display_order smallint DEFAULT 100,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.freelancer_tool_catalog IS 
  'Master list of recognized tools surfaced to freelancers during profile setup.';

CREATE INDEX idx_tool_catalog_category ON public.freelancer_tool_catalog(category) WHERE is_active = true;
CREATE INDEX idx_tool_catalog_slug ON public.freelancer_tool_catalog(slug) WHERE is_active = true;

-- Master catalog of recognized professional account platforms
CREATE TABLE public.freelancer_account_platform_catalog (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text UNIQUE NOT NULL,     -- 'linkedin', 'github', 'behance'
  name              text NOT NULL,            -- 'LinkedIn'
  category          text NOT NULL CHECK (category IN (
    'professional', 'portfolio', 'marketplace', 'social', 'community'
  )),
  icon_url          text,
  base_url          text NOT NULL,            -- 'https://www.linkedin.com/in/'
  url_pattern       text NOT NULL,            -- regex for validation
  username_regex    text,                     -- to extract username from URL
  supports_oauth    boolean NOT NULL DEFAULT false,
  oauth_provider    text,                     -- 'linkedin' / 'github' / 'meta' / etc.
  is_active         boolean NOT NULL DEFAULT true,
  display_order     smallint DEFAULT 100,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_platform_category ON public.freelancer_account_platform_catalog(category) WHERE is_active = true;

-- Mapping: which tools belong to which specialty (drives the wizard suggestions)
CREATE TABLE public.freelancer_specialty_tools (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_slug           text NOT NULL,    -- 'ui_ux_designer', 'web_developer', etc.
  tool_id                  uuid NOT NULL REFERENCES public.freelancer_tool_catalog(id) ON DELETE CASCADE,
  is_essential             boolean NOT NULL DEFAULT false,
  is_default_suggestion    boolean NOT NULL DEFAULT false,
  display_order            smallint DEFAULT 100,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (specialty_slug, tool_id)
);
CREATE INDEX idx_specialty_tools_lookup 
  ON public.freelancer_specialty_tools(specialty_slug, display_order);

-- Mapping: which account platforms are suggested per specialty
CREATE TABLE public.freelancer_specialty_account_platforms (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_slug           text NOT NULL,
  platform_id              uuid NOT NULL REFERENCES public.freelancer_account_platform_catalog(id) ON DELETE CASCADE,
  is_essential             boolean NOT NULL DEFAULT false,
  is_default_suggestion    boolean NOT NULL DEFAULT false,
  display_order            smallint DEFAULT 100,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (specialty_slug, platform_id)
);
CREATE INDEX idx_specialty_platforms_lookup 
  ON public.freelancer_specialty_account_platforms(specialty_slug, display_order);

-- ==========================================================================
-- 2. FREELANCER-OWNED DATA
-- ==========================================================================

-- Freelancer's selected tools (from catalog or custom)
CREATE TABLE public.freelancer_tools (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id       uuid NOT NULL REFERENCES public.freelancer_profiles(profile_id) ON DELETE CASCADE,
  tool_id             uuid REFERENCES public.freelancer_tool_catalog(id) ON DELETE SET NULL,
  custom_tool_name    text,                    -- only set when tool_id is null
  proficiency         text CHECK (proficiency IN ('debutant', 'intermediaire', 'avance', 'expert')),
  years_experience    smallint CHECK (years_experience BETWEEN 0 AND 50),
  is_featured         boolean NOT NULL DEFAULT false,
  display_order       smallint DEFAULT 100,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- Either reference catalog OR provide custom name, never both/neither
  CHECK (
    (tool_id IS NOT NULL AND custom_tool_name IS NULL) OR
    (tool_id IS NULL AND custom_tool_name IS NOT NULL AND length(custom_tool_name) BETWEEN 2 AND 50)
  ),
  -- Don't allow duplicates from catalog per freelancer
  UNIQUE (freelancer_id, tool_id)
);
CREATE INDEX idx_freelancer_tools_owner ON public.freelancer_tools(freelancer_id, display_order);
CREATE INDEX idx_freelancer_tools_by_tool ON public.freelancer_tools(tool_id) WHERE tool_id IS NOT NULL;

-- Freelancer's professional accounts (LinkedIn, GitHub, Behance, etc.)
CREATE TABLE public.freelancer_professional_accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id         uuid NOT NULL REFERENCES public.freelancer_profiles(profile_id) ON DELETE CASCADE,
  platform_id           uuid NOT NULL REFERENCES public.freelancer_account_platform_catalog(id) ON DELETE CASCADE,
  account_url           text NOT NULL,
  username              text,                  -- extracted for display
  display_order         smallint DEFAULT 100,
  -- Verification
  is_verified           boolean NOT NULL DEFAULT false,
  verification_method   text CHECK (verification_method IN ('oauth', 'click_through', 'admin', 'manual')),
  verified_at           timestamptz,
  -- Privacy
  visibility            text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'logged_in', 'hidden')),
  -- External data cache (24h TTL)
  cached_metadata       jsonb,                 -- follower_count, repo_count, etc.
  cached_at             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (freelancer_id, platform_id)
);
CREATE INDEX idx_freelancer_accounts_owner ON public.freelancer_professional_accounts(freelancer_id, display_order);
CREATE INDEX idx_freelancer_accounts_platform ON public.freelancer_professional_accounts(platform_id);
CREATE INDEX idx_freelancer_accounts_verification ON public.freelancer_professional_accounts(freelancer_id, is_verified) WHERE is_verified = true;

-- OAuth tokens (encrypted, server-only)
CREATE TABLE public.freelancer_oauth_tokens (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id            uuid NOT NULL REFERENCES public.freelancer_profiles(profile_id) ON DELETE CASCADE,
  platform_id              uuid NOT NULL REFERENCES public.freelancer_account_platform_catalog(id) ON DELETE CASCADE,
  encrypted_access_token   text NOT NULL,
  encrypted_refresh_token  text,
  scope                    text,
  token_type               text DEFAULT 'Bearer',
  expires_at               timestamptz,
  last_refreshed_at        timestamptz NOT NULL DEFAULT now(),
  -- Audit
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (freelancer_id, platform_id)
);
CREATE INDEX idx_oauth_tokens_owner ON public.freelancer_oauth_tokens(freelancer_id);
CREATE INDEX idx_oauth_tokens_expiry ON public.freelancer_oauth_tokens(expires_at) WHERE expires_at IS NOT NULL;

-- Portfolio items (hybrid: link-out OR embed OR uploaded)
CREATE TABLE public.freelancer_portfolio_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id       uuid NOT NULL REFERENCES public.freelancer_profiles(profile_id) ON DELETE CASCADE,
  title               text NOT NULL CHECK (length(title) BETWEEN 3 AND 100),
  description         text CHECK (description IS NULL OR length(description) <= 1000),
  category_id         uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  -- Primary URL (link-out target) and embed URL (iframe target)
  primary_url         text,                    -- where the work lives
  embed_url           text,                    -- iframe-friendly variant
  -- Self-uploaded thumbnail (Supabase Storage path)
  thumbnail_path      text,
  -- Source attribution
  source_platform     text,                    -- 'github' / 'behance' / 'vimeo' / 'self_upload'
  -- Project metadata (denormalized for fast display)
  role                text,                    -- 'Lead designer' / 'Sole developer'
  client_name         text,
  completed_at        date,
  tools_used          uuid[],                  -- references freelancer_tool_catalog.id[] for fast joining
  tags                text[],                  -- free-form tags
  -- Display
  is_featured         boolean NOT NULL DEFAULT false,
  display_order       smallint DEFAULT 100,
  visibility          text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'logged_in', 'hidden')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- At least one of: primary_url, embed_url, or thumbnail_path
  CHECK (
    primary_url IS NOT NULL OR
    embed_url IS NOT NULL OR
    thumbnail_path IS NOT NULL
  )
);
CREATE INDEX idx_portfolio_owner ON public.freelancer_portfolio_items(freelancer_id, display_order) WHERE visibility = 'public';
CREATE INDEX idx_portfolio_featured ON public.freelancer_portfolio_items(freelancer_id, is_featured, display_order) WHERE is_featured = true;
CREATE INDEX idx_portfolio_category ON public.freelancer_portfolio_items(category_id) WHERE category_id IS NOT NULL;

-- ==========================================================================
-- 3. EXISTING TABLE EXTENSIONS
-- ==========================================================================

-- freelancer_profiles gets a specialty slug (already partially exists)
ALTER TABLE public.freelancer_profiles
  ADD COLUMN IF NOT EXISTS specialty_slug text;
-- (constraint added once catalog is seeded)
```

### RLS principles

```sql
-- Catalog tables: anyone can read, only admin can mutate
ALTER TABLE public.freelancer_tool_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY tool_catalog_public_read ON public.freelancer_tool_catalog 
  FOR SELECT USING (is_active = true);
CREATE POLICY tool_catalog_admin_all ON public.freelancer_tool_catalog 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- (Same pattern for freelancer_account_platform_catalog and the two specialty_* mappings)

-- Freelancer-owned tables: public read (subject to visibility), owner mutation only
ALTER TABLE public.freelancer_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY freelancer_tools_public_read ON public.freelancer_tools 
  FOR SELECT USING (true);
CREATE POLICY freelancer_tools_owner_all ON public.freelancer_tools 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles 
      WHERE profile_id = freelancer_tools.freelancer_id AND profile_id = auth.uid()
    )
  );

-- Professional accounts: visibility-aware read, owner-only mutation
ALTER TABLE public.freelancer_professional_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_public_read ON public.freelancer_professional_accounts 
  FOR SELECT USING (
    visibility = 'public' OR 
    (visibility = 'logged_in' AND auth.uid() IS NOT NULL) OR
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles 
      WHERE profile_id = freelancer_id AND profile_id = auth.uid()
    )
  );
CREATE POLICY accounts_owner_all ON public.freelancer_professional_accounts 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles 
      WHERE profile_id = freelancer_professional_accounts.freelancer_id 
      AND profile_id = auth.uid()
    )
  );

-- OAuth tokens: NO CLIENT ACCESS AT ALL — service role only
ALTER TABLE public.freelancer_oauth_tokens ENABLE ROW LEVEL SECURITY;
-- No policies at all = no client access. Service role bypasses RLS by design.

-- Portfolio items: visibility-aware read, owner-only mutation
-- (same pattern as professional accounts)
```

### Storage buckets

```
portfolio-media/        (public read via signed-URL convention; owner write)
  └── {freelancer_id}/
      └── {item_id}/

profile-avatars/        (public read; owner write)
  └── {freelancer_id}.webp

verifications/          (admin-only read; owner write)
  └── {freelancer_id}/
      ├── diploma.pdf
      ├── sworn-translator-cert.pdf
      └── cin-front.jpg
```

### Server actions (Next.js)

Per `engineering-standards.md`: all writes via server actions, never direct client → Supabase mutation.

- `addToolToProfile(toolId | customName)`
- `updateToolProficiency(toolId, proficiency, years)`
- `removeTool(toolId)`
- `connectAccount(platformId, url)` — handles click-through verification
- `initiateOAuth(platformId)` — returns OAuth redirect URL
- `completeOAuth(platformId, code, state)` — server-side token exchange
- `disconnectAccount(platformId)` — revokes token + removes record
- `addPortfolioItem(item)` — handles upload + URL validation
- `reorderPortfolioItems(orderedIds[])`

### Form UX flow (the profile wizard)

```
Step 1: Pick specialty
   → "Quelle est votre spécialité principale ?"
   → Dropdown of 15 specialties (+ Autre with free text)
   → Sets freelancer_profiles.specialty_slug

Step 2: Tools (auto-loaded based on specialty)
   SELECT t.*, st.is_essential, st.is_default_suggestion
   FROM freelancer_specialty_tools st
   JOIN freelancer_tool_catalog t ON t.id = st.tool_id
   WHERE st.specialty_slug = $1
   ORDER BY st.display_order, t.name;

   → Chips render grouped: Essential / Recommended / Other
   → Essential are pre-checked, can be deselected
   → "+ Outil personnalisé" allows free text (creates with tool_id=null + custom_tool_name)
   → For each, optional proficiency dropdown + years input

Step 3: Professional accounts (auto-loaded)
   SELECT p.*, sap.is_essential, sap.is_default_suggestion
   FROM freelancer_specialty_account_platforms sap
   JOIN freelancer_account_platform_catalog p ON p.id = sap.platform_id
   WHERE sap.specialty_slug = $1
   ORDER BY sap.display_order;

   → For each suggested platform: "Connecter" button
     → If supports_oauth: OAuth flow
     → If not: input field for URL → click-through validation on submit

Step 4: Portfolio (3-piece minimum encouraged)
   → "Ajouter votre première réalisation"
   → Choose: Link-out / Embed / Self-upload
   → Title, description, tools used (multi-select from already-added tools), tags
```

---

## Section 19 — Security standards

Non-negotiable rules for every implementation in this spec. Many of these reinforce the existing standards in `engineering-standards.md`.

### A. OAuth implementation rules

1. **Authorization Code flow with PKCE — always.** Never Implicit flow. Never Resource Owner Password Credentials.
2. **Server-side token exchange only.** The `client_secret` lives in environment variables and is never sent to the browser.
3. **Validate `state` parameter on every callback** to prevent CSRF. Generate via `crypto.randomUUID()`, store in a signed httpOnly cookie or server-side session, compare on return.
4. **Request minimum scopes.** For LinkedIn: `openid profile email` is enough for verification. For GitHub: `read:user` is enough. Don't ask for `write` or `admin` scopes unless absolutely required.
5. **GitHub-specific:** prefer **GitHub App** over OAuth App. OAuth App tokens never expire (revoked after 1 year inactivity); GitHub App tokens expire in 8 hours with refresh tokens — strictly better security model.
6. **LinkedIn-specific:** use the new **OIDC-compliant Authentication API**, not the legacy v2 endpoints. Returns proper ID tokens.
7. **Meta-specific:** request only `public_profile` and `email` (auto-granted). Deeper scopes require Meta App Review with video walkthrough.
8. **Single callback URL per OAuth App per environment.** Don't share OAuth apps between dev/staging/prod — each gets its own registration. This is enforced by GitHub and recommended for all.

### B. Token storage rules

1. **NEVER store access/refresh tokens in plaintext.** Use one of:
   - **Postgres pgcrypto**: `pgp_sym_encrypt(token, current_setting('app.encryption_key'))`. Key in Supabase environment variables.
   - **App-layer AES-256-GCM**: encrypt in Next.js server actions before insert. More portable, easier key rotation.
   - **Decision for Servyou:** start with app-layer AES-256-GCM in server actions. Key in Vercel environment variable `OAUTH_TOKEN_ENCRYPTION_KEY` (32-byte base64). This makes key rotation a simple env var update + background re-encryption job, without DB migration.
2. **Token table has no RLS policies.** No policies at all = no client access. Only service role can read. Server actions call Supabase with service role explicitly for OAuth operations.
3. **Tokens deleted on:**
   - User disconnect (explicit "Disconnect account" action)
   - Account deletion (CASCADE)
   - OAuth scope revocation by user on the platform (detect via webhook if available)
4. **Refresh proactively** — background cron refreshes tokens 1 hour before expiry, so user actions never block on refresh.
5. **Audit log every token use** (in the existing `audit_logs` table) — `event_type='oauth_token_use'`, includes platform, action, success/fail.

### C. Verification trust hierarchy

1. **OAuth-verified** ✅ green badge — strongest signal, the platform itself confirmed identity
2. **Admin-verified** 🛡️ blue Servyou badge — for documents like sworn translator certs, diplomas, certifications
3. **Click-through verified** 🟡 yellow badge — URL resolves + matches expected format
4. **Manual entry** (no badge) — taken at face value, no signal of verification

These badges are visible to buyers — they directly increase trust and (per Fiverr/Upwork data) hire rates.

### D. Public exposure rules

- **Tokens NEVER exposed in any client response, ever.** Server actions return success/error only, never the token itself.
- **Account URLs visible** based on the per-account `visibility` field (`public` / `logged_in` / `hidden`).
- **Verification status visible** to public viewers (badges are part of the trust system).
- **Cached metadata** (follower count, etc.) is visible based on the account's visibility setting.
- **No PII leakage** — when serving public profile, query specific allowed columns explicitly, never `SELECT *`.

### E. External API rate limiting

- **Cache fetched profile data for 24 hours.** Most external APIs (LinkedIn, GitHub) have strict rate limits.
- **Background job** refreshes cached data on a schedule (weekly for most platforms), not on every page view.
- **Exponential backoff** on 429 responses: 2s, 4s, 8s, 16s, then give up and serve stale cache.
- **Per-platform daily quota tracking** in a simple `external_api_usage` table: prevents runaway bills + rate-limit lockouts.
- **GitHub specifically:** use ETags for conditional GET — saves quota when nothing has changed.

### F. Webhook security

For platforms that send webhooks (LinkedIn for token revocation, GitHub for repo events, etc.):

1. **Verify HMAC signature** on every webhook using the platform's webhook secret.
2. **Idempotency keys** — each webhook has a unique ID; if already processed, return 200 without re-processing.
3. **Reject webhooks older than 5 minutes** based on timestamp header — prevents replay attacks.
4. **Webhook endpoint is public** but only acts on verified signatures.
5. **Log all webhooks** (success + failure) in `audit_logs`.

### G. Document upload handling (verifications/)

For CIN scans, diplomas, sworn translator certs, etc.:

1. **Bucket NOT public.** Only signed URLs work, and only admin role can sign.
2. **Signed URLs expire in 5 minutes** — short window prevents URL sharing/leaks.
3. **Audit log on every read** — `event_type='kyc_document_read'`, includes admin user, document ID, freelancer ID.
4. **Encrypted at rest** — Supabase Storage default plus optional server-side encryption with customer-managed keys.
5. **Document deleted after verification recorded** — only a hash + verification date + verifier admin ID is kept long-term. We don't keep the actual CIN scan after verification is done.
6. **Maximum retention 90 days** before forced deletion of any uploaded verification doc.

### H. Content Security Policy (CSP)

In Next.js middleware, set strict CSP headers:
- `frame-src` allowlist: `youtube.com`, `youtube-nocookie.com`, `vimeo.com`, `soundcloud.com`, `codesandbox.io`, etc. (only platforms whose embeds we trust)
- `connect-src` allowlist: Supabase project URL, configured OAuth providers' callback URLs
- `img-src` allowlist: Supabase Storage CDN, Vercel image optimization, plus the cached metadata image domains we know about (avatars from GitHub, LinkedIn, etc.)
- `default-src 'self'` baseline

### I. Sanitization & XSS

- All user input through server actions validated with **Zod schemas** (consistent with existing Servyou pattern).
- URLs validated against expected regex per platform before storage.
- No `dangerouslySetInnerHTML` for any user content.
- Markdown rendered through a sanitizing renderer (e.g. `react-markdown` with rehype-sanitize).

### J. SQL injection

- All queries through **typed Supabase client** with parameter binding.
- Raw SQL only in migrations + RPCs, never in app code.

### K. Threat model summary

- **Tunisia + remote freelance context** means: freelancers are non-technical, brand-conscious, sensitive to scams.
- **Top threats:** fake verification (claiming credentials they don't have), portfolio theft (copying someone else's work), credential phishing (fake OAuth screens).
- **Top mitigations:** prefer OAuth verification (highest trust), admin review for documents, reverse image search built into admin tools for portfolio review (Phase 3), reporting flow for theft.

---

## Section 20 — Scalability standards

How this scales from 100 freelancers → 100,000 freelancers without rewriting.

### A. Database indexing strategy

Required indexes (called out in Section 18 schema):
- `freelancer_tools(freelancer_id, display_order)` — profile page rendering
- `freelancer_tools(tool_id)` partial index — "who uses Figma?" search
- `freelancer_professional_accounts(freelancer_id, display_order)` — profile rendering
- `freelancer_professional_accounts(platform_id)` — "who has a Behance?" filtering
- `freelancer_professional_accounts(freelancer_id, is_verified)` partial — fast verified-only filtering
- `freelancer_portfolio_items(freelancer_id, display_order)` partial on visibility='public' — fast public browse
- `freelancer_portfolio_items(freelancer_id, is_featured, display_order)` — fast featured filter
- `freelancer_oauth_tokens(expires_at)` — background refresh job query

For tool catalog (~500 tools total): no special indexing needed, fits in memory.

For specialty_tools mapping (15 specialties × ~30 tools each = ~450 rows): index `(specialty_slug)` is enough.

### B. Caching strategy

| Data | TTL | Where |
|---|---|---|
| Tool catalog | 1 hour | Client-side (React Query) |
| Specialty → tools mapping | 1 hour | Client-side |
| Account platform catalog | 1 hour | Client-side |
| External profile metadata (GitHub stats, LinkedIn followers) | 24 hours | DB column `cached_metadata` + `cached_at` |
| OAuth public keys (JWKS) | 1 hour | In-memory per server instance |
| Profile page render (public) | 5 minutes | Vercel Edge cache via `revalidate` |

### C. CDN & media

- All Supabase Storage media served through Supabase CDN (default).
- Portfolio thumbnails: max 1200×1200 source, served as WebP at responsive sizes via Next.js Image.
- Lazy-load below-fold portfolio items (`loading="lazy"` + intersection observer).
- `priority` only for featured/above-fold items (first 4-6 portfolio cards).

### D. Pagination

- Public freelancer browse: cursor-based pagination, 24 per page (existing pattern in Servyou).
- Portfolio items on profile: 12 visible + "Voir plus" → infinite scroll.
- Tool catalog dropdown in form: filter-as-you-type, max 50 visible at once.
- Account platforms list: small list (< 30 platforms total), always show all.

### E. Search performance integration

- New `tools_used` column on portfolio items (array of catalog IDs) — enables "show me portfolio items using Figma" filtering.
- When the deferred PR-F2.X.search migration ships (extending search_vector to include tags + deliverables on services), also extend to portfolio item titles + descriptions for the public marketplace search.
- Use Postgres trigram indexes (`pg_trgm` extension) for typo-tolerant tool name search.

### F. Background jobs

When usage demands them:
- **Token refresh job** — runs hourly, refreshes any OAuth token expiring in the next 2 hours. Supabase Edge Function + cron.
- **External profile refresh** — runs weekly per account, updates `cached_metadata` from GitHub/LinkedIn/Behance APIs.
- **Verification expiry** — sworn translator certs and CIN verifications expire after N years; job flags expired verifications and emails freelancer to re-verify.
- **Portfolio thumbnail generation** — if a portfolio item is added without a thumbnail and has a primary_url, async job generates a screenshot via headless Chromium (when at scale).

### G. Read replicas & sharding

- **Initially:** single Supabase instance handles everything.
- **At ~10K active freelancers:** enable Supabase read replicas, route marketplace browse + profile views to replicas (writes still to primary).
- **At ~50K active freelancers:** shard by region (Tunisia / North Africa / international) if data localization becomes important.

### H. Cost containment

- OAuth API calls are mostly free, but rate-limited. Cache aggressively (Section 19E).
- LinkedIn API: strict quota — refresh metadata only weekly per profile.
- GitHub API: 5000 req/hour authenticated. Use ETags for conditional GET to save quota.
- Supabase Storage: keep portfolio media under 100MB per file initially. For video, encourage Vimeo embeds instead of self-upload (free for Servyou).
- Image storage: progressive JPEG / WebP / AVIF (where supported) — reduce egress costs.

### I. Migration sequencing rules (per `engineering-standards.md`)

- All schema changes ship via timestamped migrations in `supabase/migrations/`.
- One conceptual change per migration (one-decision-per-migration principle reinforced by the PR-F2.3 search_vector decision).
- Migrations are forward-only — rollback via new migration, never `DROP`.
- New tables: ENABLE RLS in the same migration that creates them.
- New columns: use `NOT NULL DEFAULT` for safe backfill on existing rows (same pattern PR-F2.3 used).

### J. Monitoring (when needed)

- Track per-endpoint p50/p95/p99 latency in Vercel Analytics.
- Track OAuth callback success rate per platform (alert if it drops below 95%).
- Track external API rate limit headroom (alert if any platform hits 80% of daily quota).
- Track verification badge counts on the marketplace (signal of healthy verification adoption).

---

## Section 21 — Implementation phases

Maps to the freelancer epic phases already established in `servyou-freelancer-world-class-spec.md` Section 12.

### Phase 1 — MVP (next 2-3 weeks, alongside PR-F7 profile wizard)

**Goal:** Tools + accounts + portfolio basics. Manual entry + click-through verification only. No OAuth yet.

PRs:
- **PR-F2.4** — Catalog tables migration + seed (100 tools, 20 platforms across the 15 specialties)
- **PR-F2.5** — Specialty selector on profile + tool chip input on profile wizard (reads from catalog)
- **PR-F2.6** — Professional account fields with click-through verification
- **PR-F2.7** — Portfolio item table + add/edit/delete (link-out + uploaded thumbnail)
- **PR-F2.8** — Public freelancer profile page renders tools, accounts, portfolio

**Verification:** Manual / click-through only. Badges visible but no green check yet.

### Phase 2 — Trust signals (weeks 4-8)

**Goal:** OAuth for designer + developer flow. First verified badges appearing.

PRs:
- **PR-F2.9** — LinkedIn OAuth integration (all categories benefit)
- **PR-F2.10** — GitHub OAuth integration (developers, data, AI)
- **PR-F2.11** — Behance + Dribbble OAuth (designers)
- **PR-F2.12** — Verification badge rendering on profile + marketplace cards
- **PR-F2.13** — Document upload + admin verification flow (sworn translators, diplomas)
- **PR-F2.14** — Portfolio embed support (YouTube, Vimeo iframes)

### Phase 3 — Communication & creator categories (weeks 9-12)

**Goal:** OAuth for visual/creator categories. Cached metadata refresh.

PRs:
- **PR-F2.15** — Vimeo OAuth (video editors)
- **PR-F2.16** — Instagram OAuth (photographers, UGC)
- **PR-F2.17** — TikTok OAuth (UGC creators)
- **PR-F2.18** — Hugging Face + Kaggle profile fetch (data + AI)
- **PR-F2.19** — Background job: weekly external profile metadata refresh

### Phase 4 — Financial / advanced (months 4-6)

**Goal:** Niche platforms + verification of marketplace history.

PRs:
- **PR-F2.20** — Voices.com / Voice123 click-through with manual admin verification
- **PR-F2.21** — ProZ.com KudoZ point fetch (translators)
- **PR-F2.22** — Upwork / Fiverr earnings history (if API access becomes available)
- **PR-F2.23** — Portfolio item screenshot generation (headless Chromium)

### Phase 5 — Scale features (month 6+)

PRs:
- **PR-F2.24** — Stack Overflow OAuth + reputation badge (developers, data)
- **PR-F2.25** — Reverse image search for portfolio theft detection
- **PR-F2.26** — Saved verification expiry tracking + auto-reminders

---

## Section 22 — Master seed catalog

Concrete seed data to populate `freelancer_tool_catalog` and `freelancer_account_platform_catalog` in PR-F2.4. **Not exhaustive** — start here, expand based on user adoption signals.

### Tool catalog seed (representative subset — full list in seed migration)

```sql
-- Design tools
INSERT INTO freelancer_tool_catalog (slug, name, category) VALUES
  ('figma',           'Figma',           'design'),
  ('photoshop',       'Adobe Photoshop', 'design'),
  ('illustrator',     'Adobe Illustrator','design'),
  ('indesign',        'Adobe InDesign',  'design'),
  ('xd',              'Adobe XD',        'design'),
  ('sketch',          'Sketch',          'design'),
  ('framer',          'Framer',          'design'),
  ('penpot',          'Penpot',          'design'),
  ('canva',           'Canva',           'design'),
  ('procreate',       'Procreate',       'design'),
  ('affinity-designer','Affinity Designer','design'),
  ('after-effects',   'Adobe After Effects','video'),
  ('protopie',        'ProtoPie',        'design'),
  ('axure',           'Axure RP',        'design'),
  ('miro',            'Miro',            'design'),
  ('figjam',          'FigJam',          'design'),
  ('whimsical',       'Whimsical',       'design'),
  ('maze',            'Maze',            'design'),
  ('hotjar',          'Hotjar',          'design');

-- Dev tools
INSERT INTO freelancer_tool_catalog (slug, name, category) VALUES
  ('vscode',          'VS Code',         'development'),
  ('cursor',          'Cursor',          'development'),
  ('git',             'Git',             'development'),
  ('github',          'GitHub',          'development'),
  ('react',           'React',           'development'),
  ('nextjs',          'Next.js',         'development'),
  ('vue',             'Vue.js',          'development'),
  ('svelte',          'Svelte / SvelteKit','development'),
  ('angular',         'Angular',         'development'),
  ('tailwind',        'Tailwind CSS',    'development'),
  ('nodejs',          'Node.js',         'development'),
  ('python',          'Python',          'development'),
  ('django',          'Django',          'development'),
  ('php',             'PHP',             'development'),
  ('laravel',         'Laravel',         'development'),
  ('wordpress',       'WordPress',       'development'),
  ('postgres',        'PostgreSQL',      'development'),
  ('supabase',        'Supabase',        'development'),
  ('firebase',        'Firebase',        'development'),
  ('docker',          'Docker',          'development'),
  ('aws',             'AWS',             'development'),
  ('vercel',          'Vercel',          'development'),
  ('xcode',           'Xcode',           'development'),
  ('android-studio',  'Android Studio',  'development'),
  ('react-native',    'React Native',    'development'),
  ('flutter',         'Flutter',         'development'),
  ('swift',           'Swift',           'development'),
  ('kotlin',          'Kotlin',          'development');

-- Marketing / SEO tools
INSERT INTO freelancer_tool_catalog (slug, name, category) VALUES
  ('semrush',         'SEMrush',         'marketing'),
  ('ahrefs',          'Ahrefs',          'marketing'),
  ('moz',             'Moz Pro',         'marketing'),
  ('search-console',  'Google Search Console','marketing'),
  ('analytics-ga4',   'Google Analytics 4','marketing'),
  ('google-ads',      'Google Ads',      'marketing'),
  ('meta-ads',        'Meta Ads Manager','marketing'),
  ('tiktok-ads',      'TikTok Ads Manager','marketing'),
  ('linkedin-ads',    'LinkedIn Ads',    'marketing'),
  ('hubspot',         'HubSpot',         'marketing'),
  ('mailchimp',       'Mailchimp',       'marketing'),
  ('surfer-seo',      'Surfer SEO',      'marketing'),
  ('frase',           'Frase',           'marketing'),
  ('clearscope',      'Clearscope',      'marketing'),
  ('screaming-frog',  'Screaming Frog',  'marketing'),
  ('buffer',          'Buffer',          'marketing'),
  ('hootsuite',       'Hootsuite',       'marketing'),
  ('later',           'Later',           'marketing'),
  ('sprout-social',   'Sprout Social',   'marketing'),
  ('metricool',       'Metricool',       'marketing');

-- Writing tools
INSERT INTO freelancer_tool_catalog (slug, name, category) VALUES
  ('grammarly',       'Grammarly',       'writing'),
  ('hemingway',       'Hemingway Editor','writing'),
  ('notion',          'Notion',          'productivity'),
  ('google-docs',     'Google Docs',     'productivity'),
  ('scrivener',       'Scrivener',       'writing'),
  ('claude',          'Claude (Anthropic)','ai'),
  ('chatgpt',         'ChatGPT (OpenAI)','ai'),
  ('gemini',          'Gemini (Google)', 'ai'),
  ('perplexity',      'Perplexity',      'ai'),
  ('jasper',          'Jasper',          'writing'),
  ('copy-ai',         'Copy.ai',         'writing'),
  ('quillbot',        'QuillBot',        'writing'),
  ('deepl',           'DeepL',           'writing'),
  ('proz',            'ProZ.com',        'writing');

-- CAT tools (translators)
INSERT INTO freelancer_tool_catalog (slug, name, category) VALUES
  ('trados',          'SDL Trados Studio','writing'),
  ('memoq',           'memoQ',           'writing'),
  ('omegat',          'OmegaT',          'writing'),
  ('matecat',         'MateCat',         'writing'),
  ('smartcat',        'Smartcat',        'writing'),
  ('phrase',          'Phrase (Memsource)','writing');

-- Video tools
INSERT INTO freelancer_tool_catalog (slug, name, category) VALUES
  ('premiere',        'Adobe Premiere Pro','video'),
  ('davinci',         'DaVinci Resolve', 'video'),
  ('final-cut',       'Final Cut Pro',   'video'),
  ('capcut',          'CapCut',          'video'),
  ('descript',        'Descript',        'video'),
  ('cinema4d',        'Cinema 4D',       'video'),
  ('blender',         'Blender',         'video'),
  ('artgrid',         'Artgrid',         'video'),
  ('storyblocks',     'Storyblocks',     'video'),
  ('envato',          'Envato Elements', 'video'),
  ('motion-array',    'Motion Array',    'video'),
  ('epidemic-sound',  'Epidemic Sound',  'video'),
  ('artlist',         'Artlist',         'video'),
  ('frame-io',        'Frame.io',        'video');

-- Photo tools
INSERT INTO freelancer_tool_catalog (slug, name, category) VALUES
  ('lightroom',       'Adobe Lightroom', 'photo'),
  ('capture-one',     'Capture One',     'photo'),
  ('photo-mechanic',  'Photo Mechanic',  'photo'),
  ('luminar',         'Luminar Neo',     'photo'),
  ('topaz',           'Topaz Photo AI',  'photo'),
  ('pixieset',        'Pixieset',        'photo'),
  ('shootproof',      'ShootProof',      'photo'),
  ('honeybook',       'HoneyBook',       'photo'),
  ('dubsado',         'Dubsado',         'photo');

-- Audio tools
INSERT INTO freelancer_tool_catalog (slug, name, category) VALUES
  ('audacity',        'Audacity',        'audio'),
  ('audition',        'Adobe Audition',  'audio'),
  ('pro-tools',       'Pro Tools',       'audio'),
  ('reaper',          'Reaper',          'audio'),
  ('logic-pro',       'Logic Pro',       'audio'),
  ('izotope-rx',      'iZotope RX',      'audio'),
  ('krisp',           'Krisp',           'audio'),
  ('elevenlabs',      'ElevenLabs',      'ai'),
  ('source-connect',  'Source-Connect',  'audio');

-- Data tools
INSERT INTO freelancer_tool_catalog (slug, name, category) VALUES
  ('jupyter',         'Jupyter Notebook','data'),
  ('colab',           'Google Colab',    'data'),
  ('pandas',          'pandas',          'data'),
  ('scikit-learn',    'scikit-learn',    'data'),
  ('tableau',         'Tableau',         'data'),
  ('power-bi',        'Power BI',        'data'),
  ('looker-studio',   'Looker Studio',   'data'),
  ('snowflake',       'Snowflake',       'data'),
  ('bigquery',        'BigQuery',        'data'),
  ('databricks',      'Databricks',      'data'),
  ('dbt',             'dbt',             'data'),
  ('airflow',         'Apache Airflow',  'data'),
  ('streamlit',       'Streamlit',       'data');

-- AI tools
INSERT INTO freelancer_tool_catalog (slug, name, category) VALUES
  ('openai-api',      'OpenAI API',      'ai'),
  ('anthropic-api',   'Anthropic Claude API','ai'),
  ('langchain',       'LangChain',       'ai'),
  ('llamaindex',      'LlamaIndex',      'ai'),
  ('pinecone',        'Pinecone',        'ai'),
  ('weaviate',        'Weaviate',        'ai'),
  ('chroma',          'Chroma',          'ai'),
  ('pgvector',        'Supabase pgvector','ai'),
  ('hugging-face',    'Hugging Face',    'ai'),
  ('replicate',       'Replicate',       'ai'),
  ('midjourney',      'Midjourney',      'ai'),
  ('stable-diffusion','Stable Diffusion','ai'),
  ('runway',          'Runway',          'ai'),
  ('lovable',         'Lovable',         'ai'),
  ('cursor-ai',       'Cursor',          'ai');

-- UGC editing tools (overlap with video)
INSERT INTO freelancer_tool_catalog (slug, name, category) VALUES
  ('inshot',          'InShot',          'video'),
  ('submagic',        'Submagic',        'video'),
  ('kapwing',         'Kapwing',         'video'),
  ('billo',           'Billo',           'video'),
  ('collabstr',       'Collabstr',       'video');

-- Admin / VA tools
INSERT INTO freelancer_tool_catalog (slug, name, category) VALUES
  ('google-workspace','Google Workspace','productivity'),
  ('microsoft-365',   'Microsoft 365',   'productivity'),
  ('slack',           'Slack',           'communication'),
  ('zoom',            'Zoom',            'communication'),
  ('google-meet',     'Google Meet',     'communication'),
  ('loom',            'Loom',            'communication'),
  ('asana',           'Asana',           'productivity'),
  ('clickup',         'ClickUp',         'productivity'),
  ('trello',          'Trello',          'productivity'),
  ('monday',          'Monday.com',      'productivity'),
  ('toggl',           'Toggl Track',     'productivity'),
  ('clockify',        'Clockify',        'productivity'),
  ('calendly',        'Calendly',        'productivity'),
  ('hubspot-crm',     'HubSpot CRM',     'admin'),
  ('pipedrive',       'Pipedrive',       'admin'),
  ('zapier',          'Zapier',          'productivity'),
  ('make',            'Make (Integromat)','productivity'),
  ('quickbooks',      'QuickBooks',      'finance'),
  ('wave',            'Wave',            'finance'),
  ('whatsapp',        'WhatsApp',        'communication');
```

### Account platform catalog seed

```sql
INSERT INTO freelancer_account_platform_catalog 
  (slug, name, category, base_url, url_pattern, supports_oauth, oauth_provider) VALUES
  ('linkedin',     'LinkedIn',      'professional', 'https://www.linkedin.com/in/',
   '^https://(www\.)?linkedin\.com/in/[a-zA-Z0-9-]+/?$', true, 'linkedin'),
  ('github',       'GitHub',        'professional', 'https://github.com/',
   '^https://(www\.)?github\.com/[a-zA-Z0-9-]+/?$', true, 'github'),
  ('behance',      'Behance',       'portfolio',    'https://www.behance.net/',
   '^https://(www\.)?behance\.net/[a-zA-Z0-9_-]+/?$', true, 'adobe'),
  ('dribbble',     'Dribbble',      'portfolio',    'https://dribbble.com/',
   '^https://(www\.)?dribbble\.com/[a-zA-Z0-9_-]+/?$', true, 'dribbble'),
  ('vimeo',        'Vimeo',         'portfolio',    'https://vimeo.com/',
   '^https://(www\.)?vimeo\.com/[a-zA-Z0-9_-]+/?$', true, 'vimeo'),
  ('youtube',      'YouTube',       'portfolio',    'https://youtube.com/',
   '^https://(www\.)?youtube\.com/(@|c/|channel/|user/)[a-zA-Z0-9_-]+/?$', true, 'google'),
  ('instagram',    'Instagram',     'social',       'https://www.instagram.com/',
   '^https://(www\.)?instagram\.com/[a-zA-Z0-9_.]+/?$', true, 'meta'),
  ('tiktok',       'TikTok',        'social',       'https://www.tiktok.com/@',
   '^https://(www\.)?tiktok\.com/@[a-zA-Z0-9_.]+/?$', true, 'tiktok'),
  ('twitter',      'X (Twitter)',   'social',       'https://twitter.com/',
   '^https://(www\.|x\.com|twitter\.com)/[a-zA-Z0-9_]+/?$', true, 'twitter'),
  ('huggingface',  'Hugging Face',  'community',    'https://huggingface.co/',
   '^https://huggingface\.co/[a-zA-Z0-9_-]+/?$', true, 'huggingface'),
  ('kaggle',       'Kaggle',        'community',    'https://www.kaggle.com/',
   '^https://(www\.)?kaggle\.com/[a-zA-Z0-9_-]+/?$', false, NULL),
  ('500px',        '500px',         'portfolio',    'https://500px.com/p/',
   '^https://500px\.com/p/[a-zA-Z0-9_-]+/?$', false, NULL),
  ('flickr',       'Flickr',        'portfolio',    'https://www.flickr.com/people/',
   '^https://(www\.)?flickr\.com/people/[a-zA-Z0-9_-]+/?$', false, NULL),
  ('stackoverflow','Stack Overflow','community',    'https://stackoverflow.com/users/',
   '^https://stackoverflow\.com/users/[0-9]+(/[a-zA-Z0-9-]+)?/?$', true, 'stackexchange'),
  ('medium',       'Medium',        'portfolio',    'https://medium.com/@',
   '^https://medium\.com/@[a-zA-Z0-9_.-]+/?$', false, NULL),
  ('substack',     'Substack',      'portfolio',    'https://',
   '^https://[a-zA-Z0-9-]+\.substack\.com/?$', false, NULL),
  ('proz',         'ProZ.com',      'marketplace',  'https://www.proz.com/profile/',
   '^https://(www\.)?proz\.com/profile/[0-9]+/?$', false, NULL),
  ('voices',       'Voices.com',    'marketplace',  'https://www.voices.com/profiles/',
   '^https://(www\.)?voices\.com/profiles/[a-zA-Z0-9-]+/?$', false, NULL),
  ('voice123',     'Voice123',      'marketplace',  'https://voice123.com/',
   '^https://(www\.)?voice123\.com/[a-zA-Z0-9-]+/?$', false, NULL),
  ('soundcloud',   'SoundCloud',    'portfolio',    'https://soundcloud.com/',
   '^https://(www\.)?soundcloud\.com/[a-zA-Z0-9_-]+/?$', true, 'soundcloud');
```

### Specialty → tools mapping seed (illustrative — full mapping shipped in PR-F2.4)

For example, `ui_ux_designer` specialty maps to:

```sql
INSERT INTO freelancer_specialty_tools (specialty_slug, tool_id, is_essential, is_default_suggestion, display_order)
SELECT 'ui_ux_designer', id, 
       slug IN ('figma'),                                          -- is_essential
       slug IN ('figma', 'figjam', 'miro', 'maze'),               -- is_default_suggestion
       CASE slug
         WHEN 'figma' THEN 1
         WHEN 'figjam' THEN 2
         WHEN 'sketch' THEN 3
         WHEN 'framer' THEN 4
         WHEN 'protopie' THEN 5
         WHEN 'penpot' THEN 6
         WHEN 'axure' THEN 7
         WHEN 'miro' THEN 8
         WHEN 'whimsical' THEN 9
         WHEN 'maze' THEN 10
         WHEN 'hotjar' THEN 11
         ELSE 100
       END
FROM freelancer_tool_catalog
WHERE slug IN ('figma','figjam','sketch','framer','protopie','penpot','axure','miro','whimsical','maze','hotjar');
```

Repeat for all 15 specialties using the tool lists in Sections 1-15 of this document.

---

## Section 13 — How CC should reference this document

For every freelancer tools / accounts / portfolio PR, CC should:

1. **Identify the relevant Section(s)** in this doc and cite them in the commit body
   (e.g., "Per tools spec Section 14, AI specialists get Hugging Face + Replicate as suggested platforms")
2. **Check Phase indication in Section 21** — only build phase-appropriate tools/accounts
3. **Honor Security Section 19** — every OAuth integration must pass the checklist before merge
4. **Honor Scalability Section 20** — every new query needs the appropriate index
5. **Follow naming conventions in Section 18** — `freelancer_*` prefix, `*_catalog` suffix for admin tables
6. **Use the master seed in Section 22** — don't invent new tool slugs without checking the seed first

This document is **a strategic compass for tools + accounts + portfolio integration, not a rigid blueprint.** Adapt as user data reveals real adoption patterns. Update this doc when integration strategy shifts.

---

## Appendix A — Cross-category tools (used by 3+ specialties)

| Tool | Used by |
|---|---|
| **Notion** | Writers, marketers, VAs, devs (everyone) |
| **Figma** | UI/UX, graphic designers, presentation designers, dev (handoff), social media managers (templates) |
| **Adobe Photoshop** | Photo, graphic design, UI/UX (legacy), social media |
| **Adobe After Effects** | Motion design, video editors, graphic designers (animated logos) |
| **Canva** | Graphic designers (entry), social media managers, content creators, VAs |
| **GitHub** | Web dev, mobile dev, data, AI |
| **Slack** | All categories (when working with clients) |
| **WhatsApp** | All categories (Tunisia universal) |
| **Loom** | All categories (async client comms) |
| **CapCut** | UGC, video editors, social media managers |
| **DeepL** | Translators, content writers, VAs |
| **Hugging Face** | Data scientists, AI specialists, ML engineers |

---

## Appendix B — Glossary additions (beyond world-class spec Appendix B)

- **CAT tool** — Computer-Assisted Translation tool (Trados, memoQ, etc.)
- **CDN** — Content Delivery Network
- **CSP** — Content Security Policy (browser header)
- **DAW** — Digital Audio Workstation (Reaper, Pro Tools, Logic, etc.)
- **GEO** — Generative Engine Optimization (SEO for AI search like Perplexity/ChatGPT)
- **JSS** — Job Success Score (Upwork's freelancer rating)
- **KudoZ** — ProZ.com's peer-to-peer terminology Q&A points system
- **NLE** — Non-Linear Editor (any video editing software)
- **OIDC** — OpenID Connect (auth layer on top of OAuth 2.0)
- **PKCE** — Proof Key for Code Exchange (OAuth security extension)
- **RAG** — Retrieval-Augmented Generation (LLM with vector search)
- **RLS** — Row-Level Security (Postgres / Supabase access control)
- **SERP** — Search Engine Results Page
- **SOP** — Standard Operating Procedure
- **TTS** — Text-to-Speech
- **UGC** — User-Generated Content (the freelance category, not just the content)
- **VO** — Voice Over

---

**End of specification document.**

This document evolves as Servyou learns from real freelancer + buyer behavior. Major revisions should be commit-tracked, with each version dated. Cross-references to `servyou-freelancer-world-class-spec.md` are intentional — these two docs are companions, not replacements.

