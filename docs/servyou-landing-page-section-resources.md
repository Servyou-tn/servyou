# Servyou Landing Page — Section-by-Section Component & Motion Resource Guide

**Purpose:** This is the master resource map for building every non-hero section of the Servyou landing page to world-class quality. For each section, it specifies the best component library, the specific motion pattern, the reference site to match, and the exact components to install.

**Stack standardized across all sections:**
- React 18+ / Next.js 16
- Tailwind CSS v4.3
- Motion v11+ (formerly Framer Motion) — `npm install motion`
- Magic UI components — copy-paste via `npx shadcn@latest add "https://magicui.design/r/[component]"`
- Aceternity UI components — copy-paste via the shadcn registry pattern
- shadcn/ui base components — for accessible primitives (Accordion, Dialog, etc.)

**Brand tokens to use everywhere:**
- `--brand-primary`: navy `#1E3A8A`
- `--brand-accent`: bright blue `#2563EB`
- `--text-primary`: deep navy text
- `--text-muted`: slate `#64748B`
- Background gradient: `from-sky-50 to-white`

---

## SECTION 2 — Trust Band

**Locked copy:** "24 gouvernorats · 14 catégories · 0% commission · Paiement à la livraison"

### Best component pattern
A horizontal strip of 4 stats, each with a small icon, large number, and small label. Numbers animate from 0 to target value when the section scrolls into view.

### Magic UI component to use
`NumberTicker` — animated number count-up. Install:
```
npx shadcn@latest add "https://magicui.design/r/number-ticker"
```

### Implementation pattern
```tsx
<section className="border-y border-slate-100 bg-white py-12">
  <div className="mx-auto max-w-6xl px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
    <div className="text-center">
      <MapPin className="mx-auto h-6 w-6 text-[var(--brand-accent)]" />
      <NumberTicker value={24} className="mt-2 text-3xl font-bold tabular-nums" />
      <p className="mt-1 text-sm text-slate-600">gouvernorats</p>
    </div>
    {/* repeat for 14 catégories, 0% commission, COD */}
  </div>
</section>
```

### Motion pattern
- Numbers count up from 0 → target when section enters viewport
- Use Motion's `useInView` hook with `triggerOnce: true`
- Duration: 1.5s ease-out
- Stagger: each stat starts 100ms after the previous

### Reference sites
- **Vercel:** stats strip below their hero ("99.99% uptime · 100k+ developers")
- **Linear:** company logos with subtle counter
- **Stripe:** "Trusted by millions of companies" with animated counts

### Quality gate
The numbers should feel like they're "settling into place" — not jittery, not too fast. The ease-out curve is what makes it feel premium.

---

## SECTION 3 — Founder Note

**Locked structure:** Avatar (MZ) + italic French quote from Moatez explaining the mission.

### Best component pattern
A centered single-testimonial card with the avatar to the left or top, italic quote, signature. Background is a soft tinted card with a subtle border.

### Components to combine
- **Aceternity `AnimatedTooltip`** — for the avatar (hover reveals "Moatez, fondateur")
- **Magic UI `ShineBorder`** — subtle moving border on the quote card
- **Magic UI `BlurFade`** — entrance animation on the entire section

Install:
```
npx shadcn@latest add "https://magicui.design/r/shine-border"
npx shadcn@latest add "https://magicui.design/r/blur-fade"
# Aceternity AnimatedTooltip: copy from https://ui.aceternity.com/components/animated-tooltip
```

### Implementation pattern
```tsx
<section className="bg-gradient-to-b from-white to-slate-50 py-24">
  <BlurFade delay={0.1} inView>
    <div className="mx-auto max-w-3xl px-6 text-center">
      <div className="relative inline-block rounded-3xl bg-white p-8 shadow-lg">
        <ShineBorder borderRadius={24} borderWidth={1} duration={14} color={["#2563EB", "#7DAEED"]} />
        <div className="flex flex-col items-center gap-4">
          <AnimatedTooltipAvatar src="/brand/founder-mz.jpg" name="Moatez, fondateur" />
          <blockquote className="text-xl italic text-slate-700 leading-relaxed">
            "{founderQuote}"
          </blockquote>
          <cite className="not-italic text-sm text-slate-500">— Moatez Z., fondateur de Servyou</cite>
        </div>
      </div>
    </div>
  </BlurFade>
</section>
```

### Motion pattern
- Section fades up + blurs sharp on scroll-in via BlurFade
- ShineBorder runs a continuous slow gradient sweep (14s loop) — subtle, premium
- Avatar slightly pulse-glows on hover

### Reference sites
- **Apple:** "A message from Tim Cook" sections on environmental reports
- **Notion:** founder quote on their about page
- **Linear:** Karri Saarinen quotes with subtle border

### Quality gate
Should feel like an intimate handwritten note inserted into the page, not a marketing element. The italic typography + ShineBorder gives it the "this is personal" feel.

---

## SECTION 4 — Problem Agitation

**Locked copy:** "Le commerce tunisien mérite mieux qu'Instagram et WhatsApp." + paragraph below.

### Best component pattern
Bold split-typography. Big H2 with key phrase in bright blue accent, supporting paragraph in muted slate, optional small grid background pattern.

### Components to use
- **Magic UI `HyperText`** — for the H2 — text scrambles letters on scroll-in then settles into the real text (dramatic, memorable)
- **Aceternity `TextGenerateEffect`** — alternative if HyperText is too dramatic; this just reveals word by word
- **Aceternity `Spotlight`** — top-left spotlight effect on the section background for visual emphasis
- **Magic UI `DotPattern`** — subtle dot grid backdrop

Install:
```
npx shadcn@latest add "https://magicui.design/r/hyper-text"
npx shadcn@latest add "https://magicui.design/r/dot-pattern"
# Aceternity Spotlight: copy from https://ui.aceternity.com/components/spotlight
```

### Implementation pattern
```tsx
<section className="relative overflow-hidden bg-white py-32">
  <DotPattern className="absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]" />
  <Spotlight className="-top-40 left-0" fill="rgba(37,99,235,0.15)" />
  
  <div className="relative mx-auto max-w-4xl px-6 text-center">
    <h2 className={`${manrope.className} text-4xl lg:text-6xl font-bold leading-tight`}>
      <HyperText text="Le commerce tunisien" duration={1500} />
      <br />
      <span className="text-[var(--brand-accent)]">mérite mieux</span>
      <br />
      <HyperText text="qu'Instagram et WhatsApp." duration={1500} />
    </h2>
    
    <BlurFade delay={0.6} inView>
      <p className="mt-8 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
        {problemParagraph}
      </p>
    </BlurFade>
  </div>
</section>
```

### Motion pattern
- HyperText runs a Matrix-style letter scramble on scroll-in (or use TextGenerateEffect for a calmer version)
- Spotlight is static but creates the dramatic backdrop
- Paragraph BlurFades up 600ms after the headline

### Reference sites
- **Linear:** "Stop juggling tools" with bold typography
- **Notion:** problem agitation sections on product pages
- **Apple:** dramatic single-line statements ("Built for what's next.")

### Quality gate
The HyperText scramble effect must feel earned, not gimmicky — only one phrase scrambles, the rest is calm. Less is more here.

---

## SECTION 5 — Three Benefits Cards

**Locked copy:** "Tunisien d'abord" (MapPin) · "Honnête sur les prix" (Wallet) · "Vos données votre maison" (Shield)

### Best component pattern
**Bento Grid With Skeletons** (Aceternity Pro pattern) — three asymmetric cards, each with a small illustration/skeleton that animates on hover.

### Components to use
- **Aceternity `BentoGrid` + `BentoGridItem`** — the grid container
- **Aceternity `MagicCard`** (Magic UI version) — spotlight that follows cursor on hover
- **Magic UI `BorderBeam`** — optional, for the featured benefit (Tunisien d'abord)

Install:
```
npx shadcn@latest add "https://magicui.design/r/magic-card"
npx shadcn@latest add "https://magicui.design/r/border-beam"
# Aceternity BentoGrid: copy from https://ui.aceternity.com/components/bento-grid
```

### Implementation pattern
```tsx
<section className="bg-slate-50 py-24">
  <div className="mx-auto max-w-6xl px-6">
    <BlurFade delay={0.1} inView>
      <h2 className="text-3xl lg:text-5xl font-bold text-center mb-16">
        {benefitsHeadline}
      </h2>
    </BlurFade>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MagicCard className="p-8" gradientColor="#2563EB">
        <MapPin className="h-12 w-12 text-[var(--brand-accent)] mb-4" />
        <h3 className="text-xl font-semibold mb-2">Tunisien d'abord</h3>
        <p className="text-slate-600">{benefit1Body}</p>
        <BorderBeam size={200} duration={10} colorFrom="#2563EB" colorTo="#7DAEED" />
      </MagicCard>
      
      <MagicCard className="p-8" gradientColor="#1E3A8A">
        <Wallet className="h-12 w-12 text-[var(--brand-accent)] mb-4" />
        <h3 className="text-xl font-semibold mb-2">Honnête sur les prix</h3>
        <p className="text-slate-600">{benefit2Body}</p>
      </MagicCard>
      
      <MagicCard className="p-8" gradientColor="#1E3A8A">
        <Shield className="h-12 w-12 text-[var(--brand-accent)] mb-4" />
        <h3 className="text-xl font-semibold mb-2">Vos données, votre maison</h3>
        <p className="text-slate-600">{benefit3Body}</p>
      </MagicCard>
    </div>
  </div>
</section>
```

### Motion pattern
- MagicCard: spotlight follows cursor — bright blue radial gradient appears where mouse hovers
- BorderBeam on the first card (the "hero" benefit) — premium accent
- Cards lift on hover: `whileHover={{ y: -4 }}` with spring physics
- BlurFade on entrance, staggered 100ms between cards

### Reference sites
- **Apple iPad pages:** asymmetric bento with hover-animated illustrations
- **Vercel:** feature grids with subtle spotlight on hover
- **Stripe Atlas:** benefits cards with depth on hover

### Quality gate
On hover, the user should feel like they're holding a premium tactile object. Spotlight + lift + shadow deepen — three layers of feedback for one hover gesture.

---

## SECTION 6 — Three Journeys (Acheteurs / Boutiques / Freelances)

**Locked copy:** Three alternating image-text blocks per the template.

### Best component pattern
**Sticky Scroll Reveal** (Aceternity) — the image stays sticky on one side while three text blocks scroll past on the other side, with the image switching as each block enters view. Premium scrollytelling effect.

### Component to use
**Aceternity `StickyScroll`** — copy from https://ui.aceternity.com/components/sticky-scroll-reveal

Alternative if StickyScroll is too complex: three alternating split-screen cards with image switching on scroll-in.

### Implementation pattern (StickyScroll version)
```tsx
const journeys = [
  {
    title: "Pour les acheteurs",
    description: "Découvrez des produits locaux, comparez les prix, demandez avant d'acheter...",
    content: <Image src="/brand/journeys/acheteur.png" alt="Parcours acheteur" />,
    cta: { label: "Explorer la marketplace", href: "/" }
  },
  {
    title: "Pour les boutiques",
    description: "Lancez votre boutique en ligne en 5 minutes, sans commission cachée...",
    content: <Image src="/brand/journeys/boutique.png" alt="Parcours boutique" />,
    cta: { label: "Créer ma boutique", href: "/signup?role=shop" }
  },
  {
    title: "Pour les freelances",
    description: "Trouvez des missions, gérez vos clients, recevez vos paiements...",
    content: <Image src="/brand/journeys/freelance.png" alt="Parcours freelance" />,
    cta: { label: "Devenir freelance", href: "/signup?role=freelancer" }
  }
];

<section className="bg-white py-24">
  <StickyScroll content={journeys} />
</section>
```

### Motion pattern
- Left column: scrolls normally, three text blocks stacked
- Right column: sticky, image switches when the corresponding text block crosses the viewport center
- Image transitions: AnimatePresence with fade + slight scale
- Text blocks: BlurFade as they enter view, dim slightly when not the "active" block

### Reference sites
- **Apple AirPods Pro page:** sticky product image while feature blocks scroll past
- **Stripe Atlas:** alternating sections with scroll-locked images
- **Notion product pages:** sticky scroll reveal pattern

### Quality gate
The image switch must happen at the exact moment the new text block reaches the center of the viewport — not before, not after. Use IntersectionObserver with threshold 0.5.

---

## SECTION 7 — How It Works (4 Steps)

**Locked copy:** 01 Trouvez · 02 Demandez · 03 Recevez · 04 Payez

### Best component pattern
**TracingBeam** (Aceternity) — a vertical SVG beam that follows scroll alongside the 4 numbered steps. The beam fills in as the user scrolls past each step. Stripe uses this exact pattern.

### Component to use
**Aceternity `TracingBeam`** — copy from https://ui.aceternity.com/components/tracing-beam

Combined with:
- **Magic UI `NumberTicker`** on the step numbers (01 → 04 with subtle count-in)
- **Magic UI `BlurFade`** on each step's content

### Implementation pattern
```tsx
const steps = [
  { number: "01", title: "Trouvez", body: "Cherchez parmi des milliers de boutiques et freelances tunisiens..." },
  { number: "02", title: "Demandez", body: "Envoyez votre demande, posez vos questions, négociez le prix..." },
  { number: "03", title: "Recevez", body: "Recevez votre commande à domicile ou retirez en point relais..." },
  { number: "04", title: "Payez", body: "Payez à la livraison, par carte, ou par virement bancaire..." }
];

<section className="bg-white py-32">
  <TracingBeam className="px-6">
    <div className="mx-auto max-w-2xl">
      <h2 className="text-3xl lg:text-5xl font-bold mb-16 text-center">
        Comment ça marche
      </h2>
      
      {steps.map((step, i) => (
        <BlurFade key={step.number} delay={0.1 * i} inView>
          <div className="mb-16">
            <div className="text-7xl font-bold text-[var(--brand-accent)]/20 mb-2">
              {step.number}
            </div>
            <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
            <p className="text-slate-600 leading-relaxed">{step.body}</p>
          </div>
        </BlurFade>
      ))}
    </div>
  </TracingBeam>
</section>
```

### Motion pattern
- TracingBeam: SVG path with stroke-dashoffset animation tied to scroll progress
- Each step's number fades in + the beam reaches that step's height
- Numbers (01-04) styled as large translucent display type, the actual content beside them
- Background can have subtle dot pattern

### Reference sites
- **Stripe:** "How payments work" page — exact TracingBeam pattern
- **Linear:** onboarding flow with progress beam
- **Vercel:** "How deployment works" with stepped beam

### Quality gate
The beam must visually CONNECT the steps — it's not just decoration, it's a metaphor for the journey. The user's eye should follow the beam as they scroll.

---

## SECTION 8 — FAQ Accordion

**Locked structure:** 5 questions, native `<details>`/`<summary>` or controlled accordion.

### Best component pattern
**Aceternity Pro "FAQ With Plus Icon"** — single-column accordion, plus icon rotates to X on open, active item gets a subtle shadow and dashed grid lines extending beyond the card.

### Components to use
- **shadcn/ui `Accordion`** (Radix-based, accessible) — install: `npx shadcn-ui@latest add accordion`
- **Motion** for the icon rotation animation
- Optional: **Magic UI `BorderBeam`** on the currently-open item

### Implementation pattern
```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "Combien coûte Servyou ?", a: "Servyou est gratuit pour les acheteurs. Les vendeurs paient 0% de commission..." },
  { q: "Quand est-ce que je paie ?", a: "Vous payez à la livraison, en cash ou par carte..." },
  { q: "Comment sont vérifiés les vendeurs ?", a: "Tous les vendeurs sont vérifiés par notre équipe..." },
  { q: "Puis-je vendre depuis n'importe où en Tunisie ?", a: "Oui, Servyou couvre les 24 gouvernorats..." },
  { q: "Que se passe-t-il si je reçois un produit défectueux ?", a: "Notre garantie satisfaction couvre 14 jours..." }
];

<section className="bg-slate-50 py-24">
  <div className="mx-auto max-w-3xl px-6">
    <BlurFade inView>
      <h2 className="text-3xl lg:text-5xl font-bold mb-12 text-center">
        Questions fréquentes
      </h2>
    </BlurFade>
    
    <Accordion type="single" collapsible className="space-y-4">
      {faqs.map((faq, i) => (
        <BlurFade key={i} delay={0.05 * i} inView>
          <AccordionItem 
            value={`item-${i}`} 
            className="rounded-2xl border border-slate-200 bg-white px-6 data-[state=open]:shadow-lg data-[state=open]:border-[var(--brand-accent)]/30"
          >
            <AccordionTrigger className="text-left text-base font-medium hover:no-underline py-5">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-slate-600 leading-relaxed pb-5">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        </BlurFade>
      ))}
    </Accordion>
  </div>
</section>
```

### Motion pattern
- Plus icon rotates 0° → 45° (becoming an X) on open
- Content uses Radix's height: auto transition (smooth, accessibility-friendly)
- Active card gets a subtle shadow lift + brand-accent border
- BlurFade entrance staggered by 50ms between items

### Reference sites
- **Stripe:** their docs FAQ
- **Vercel:** pricing page FAQ
- **Linear:** changelog FAQ
- **Apple support pages:** clean accordion pattern

### Quality gate
The accordion must be keyboard-accessible (Tab through, Enter to open, Esc to close). Radix handles this automatically.

---

## SECTION 9 — Final CTA + Footer

### Best component pattern (Final CTA)
Centered headline + Magic UI `ShinyButton` or `RainbowButton` for the primary action, with an animated gradient background.

### Components to use
- **Magic UI `ShinyButton`** — premium shimmering CTA button
- **Magic UI `AuroraText`** — for a key phrase in the headline (gradient that flows)
- **Aceternity `AuroraBackground`** — subtle aurora gradient backdrop
- **Magic UI `Particles`** — ambient particles (reuse from hero)

Install:
```
npx shadcn@latest add "https://magicui.design/r/shiny-button"
npx shadcn@latest add "https://magicui.design/r/aurora-text"
# Aceternity AuroraBackground: copy from https://ui.aceternity.com/components/aurora-background
```

### Implementation pattern
```tsx
<section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-32">
  <AuroraBackground className="absolute inset-0 opacity-50" />
  <Particles className="absolute inset-0" quantity={50} color="#2563EB" />
  
  <div className="relative mx-auto max-w-3xl px-6 text-center">
    <BlurFade inView>
      <h2 className={`${manrope.className} text-4xl lg:text-6xl font-bold leading-tight`}>
        Rejoignez la <AuroraText>première plateforme</AuroraText> du commerce tunisien.
      </h2>
    </BlurFade>
    
    <BlurFade delay={0.2} inView>
      <p className="mt-6 text-lg text-slate-600">
        Inscription gratuite. Aucune carte bancaire requise.
      </p>
    </BlurFade>
    
    <BlurFade delay={0.4} inView>
      <ShinyButton href="/signup" className="mt-10 text-base px-8 py-4">
        Créer mon compte
      </ShinyButton>
    </BlurFade>
  </div>
</section>
```

### Best component pattern (Footer)
Standard 4-column footer: brand column (logo + 1-line mission), Plateforme links, Légal links, Contact + social. Navy background, white text, subtle hover underlines.

### Motion pattern (Footer)
- BlurFade on each column with stagger
- Hover on links: subtle underline animation (Aceternity `HoverHighlight` style)
- Social icons: scale + color shift on hover via Motion spring physics

### Reference sites (CTA)
- **Linear:** "Ship faster" final CTA with shiny button
- **Vercel:** "Start deploying" with aurora background
- **Notion:** "Get started for free" with gradient text

### Reference sites (Footer)
- **Stripe:** clean 4-column navy footer
- **Linear:** minimal 3-column with brand statement
- **Apple:** organized link grid with subtle hover states

### Quality gate (CTA)
The final CTA is the second-highest leverage moment on the page (after the hero). The combination of aurora + particles + shiny button creates "magnetism" — the user feels pulled toward clicking.

---

## CROSS-SECTION SHARED COMPONENTS

These components are used across multiple sections. Install once, reuse everywhere.

### Magic UI components to install once
```
npx shadcn@latest add "https://magicui.design/r/blur-fade"
npx shadcn@latest add "https://magicui.design/r/particles"
npx shadcn@latest add "https://magicui.design/r/border-beam"
npx shadcn@latest add "https://magicui.design/r/number-ticker"
npx shadcn@latest add "https://magicui.design/r/shine-border"
npx shadcn@latest add "https://magicui.design/r/magic-card"
npx shadcn@latest add "https://magicui.design/r/hyper-text"
npx shadcn@latest add "https://magicui.design/r/aurora-text"
npx shadcn@latest add "https://magicui.design/r/shiny-button"
npx shadcn@latest add "https://magicui.design/r/dot-pattern"
```

### Aceternity components to copy from docs
- `AnimatedTooltip` — https://ui.aceternity.com/components/animated-tooltip
- `Spotlight` — https://ui.aceternity.com/components/spotlight
- `TracingBeam` — https://ui.aceternity.com/components/tracing-beam
- `StickyScroll` — https://ui.aceternity.com/components/sticky-scroll-reveal
- `AuroraBackground` — https://ui.aceternity.com/components/aurora-background
- `BentoGrid` — https://ui.aceternity.com/components/bento-grid
- `HoverHighlight` — for footer links and inline emphasis

### shadcn/ui base components
```
npx shadcn-ui@latest add accordion
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
```

---

## UNIVERSAL MOTION PRINCIPLES

These principles apply to every section of the landing page:

### 1. Spring physics, not bezier curves
For all hover and interaction animations:
```ts
transition={{ type: "spring", stiffness: 300, damping: 20 }}
```
Spring physics is what makes premium UI feel premium. Bezier curves feel cheap.

### 2. BlurFade as the universal entrance pattern
Every text block, card, and image entering the viewport uses `<BlurFade inView delay={0.1}>`. Delays stagger 100ms between elements in the same section.

### 3. Performance-first
- Animate `transform` and `opacity` only — never `top/left/width/height`
- Add `will-change: transform` to actively animated elements
- Use `IntersectionObserver` (via `useInView`) — never scroll event listeners
- Lazy-load images below the fold with Next.js `<Image priority={false}>`

### 4. Reduced motion is non-negotiable
Wrap all infinite animations in:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-* { animation: none !important; }
}
```
Magic UI and Aceternity components ship with reduced-motion support — verify each one.

### 5. Mobile motion is lighter
On mobile (≤768px):
- Particles quantity drops from 80 → 30
- Orbit radii shrink proportionally
- Disable parallax effects entirely
- BorderBeam continues to work (lightweight)
- Sticky scroll degrades to standard scroll

### 6. Brand color discipline
All motion uses the brand tokens:
- Bright blue `#2563EB` for primary accents (beams, halos, highlights)
- Navy `#1E3A8A` for depth (shadows, deep backgrounds)
- No off-brand colors in any animation gradient

---

## RECOMMENDED BUILD SEQUENCE

When the hero is locked, build the remaining sections in this order (lowest to highest risk):

1. **Trust Band** (Section 2) — simple, fast, validates NumberTicker
2. **FAQ** (Section 8) — uses shadcn primitive, low risk
3. **Final CTA + Footer** (Section 9) — closes the loop, validates ShinyButton + Aurora
4. **Three Benefits** (Section 5) — first bento grid, validates MagicCard
5. **How It Works** (Section 7) — first TracingBeam, scroll-driven complexity
6. **Founder Note** (Section 3) — emotional centerpiece, requires the founder photo asset
7. **Problem Agitation** (Section 4) — bold typography, requires HyperText fine-tuning
8. **Three Journeys** (Section 6) — highest complexity (sticky scroll), build last

Ship each section as its own commit on the `design/landing-page-hero` branch. Verify each section in isolation (full-page screenshot at 1440px) before moving to the next.

---

## REFERENCE SITES TO STUDY

Spend 15 minutes on each of these before building a section, to internalize the motion language:

- **Stripe** (stripe.com): the gold standard for marketing motion, TracingBeam pattern, gradient mastery
- **Linear** (linear.app): premium product motion, Lamp effect, restrained sophistication
- **Vercel** (vercel.com): developer-focused motion, BlurFade everywhere, animated counters
- **Cursor** (cursor.com): BorderBeam pattern, premium dark mode motion
- **Apple** (apple.com): cinematic sticky scroll, hero composition mastery
- **Magic UI** (magicui.design): live demos of every component used in this guide
- **Aceternity UI** (ui.aceternity.com): live demos + the StickyScroll, TracingBeam, Spotlight components

---

## VERIFICATION CHECKLIST (PER SECTION)

Before considering any section "done":

- [ ] Build green (`npm run build`)
- [ ] Lint clean (`npm run lint` on touched files)
- [ ] Full-page screenshot at 1440px saved to `.preview-screenshots/landing-page/`
- [ ] Mobile screenshot at 375px saved
- [ ] Motion verified: 5-second screen recording showing all animations
- [ ] Reduced motion verified: section still functional with motion disabled
- [ ] Keyboard navigation works (Tab order makes sense, focus visible)
- [ ] All copy matches the locked template — zero improvisation
- [ ] No off-brand colors introduced
- [ ] Performance: Lighthouse score 90+ on the section's standalone render

---

**End of resource guide.** This document is the master reference for building Servyou's landing page to world-class quality. Every section now has a clear component, motion, and reference path. The next step is finishing the hero, then working through the build sequence above.
