# PRODUCT — WHAT SERVYOU IS AND WHO IT SERVES

This is the single source of truth for what Servyou does, who it does it for, and what makes it different from anything else in the Tunisian market. It replaces the original Layer 1, Layer 2, Layer 3, and Pillar 4 documents — the load-bearing content of all four lives here.

## The problem Servyou solves

In Tunisia today, the people who make up the digital economy — freelancers, small sellers, shops, and the consumers who need them — have no home of their own. Sellers scatter their work across Instagram, Facebook, WhatsApp, and paper notebooks that do not connect to one another. Consumers have no single trusted place to find them, judge them, or buy from them safely. Every existing option is either a foreign platform that does not understand Tunisian dinars, cities, language, and habits, or an improvised patchwork of social apps never designed for commerce. The result is wasted time, lost sales, broken trust, and a digital economy that runs on tools built for somewhere else.

Servyou exists to give Tunisia's digital economy a real home — one trusted, unified, Tunisia-native platform where buying, selling, and working actually belong together.

## The vision

By 2030, every kind of economic actor in Tunisia — freelancers, consumers, e-commerce shops, liberal professionals, and small companies — is connected on Servyou. Servyou does not need to be anyone's only source of income, only place to shop, or only way to find work. It earns its place as the most professional, modern, and secure platform in the market, the trusted home people turn to when they want to work, buy, and sell properly.

The vision balances humility with ambition. The humility is in not claiming to replace everything a user already uses. The ambition is in the scale of the eventual goal: strengthening a national economy and reaching across a region.

## The three core values

Three values govern how Servyou behaves toward the people who use it. When a hard decision arises with no obvious answer, these values decide it.

**Value 1 — We protect our users.** Servyou is built to keep people safe from being cheated, deceived, or exploited. Every decision is checked against one question: does this make users safer, or does it expose them to harm? When safety conflicts with convenience, safety wins. When safety conflicts with profit, safety wins.

**Value 2 — We are honest and transparent, especially about money.** Servyou never hides fees, never surprises users with charges they did not expect, and never uses confusing tricks. Whatever Servyou earns is stated plainly. Users always know exactly what they pay and what they receive.

**Value 3 — We are genuinely Tunisian, not a copy of foreign platforms.** Servyou is designed from the ground up for how Tunisians actually live, work, buy, and sell — in Tunisian dinars, across Tunisian governorates, in French and Arabic, using the tools and habits Tunisians already trust. We learn from global platforms but never blindly copy them. Local fit always beats global imitation.

## What Servyou is not

Servyou is not a social network. It is a professional economic platform, not a place for socializing, endless scrolling, posting for fun, or entertainment. People come to work, buy, and sell.

Servyou is not a foreign platform adapted for Tunisia. It is Tunisian at its core, never a translated copy of Upwork, Fiverr, Amazon, or Shopify.

Servyou is not a platform that favors the big over the small. It never lets wealthy sellers buy their way to the top of search and visibility while small, honest sellers get buried.

At MVP, Servyou does not process payments or hold users' money inside the platform. Transactions are coordinated on Servyou and completed off-platform through Cash on Delivery for products and direct arrangement for services. In-platform payment with escrow is a deliberate post-launch addition, sequenced when the platform's scale and trust posture justify it.

## The user types and the role model

Servyou serves three user types in its MVP, plus an internal administrator role.

**The role model is universal buyer + optional seller capability.** Every user is a buyer by default — buying is the universal baseline that everyone has. On top of that baseline, a user may hold one seller capability, either freelancer or e-commerce shop owner, but never both at once. A user starts as a pure consumer and may later upgrade to add one seller capability. Sellers never lose the ability to buy.

This model is implemented in the database via a single `seller_type` field on the profiles table. Empty means pure consumer; `'freelancer'` or `'shop_owner'` means upgraded. The architecture supports future branched roles — liberal professionals (doctor, lawyer, accountant, each with specialized fields) and small companies (technology, health, each with sector templates) — as new accepted values plus their own child tables, without rebuilding the foundation.

**The consumer** is the buyer. Age 16 and above, any gender, often discovers Servyou through online ads or word of mouth, has multiple different needs over time and uses the platform repeatedly. Mobile-first, because most Tunisians browse on phones. The consumer's deepest fears are not being able to tell whether a seller is trustworthy and worrying the product will differ from the photos. Both are the same wound: the fear of being deceived by a stranger in a transaction where one must commit before verifying. The MVP reduces these fears through complete seller profiles, real signup information, visible signs of established sellers, and the ability for buyers to vet a seller through WhatsApp conversation before any money changes hands.

**The freelancer** is typically around 20 years old, digital-native, working in IT and development, video editing, marketing, or as a UGC creator. Must be 18 or older to register. The freelancer's deepest need is finding good clients who pay a fair price. Their fears are delivering work and not getting paid, and clients who disappear or change the deal halfway. The MVP reduces these fears through client profile visibility, real signup information, and WhatsApp vetting before committing work. The full cure — in-platform payment with escrow — is a post-launch addition.

**The e-commerce shop owner** sells trending consumer products, commonly face care, health care, and beauty. Often a dropshipper who sells without holding inventory, hunting for "winning products" that sell fast before the market saturates. Relies heavily on social commerce for traffic. Must be 18 or older to register. Their critical market reality is Cash on Delivery — Tunisian consumers overwhelmingly prefer paying cash when the product is physically delivered, because it removes the fear of paying for something unseen. Their fears are COD failures (customers who order then refuse to pay or aren't home) and scattered orders pouring in from Instagram, Facebook, WhatsApp, and TikTok with no single place to organize them.

**The administrator** is an internal role with deliberately limited power. The admin works on people and content through a dashboard: viewing users and suspending or removing rule-breakers, hiding or removing fake or harmful content, handling user-submitted reports, resolving disputes between users, granting admin access to other trusted team members. The admin role cannot touch the raw database or codebase. That limitation is a protective feature, not a weakness. Raw database and codebase access belongs to a separate developer/platform-owner role working through Supabase's protected dashboard and GitHub, never through the in-app admin dashboard, because that access can touch everyone's personal data.

## The two founding principles

Two principles, locked during product definition, govern how Servyou builds for its users. Both are founder-contributed and both reach into engineering decisions, not just product ones.

**The Unified Workspace Principle.** Today's smaller user types' workspaces are built with the seriousness tomorrow's larger user types deserve to find. The freelancer workspace becomes the foundation under the future lawyer's practice-management workspace; the shop owner workspace becomes the foundation under the future company's commerce-operations workspace. The architectural discipline locked by this principle makes future user-type expansion possible without rewriting the foundation.

**The Configurable Workspace Principle.** Servyou does not pre-decide which freelancer is "real" or which shop owner is "legitimate." Servyou provides the building blocks — profile fields, portfolio elements, service or product catalogs, skills, tools, workplace, education, certifications, payment preferences, working hours, location detail, category specialties — and lets each individual user assemble their own workspace based on who they actually are. The university student freelancer fills in what is true for them. The full-time professional moonlighting fills in what is true for them. Servyou does not impose a rigid structure that fits one kind of user and excludes others.

These two principles join the Headroom Principle and the Plan-A-B-C Principle from the architecture document as the four named principles Servyou is built on.

## The user journeys

This is what each user does on the platform, from arrival to outcome.

### The shared foundation

Browsing is open to everyone without an account. Visitors arriving from a seller's social-media link land and see value immediately rather than hitting a wall. An account is required only when a user wants to act — request a product or service, post a job, or save a favorite.

Signup collects the minimum: email, password, full name, city or governorate, language preference (French or Arabic), and date of birth. Date of birth is required because of the age rule. The user confirms their email through the link Supabase Auth sends. Every new user begins as a consumer — the universal buying baseline. When a consumer chooses to become a seller, the upgrade flow checks that they are 18 or older before granting one seller capability. Under-18 users are refused the upgrade with a clear, kind message.

### The consumer journey

The consumer arrives, lands on a homepage mixing products and services, and browses freely without an account. They search by keyword and filter by category, city or governorate, and price range. They click into a product to see all photos, full description, price, stock status, and the shop's name and city — or into a service to see its description, starting price, delivery time, and the freelancer's name and headline — or into a full shop page or freelancer profile. These complete, detailed pages serve the consumer's trust fear directly: the more real and complete a seller's page looks, the safer the consumer feels.

When the consumer acts, they click "Request to buy" (product) or "Request service" (freelancer), signing up or logging in at that moment if needed. For a product request, Servyou collects delivery details — name, address, phone — because Cash on Delivery requires the seller to know where to deliver. The request becomes a `pending` order in the seller's dashboard. The consumer is then shown a WhatsApp button with a pre-filled message naming the item, referencing Servyou, and openly assuming COD as the normal arrangement.

The consumer visits "My Requests" to track every product and service request. The page shows each order's position in the locked lifecycle: `pending` → `accepted` → `prepared` → `dispatched` → `in_delivery` → `arrived` → `received`, with `cancelled` as a parallel terminal state. Both buyer and seller see the same status at the same time. Service orders skip the middle delivery states (`prepared`, `dispatched`, `in_delivery`) and move directly from `accepted` to `arrived` when the freelancer marks the service delivered, then to `received` when the buyer confirms.

The consumer can cancel a request. Cancellation before dispatch (status `pending`, `accepted`, or `prepared`) is free and immediate. Cancellation after dispatch (`dispatched`, `in_delivery`, or `arrived`) requires a stated reason and is logged on the buyer's record. When a product order reaches `arrived`, the consumer sees a clear "Confirm I received this" action. Clicking it moves the order to `received` and records the `received_at` timestamp — the auditable evidence that the transaction completed successfully.

The consumer can save favorites (a heart on any product or service) and view them on a "My Favorites" page. They can also post a job describing a need and have freelancers come to them.

### The shop owner journey

A consumer upgrades to shop owner (checked 18+) and creates their shop: name, description, city or governorate, optional logo and banner. The shop carries optional configurable fields per the Configurable Workspace Principle — shop type (physical, online-only, dropshipper), delivery setup (self-delivery, third-party, buyer pickup), working hours, location detail. Accepted payment methods and category specialties live in child tables. All optional.

The shop owner adds products through a form capturing title, description, price in TND, category, photos, and stock — with the form handling both stock-tracking sellers and dropshippers who do not hold inventory via a `tracks_stock` toggle. Each product can be set to active, hidden, or sold out.

The shop owner's dashboard lists products organized by category, current stock levels, units-sold counts (calculated live from orders), and the incoming orders list. Each order shows the product, the buyer's name and city, the delivery details, the date, the current lifecycle status, and a WhatsApp button. The order list is filterable by status.

Each order shows the next action available based on the lifecycle. From `pending`, the seller can `Accept` the order or cancel with a reason. From `accepted`, the seller marks the order `Prepared` once it is packed. From `prepared`, they mark it `Dispatched` when they hand it to delivery. From `dispatched`, they mark it `In Delivery`. From `in_delivery`, they mark it `Arrived`. At this point, the seller waits — the order does not close to `received` until the buyer confirms. When the buyer confirms, the order closes from both sides.

The seller can also cancel at any pre-arrival stage with a reason. The reason is logged with `cancelled_by = 'seller'`. The buyer sees why.

Each shop has a public, shareable page showing the shop info and all active products — the link the owner places in their Instagram, Facebook, and TikTok bios. This is the growth strategy: social media is the marketing layer, Servyou is the transaction and organization hub.

### The freelancer journey

A consumer upgrades to freelancer (checked 18+) and builds their profile: photo, professional headline, bio, skills as tags, city or governorate, optional external portfolio link, and uploaded work samples shown in a clean gallery (images now, structured to allow short video later). The profile includes lightweight CV-like fields — years of experience, languages — and the Configurable Workspace fields: working hours and availability, tools and software, current workplace, education entries, certifications, preferred payment method. All optional. Each freelancer fills in what is true for them.

The freelancer adds service listings through a form capturing title, description, starting price in TND, category, expected delivery time as flexible text, and optional sample images. Each listing can be set to active or hidden.

Service orders move through an abbreviated lifecycle: `pending` → `accepted` → `arrived` (the freelancer marks the service delivered) → `received` (the buyer confirms). No `prepared`, `dispatched`, or `in_delivery` states for services. Cancellation discipline applies the same way as for products, with the dispatch line conceptually mapped to the acceptance moment for service cancellations.

The freelancer's public profile has a shareable link for their social bios. They can also browse the job board and respond to job posts via WhatsApp.

### The job-posting system

A reverse flow lets a consumer describe a need and have freelancers come to them. The consumer creates a job post with title, detailed description, budget in TND (fixed or range), category, city or governorate (or remote), desired deadline, and required skills. The post publishes to the job board. The consumer sees which freelancers responded in "My Job Posts" and can mark the post filled (closing it), edit it, or delete it.

The freelancer browses the job board, filters by category, city, budget, and skills, clicks into a post to read it fully, and responds via a WhatsApp button with a pre-filled message identifying the job and referencing Servyou.

Two fairness limits protect quality without a paid economy. A post caps at around 10 responses, after which it stops accepting more. Each freelancer can hold around 5 active responses at once. Both numbers are tunable. These limits prevent flooding and ensure new and quieter freelancers get a chance.

Posts auto-expire after 30 days.

### The administrator journey

The admin logs into a separate, protected dashboard. They can see all users with role, city, join date, activity, and status, and suspend a rule-breaker (blocks login, preserves data) or remove a genuinely bad actor. They can see all content — shops, products, freelancer profiles, services, job posts — and hide or remove anything fake, offensive, or rule-breaking. They handle reports users submit via a report button on content. They resolve disputes between users, using the lifecycle history (which status transitions happened and when), the `received_at` timestamp if buyer-confirmed, and any cancellation reason as structured evidence instead of pure he-said-she-said.

The dashboard includes a lightweight statistics view showing aggregate, anonymous numbers — totals of users, shops, freelancers, products, services, job posts, and especially completed orders. These numbers serve three aligned purposes: confirming Servyou is working, supporting moderation, and providing shareable social proof for marketing. Aggregate only — individual personal data is never shared publicly and is accessed only when genuinely necessary for moderation.

## The COD friction reduction features

Three concrete MVP features reduce the dominant friction in Tunisian Cash-on-Delivery commerce. The features emerged from understanding what makes COD work better rather than fighting against it.

**Order status transparency.** Both buyer and seller see the same status at the same time, moving through a defined 8-stage lifecycle. The transparency removes the anxiety of "where is my order?" and "did it actually arrive?" Both sides know.

**Cancellation discipline.** Cancelling before dispatch is free and immediate — the buyer changed their mind, no harm done. Cancelling after dispatch requires a real reason and is logged on the buyer's record. This reduces serial-refuser behavior, the primary COD pain point for sellers. The cancellation logs accumulate from MVP onward, ready for the post-launch buyer-rating system to build on.

**Delivery receipt confirmation.** When an order arrives and the buyer accepts it (paying the seller in cash), the buyer confirms receipt in the app. The status moves to `received` and the `received_at` timestamp is recorded. This creates the auditable evidence that the transaction completed successfully — the structured starting point for any future dispute resolution.

Three additional COD-friction features are deliberately sequenced as post-launch additions: buyer phone confirmation before dispatch (seller calls before paying delivery costs), buyer rating and reputation system (repeat trustworthy buyers earn visible reputation, serial-refusers earn visible warnings), and seller-committed delivery windows (sellers commit to a window when accepting, missing the window counts against their rating). These come online when the platform's scale and data justify them.

## Who Servyou does not serve at MVP

Strategic discipline holds that naming who you do not serve is as important as naming who you do, because explicit out-of-scope commitments prevent the feature creep that comes from trying to serve everyone at once.

**The non-internet 16% of Tunisians.** Approximately 1.95 million Tunisians are not internet users — they skew elderly, very rural, and lower-income. Servyou at MVP is not built for this population. A platform that tried to serve both internet-fluent young urban Tunisians and non-internet rural elderly Tunisians would fail at both, because the design constraints are incompatible. This is scope discipline, not rejection.

**B2B and corporate buyers.** Servyou serves individual consumers and individual sellers at MVP. B2B procurement, corporate buying with purchase orders and invoicing, and bulk wholesale transactions are out of scope. The platform's structure can be extended to support B2B at the small-company-role stage of the roadmap, but it is not built for that today.

**International dropshippers.** Tunisian dropshippers sourcing from Tunisian suppliers are explicitly supported at MVP. International dropshipping — sourcing from China, Turkey, AliExpress, or any other foreign supplier — is explicitly out of MVP scope, for regulatory clarity (avoiding cross-border customs, foreign-currency payment, import-tax complications) and trust posture (buyers expect domestic delivery timelines and recourse). Post-MVP, connector integrations to Converty, AliExpress, and other platforms are sequenced deliberately in the roadmap.

## The cross-cutting features

**The homepage.** A richer, action-driving homepage whose purpose is to push the visitor to act: a prominent search bar, category cards (Beauté, Santé, Développement, Montage Vidéo, UGC, Marketing), a trending section (admin-featured at launch, shifting toward automatic "most-requested" as activity grows), featured top shops and freelancers, and a recent or fresh items mix.

**Site-wide search** across products, services, shops, and freelancers. Category pages mixing products and services, refinable by city and price. City and governorate pages.

**Mobile-first design throughout**, because most Tunisians browse on phones.

**Two languages.** The full interface in French (default) and Arabic, with right-to-left layout for Arabic and an always-visible language switcher. English is not in the MVP.

## The growth strategy

Social media (Instagram, Facebook, TikTok) is the marketing layer; Servyou is the transaction and organization hub. Shop owners and freelancers share their Servyou shop or profile link in their social bios and at the end of their content. Viewers who click through become Servyou users and customers for that seller.

This solves the shop owner's scattered-orders pain by consolidating social-driven demand into one organized place, and it grows Servyou through sellers' own existing audiences. It requires no extra features beyond the public shop and freelancer profile pages already planned, since each has a shareable link by design. This is the unified-platform advantage no other Tunisian platform has.

## Success measures

Success is defined six months after the MVP launches to real Tunisians, by concrete signs that can be seen and counted.

**Supply is real.** A meaningful base of active shops with real products listed, and active freelancers with real services listed — enough that a visitor always finds something worth requesting.

**People find what they need.** A steady and growing number of real requests are created by consumers clicking "request to buy" or "request service."

**Deals actually happen.** A growing number of requests are marked `received` by buyers, meaning real money was made and real problems were solved.

**People come back.** A meaningful share of users return for a second and third time, and new users arrive because existing users told them about it.

Payment safety as a success measure depends on the future in-platform payment and escrow system, deferred beyond the MVP.
