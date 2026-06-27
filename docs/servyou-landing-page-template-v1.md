# SERVYOU LANDING PAGE TEMPLATE v1

This is the written design template for the Servyou public marketing landing page. It synthesizes the four reference images Moatez shared (Cultivo SaaS landing, Agency.io DevRel hero, Landing Page Anatomy infographic, Onit high-conversion structure), the Servyou logo's brand DNA (dual-blue S, navy + bright blue), the foundation docs (`servyou-pages-elements-and-interactions.md` section A.1 spec, `servyou-pre-launch-strategic-reference.md` chapters 2-3 hero deep-dive), and the marketplace cold-start research (no Tunisian platform combines products and services, so the page has to do explanatory work fast).

The template is locked before code. Each section below describes what gets built, what content goes in it, what the visual treatment is, and how it serves the page's conversion goal. Reading order matters: hero first, social proof second, problem agitation third, solution fourth, and so on through the high-conversion sequence. Every section earns its place.

When the template is approved, code gets written section by section, each as a focused PR, in localhost review.

---

## The audience this page serves

This page is for **logged-out visitors arriving at Servyou for the first time**. They are mostly Tunisian, mostly French-speaking with Arabic comprehension, mostly mobile-first, mostly arriving from a social media link (a shop owner's Instagram bio, a freelancer's WhatsApp signature) or organic search. They have three to five seconds to decide whether to stay or leave. They have never heard of Servyou and have no mental model for "a platform combining products and services." The page has to teach them what Servyou is, why it matters for them specifically, and why they should sign up — in a single scroll.

What this page is NOT for: logged-in users (who continue to see the existing search-first homepage), people who already know what Servyou is (they go straight to specific pages), and visitors who only want to browse without signing up (handled by the existing browse routes).

---

## The page architecture — eight sections in conversion order

The structure follows the high-conversion pattern from the Onit and Landing Page Anatomy references, adapted to Servyou's marketplace reality.

**Section 1 — Hero (above the fold).** The visitor's first three seconds. Headline, subheadline, two CTAs, hero visual, trust band. The most important section on the page.

**Section 2 — Social proof band.** The trust signals that prove Servyou is real and active. Logos, numbers, or both.

**Section 3 — The Tunisian commerce problem.** Brief problem agitation. What's broken about how Tunisians currently sell and buy online today.

**Section 4 — The Servyou solution (three benefits).** How Servyou solves the problem. Three card-based benefits with icons.

**Section 5 — Who it's for (three journeys).** One section per audience: consumers, shop owners, freelancers. Each with a two-sentence story and a visual.

**Section 6 — How it works.** A four-step numbered process. Trust-building through transparency.

**Section 7 — FAQ.** Five to seven questions answering the trust concerns hesitant visitors have. Accordion pattern.

**Section 8 — Final CTA + footer.** The emotional close, the repeated signup CTA, the comprehensive footer.

---

## Section 1 — Hero (the most important section)

The hero is the page's conversion engine. Every visitor sees this section; most never see anything else. It has to do three things in the first three seconds: name what Servyou is, name what the visitor gets, and offer a single clear action.

### Layout

Two-column desktop layout (text-left, visual-right at LTR; mirrored at RTL). Stacks vertically on mobile (text on top, visual below, primary CTA visible within the first phone-screen height per the strategic reference's mobile-thumb-reachability rule).

### Background treatment

Subtle gradient from `surface-base` (white) at top to `surface-subtle` (very pale slate `#F8FAFC`) at bottom. NOT the loud bright-blue background that the v1 prototype used — that competed with the CTA. The hero background is quiet so the CTA wins the eye.

A second visual treatment to consider: a very faint pattern of the Servyou S-mark repeated at low opacity across the background, like a subtle watermark. This is an optional polish.

### Headline (the largest typography on the page)

**Une vraie maison pour l'économie tunisienne**

Weight 700, sized roughly 64px desktop / 40px mobile. Color: `text-primary` (deep navy `#0F172A`). Tracking slightly tight. The headline names the destination metaphor from `product.md` — Servyou as a *real home* — which is more emotional than functional. It avoids feature-language and goes for outcome-language per the strategic reference's outcome-over-feature rule.

### Subheadline

**Achetez, vendez, et travaillez en dinars tunisiens. Paiement à la livraison, services en français et en arabe, vos données hébergées en Europe.**

Weight 400, sized roughly 20px desktop / 16px mobile. Color: `text-muted` (slate `#64748B`). Max width 480px so it doesn't compete with the headline for line length. This is where the Tunisian-specific positioning gets articulated — dinars, COD, bilingual, EU data hosting.

### CTA pair

Two buttons in a row on desktop, stacked on mobile.

**Primary CTA: "Créer un compte gratuit"** — large pill-shaped filled button, 56px tall, background `brand-accent` (bright blue `#2563EB`), white text, weight 600, with a subtle arrow icon to the right. Links to `/signup`. This is the loudest visual element in the hero by design — it's where conversion happens.

**Secondary CTA: "Découvrir la plateforme"** — pill-shaped ghost button, same height, no background, navy text `text-primary`, thin border `border-subtle`. Links to a scroll-to-section anchor that scrolls smoothly to the "Who it's for" section. Alternative: links to `/`'s logged-in search view as a "browse without signing up" option.

### Hero visual (right column on desktop, below CTAs on mobile)

This is the visual that demonstrates what Servyou actually does. Following the Agency.io reference, the visual has **floating social-proof badges** around it that quantify Servyou's value.

The centerpiece is a **stylized phone mockup** showing the Servyou consumer interface — specifically the "Mes demandes" view with three orders moving through the eight-stage lifecycle stepper. Each order shows a real-looking product (a leather bag, a logo design service, a developer's freelance contract) at a real Tunisian price in TND, with a real Tunisian shop name, and a status badge showing where it is in the lifecycle.

Around the phone mockup, three floating badges drift at slight angles:

- **Badge top-left** — a green checkmark icon + "0% commission" in dark text on white pill background, soft shadow
- **Badge top-right** — a blue location pin icon + "24 gouvernorats" in dark text on white pill, soft shadow
- **Badge bottom-right** — a flag icon (Tunisia colors) + "Tunisien à 100%" in dark text on white pill, soft shadow

The badges visually signal the three core differentiators: honest pricing, geographic coverage, local identity. They're the Agency.io "350% growth / 4.2x ROI" pattern applied to Servyou's actual value props.

The phone mockup has a subtle drop shadow and a gentle rotation (3-5 degrees) so it doesn't feel static. The badges are positioned with slight overlap so the whole composition reads as one layered object, not five separate elements floating in space.

### Trust band (below the hero, full-width thin strip)

A horizontal band, low-key visual weight, separating the hero from the next section. Four mini-trust items, each with a small icon, a number, and a label:

**24** gouvernorats servis  ·  **14** catégories  ·  **0%** de commission au lancement  ·  **Europe** données hébergées

The numbers are weight 700 in `brand-primary` navy, larger than the labels. The labels are weight 500 in `text-muted`. Dots between items. Compact, readable, doesn't shout.

---

## Section 2 — Social proof band

This is where the page proves Servyou is a real platform, not a vapor product. At launch (when Servyou is new), this section is **the founder's most honest moment** — we can't fake testimonials, and we shouldn't.

Two options for what goes here:

**Option A (recommended at launch):** Replace the section with a single founder note. A small portrait photo of Moatez (real photo, not stock), his name and role, and a one-sentence credibility statement in the founder's voice. Example: *"Servyou est construit en Tunisie, par un Tunisien, pour les Tunisiens. Nous n'avons pas de financement extérieur, pas d'actionnaires étrangers, et aucun investisseur à satisfaire. Notre seul engagement est envers vous."* — Moatez Z., fondateur. This is more honest and more powerful than fake testimonials. The cold-start research said founders should "do things that don't scale" — this is one of them.

**Option B (later, when there's real activity):** A row of small logos of partner shops (with permission), a "as featured in" row if any press picks up, real testimonials from the first thirty users post-launch.

We start with Option A. We swap to Option B at the post-launch one-month mark, when there's real activity to point to.

---

## Section 3 — The Tunisian commerce problem (problem agitation)

This is short — one paragraph plus a visual. Following the Landing Page Anatomy reference, this section validates that the visitor has a real pain and Servyou understands it.

### Headline

**Le commerce tunisien mérite mieux qu'Instagram et WhatsApp**

Weight 700, sized 40px desktop / 28px mobile.

### Body paragraph

Today, Tunisians sell on Instagram with screenshots of bank transfers. They take orders in WhatsApp DMs that disappear into a thousand other messages. They lose track of who paid, who didn't, and what they promised to deliver. There is no platform built for Tunisia, in Tunisian dinars, with the trust signals real commerce needs. Until now.

### Visual

A side-by-side comparison: on the left, a chaotic screenshot mockup showing a phone with four messaging app icons all blinking with order notifications and unread DMs. On the right, the same orders organized into Servyou's clean lifecycle dashboard. The visual answers "what's the upgrade?" without words.

---

## Section 4 — The Servyou solution (three benefits)

Three cards side-by-side on desktop, stacked on mobile. Each card has an icon at the top, a bold short title, and a one-paragraph body.

This is the structure from the Cultivo reference (three product benefit cards) adapted to Servyou's positioning. The icons use Lucide via inline SVG (same approach as the navbar PR), in `brand-primary` navy.

**Card 1 — Tunisien d'abord**
Icon: MapPin
Body: Conçu pour la Tunisie, pas adapté depuis ailleurs. Tous les prix en dinars. Livraison dans les 24 gouvernorats. Paiement à la livraison universel, parce que c'est comme ça que la Tunisie achète.

**Card 2 — Honnête sur les prix**
Icon: Wallet
Body: Pas de commission cachée. Pas de frais surprise. Pas d'algorithme qui prend une part. Ce que vous voyez est ce que vous payez, et ce que le vendeur affiche est ce qu'il reçoit.

**Card 3 — Vos données, votre maison**
Icon: Shield
Body: Vos informations restent en Europe, jamais revendues à des annonceurs. Pas de pisteurs tiers, pas de publicités ciblées, pas d'IA qui apprend sur votre dos. Vos données vous appartiennent.

Card background: `surface-base` white with a thin `border-subtle` border and a subtle shadow on hover. Padding generous. Border radius 16px (per the design system reference's card radius).

---

## Section 5 — Who it's for (three journey sections)

Three full-width sections stacked vertically, with **alternating image-left/image-right layout** on desktop (per the A.1 spec). Each section is one role's story.

### Journey 1 — Pour les acheteurs (image right)

**Headline:** Découvrez des produits et services tunisiens, sans inscription.

**Body:** Parcourez les boutiques et les freelances tunisiens librement. Trouvez ce qui vous intéresse, demandez en un clic, payez à la livraison. Suivez votre commande à travers les huit étapes du cycle de vie — de la demande jusqu'à la réception — depuis votre tableau de bord "Mes demandes".

**CTA:** Parcourir les produits → links to `/`

**Visual:** A mockup of the consumer "Mes demandes" view showing three orders at different lifecycle stages. Real Tunisian product names, real prices in TND, real shop names. The stepper visible on each order.

### Journey 2 — Pour les boutiques (image left)

**Headline:** Votre boutique professionnelle en cinq minutes.

**Body:** Créez votre boutique gratuitement. Listez vos produits avec photos et prix. Partagez le lien unique sur Instagram, WhatsApp, ou Facebook. Recevez et gérez vos commandes depuis un tableau de bord conçu pour les vendeurs tunisiens — pas pour des startups américaines.

**CTA:** Créer ma boutique → links to `/signup?role=shop`

**Visual:** A mockup of the shop owner dashboard showing the orders received list with three orders in different lifecycle states, and the next-action button visible on each.

### Journey 3 — Pour les freelances (image right)

**Headline:** Construisez votre profil professionnel, trouvez vos prochains clients.

**Body:** Listez vos services avec prix transparents. Parcourez le tableau d'offres d'emploi posté par des clients tunisiens qui ont besoin de vos compétences. Répondez avec votre prix et votre délai. Le système empêche le spam — maximum 10 réponses par offre, 5 réponses actives par freelance.

**CTA:** Créer mon profil freelance → links to `/signup?role=freelancer`

**Visual:** A mockup of the freelancer dashboard showing the services list and a glimpse of the job board with two open job posts.

---

## Section 6 — How it works (four-step process)

A four-step horizontal process on desktop, stacked vertically on mobile. Each step has a large number (01 / 02 / 03 / 04 in `brand-accent` bright blue), a short title, and a one-line description.

This is the same pattern from the v1 prototype, refined.

**01 — Trouvez**
Parcourez les boutiques et les freelances tunisiens, sans inscription.

**02 — Demandez**
Soumettez une demande gratuite. Aucun engagement, aucun paiement à ce stade.

**03 — Recevez**
Le vendeur vous contacte, organise la livraison, et apporte votre commande.

**04 — Payez**
À la livraison, en dinars, sans intermédiaire et sans surprise.

Visual treatment: each step is a vertical block, generous padding, the number is the dominant visual element (sized 80px desktop / 60px mobile, weight 700). Below the number sits the title (24px, weight 600), then the body (16px, `text-muted`).

A subtle horizontal connector line (dashed, `border-subtle`) runs between the steps on desktop, suggesting flow. Removed on mobile where the steps stack vertically.

---

## Section 7 — FAQ

Five questions, each opens an accordion answer. Defaults all closed. Native `<details>`/`<summary>` for server-rendered accessibility.

The questions are the trust concerns hesitant visitors actually have, per the foundation docs and the strategic reference.

**Q1: Comment Servyou empêche-t-il les arnaques ?**
Tous les vendeurs sont vérifiés à l'inscription. Les acheteurs peuvent signaler tout problème, et notre équipe agit dans les 48 heures. Le paiement à la livraison vous protège : vous payez uniquement quand vous recevez et vérifiez le produit.

**Q2: Et si le produit livré n'est pas ce que j'ai commandé ?**
Vous pouvez refuser la livraison. Aucun paiement n'est exigé tant que vous n'avez pas confirmé la réception en bon état.

**Q3: Servyou prend-il une commission ?**
Non. Au lancement, Servyou est entièrement gratuit pour tous — acheteurs, boutiques, et freelances. Tout futur changement de tarification sera annoncé clairement, avec un préavis et sans surprise. Jamais de frais cachés.

**Q4: Mes données sont-elles vendues à des tiers ?**
Jamais. Vos données restent hébergées en Europe (Frankfurt) et ne sont partagées qu'avec les vendeurs avec qui vous interagissez directement. Pas de pisteurs tiers, pas de publicités ciblées.

**Q5: Pourquoi français et arabe, mais pas anglais ?**
Servyou est conçu pour les Tunisiens d'abord. Le français et l'arabe couvrent l'usage quotidien. L'anglais arrivera plus tard si la communauté le demande.

Each question row, when closed, has a small chevron icon on the right (rotates 180° when open). Hover state: subtle background tint. Click anywhere on the row to expand.

Section background: `surface-subtle` (the pale slate `#F8FAFC`) to visually distinguish from the white sections above.

---

## Section 8 — Final CTA + footer

### Closing CTA block

Full-width section, generous padding (96px top and bottom on desktop, 64px on mobile). Centered alignment. Subtle background — either pure white or a faint gradient using the brand colors.

**Emotional anchor line:**
**Tunis mérite une vraie place du marché. Nous la construisons. Rejoignez-nous.**

Weight 700, sized 40px desktop / 28px mobile. Color: `text-primary` navy.

**Primary CTA below:**
**Créer un compte gratuit** — same styling as the hero primary CTA. Same destination (`/signup`).

This is the moment of conversion for visitors who scrolled all the way through. They've seen the problem, the solution, the journeys, the process, and had their concerns answered. The closing line is emotional, not functional. It earns the conversion.

### Footer

Four-column layout on desktop, stacked into accordion-style collapsible sections on mobile (or simple stacked rows — choice based on what feels right when we build it).

**Column 1 — Brand:**
Servyou logo + wordmark
Tagline: "Une vraie maison pour l'économie tunisienne"
Founder credit: "Construit en Tunisie par Moatez Z."

**Column 2 — Découvrir:**
Boutiques (when route exists) | Freelances (when route exists) | Missions (job board) | Catégories

**Column 3 — Servyou:**
À propos (when page exists) | Contact (when page exists) | FAQ

**Column 4 — Légal:**
Conditions d'utilisation | Confidentialité | Cookies | Accessibilité

For links that don't have corresponding pages yet, we either omit them or point them to a "Bientôt disponible" placeholder. Honest > broken.

**Footer bottom bar:**
Copyright line: `© 2026 Servyou. Tous droits réservés.`
Language toggle: FR / AR pill (same component used in the navbar)
Social icons: Instagram, Facebook (Lucide icons, linking to actual accounts when they exist, otherwise omitted)

Footer background: `brand-primary` navy `#1E3A8A` with white text. This visually closes the page and signals "end of content."

---

## Visual treatment summary

The page uses the locked working brand tokens from the navbar PR:

- **`--brand-primary` (navy #1E3A8A):** headlines, footer background, accent text, primary nav text
- **`--brand-accent` (bright blue #2563EB):** primary CTAs, the "01/02/03/04" step numbers, link hover states, the wordmark's "you"
- **`--brand-accent-light` (#7DAEED):** subtle accents only, hover states on secondary elements
- **`--surface-base` (white):** primary section backgrounds
- **`--surface-subtle` (pale slate #F8FAFC):** alternating section backgrounds for visual rhythm
- **`--text-primary` (#0F172A):** body text
- **`--text-muted` (#64748B):** secondary body text, subheadlines
- **`--border-subtle` (#E2E8F0):** card borders, dividers

Typography: Inter (loaded via `next/font/google`) at weights 400, 500, 600, 700.

Spacing: 8-point grid throughout. Section padding: 96px top and bottom on desktop, 64px on mobile. Card padding: 32px. Gap between cards: 24px.

Border radius: 16px on cards, 12px on buttons, 8px on small chips, 9999px (full pill) on the CTA buttons and the navbar pill capsule.

Shadows: minimal. A subtle `shadow-sm` on cards by default, `shadow-md` on hover. The hero phone mockup gets a slightly larger shadow to feel elevated.

Motion: section content fades in on scroll with a 200ms duration and a 50ms stagger between sibling elements. Buttons have a subtle scale transform on hover (1.02x). All motion respects `prefers-reduced-motion`.

---

## What gets built and in what order

The landing page is built section by section, each as its own focused PR, in localhost review before merge. Order of construction:

**PR-LP1:** Section 1 (Hero) + Section 2 (Founder note social proof). Desktop only, no mobile responsive yet, no Arabic yet. Live at `/` for logged-out users only; logged-in users continue to see the existing search-first homepage. This is the highest-conversion section, so it ships first and gets the most iteration.

**PR-LP2:** Section 3 (Problem agitation) + Section 4 (Three benefits cards). Desktop only.

**PR-LP3:** Section 5 (Three journey sections). Desktop only.

**PR-LP4:** Section 6 (How it works) + Section 7 (FAQ). Desktop only.

**PR-LP5:** Section 8 (Final CTA + footer). Desktop only. At this point, the desktop landing page is complete.

**PR-LP6:** Mobile responsive pass across all eight sections. Single PR to handle the responsive collapse for everything.

**PR-LP7:** Arabic/RTL pass across all eight sections. Single PR for the bilingual layer.

**PR-LP8 (later, optional):** Motion polish — scroll-fade animations, hover micro-interactions, the gentle phone mockup rotation. This is polish that comes after the visual content is locked.

The navbar PR (#61) merges before PR-LP1 starts, so the new landing page sits under the new navbar from day one.

---

## What this template does NOT include

For honest scope management, this template explicitly does NOT cover: a video hero (deferred until a real video exists), real testimonials (deferred until launch+1 month), illustrated assets beyond simple icons (deferred until a designer is engaged), animated micro-interactions beyond basic hover and fade (deferred to PR-LP8), or any feature not already shipped in production (no marketing for features that don't exist yet).

The landing page sells what Servyou IS, not what Servyou WILL BE. Honest > aspirational.

---

## Approval gate

Before any code is written, Moatez reviews this template and either approves it, modifies it, or rejects it. The template is the contract; the code implements the contract. Skipping this gate is what caused the navbar/page mismatch — we built a navbar before the page direction was locked. Locking the template first prevents the repeat.

When approved, Claude Code receives the PR-LP1 prompt (hero + founder note) and the first focused PR ships. Each section in turn until the landing page is complete and Moatez loves it.

— End of template.
