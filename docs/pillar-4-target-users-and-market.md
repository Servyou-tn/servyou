# SERVYOU — PILLAR 4: TARGET USERS AND MARKET

This is the fourth of six Pillar Documents that sit alongside the seven Layer documents. Where Pillar 1 named the engineering foundation under everything Servyou builds, Pillar 4 names the **human foundation** — the Tunisian people Servyou serves, the patterns by which they live and work and shop, the value proposition Servyou makes to each of them, and the principles by which Servyou's understanding of them deepens as the carriage grows.

Pillar 4 is written before Pillars 5 (Marketing) and 6 (Roadmap) because both depend on it: a marketing strategy cannot be written without knowing precisely who Servyou speaks to, and a roadmap cannot be written without knowing which user segments are served first. Pillar 4 is also written before Pillars 3 (Brand) and 2 (Design System), because the brand voice and visual identity Servyou eventually adopts must speak to the specific Tunisians described here — not to generic "marketplace users" or generic "Tunisian consumers." Users come first; expression follows.

The platform is being defined in six Pillars: (1) Engineering Standards and Architecture, (2) Design System and UX Principles, (3) Brand and Visual Identity, (4) Target Users and Market, (5) Content and Marketing Strategy, (6) Roadmap. This document covers Pillar 4.

## 4.1 — The Founding Commitment

Servyou commits to understanding its users honestly, deeply, and continuously — grounded in real Tunisian market data, refined through real conversations with real Tunisians, and never confused by templates borrowed from foreign platforms that were built for different people in different conditions.

This commitment is the foundation of Pillar 4. It rejects two failure modes that platforms typically fall into. The first failure is **assumption-driven design**: building a platform based on what the founder *imagines* users want, never testing the assumption against real users, and discovering at launch that the platform serves no one well. The second failure is **template-driven design**: copying user personas from American e-commerce playbooks, European marketplace blueprints, or generic startup guides — and ending up with a platform that fits a generic global user but fails the specific Tunisian who actually opens it.

Servyou is built for **Tunisians, in Tunisia, in 2026**, with all the specificity that condition implies. Tunisian internet penetration is high; Tunisian mobile penetration is even higher; Tunisian e-commerce runs predominantly on Cash on Delivery in ways foreign platforms find strange; Tunisian sellers are scattered across Facebook, Instagram, TikTok, WhatsApp, and ad hoc bank transfers in ways that frustrate them every day; Tunisian freelancers serve both local clients and European startups in three languages from cafés and home offices in Tunis, Sfax, Sousse, and Bizerte. **The platform must fit these specific people, not a generic abstraction of them.**

## The Pattern Approach — Locked Across Pillar 4

Pillar 4 names patterns, not personas. This is a deliberate methodological choice that the founder brought to the work, and Pillar 4 commits to it as a principle.

The standard practice in platform design is to name **personas** — specific imaginary users with names, ages, jobs, photos, and personality traits — and design the platform around their needs. *"Salma is 24, lives in Sousse, works as a junior accountant, browses Instagram during lunch breaks."* This methodology works well for narrowly-targeted products serving specific niches.

For a marketplace platform serving most of Tunisia, **the persona methodology becomes a constraint rather than a clarifier**. The Tunisian consumer base is broad — geographically, demographically, economically — and naming three or five personas would force the platform to choose between them in ways the actual user base does not require. The Mohamed shopping in Ariana and the Salma shopping in Sfax are not different platforms' users; they are the same platform's users, separated only by which city's delivery network reaches them.

Servyou therefore names patterns: the geographic pattern of supply (concentrated in cities) versus demand (distributed across the country), the behavioral pattern of mobile-first social-channel shopping with cash-on-delivery payment, the economic pattern of users who already shop online comfortably and who do not need to be taught to use a marketplace. These patterns describe the real Tunisian market more honestly than three named personas could. They also leave room for the diversity within each pattern that personas would falsely flatten.

The pattern approach extends across Pillar 4. Where useful, specific examples are named — *the freelancer in Sfax doing mobile development for European startups, the shop owner in Tunis selling fashion through Instagram and WhatsApp* — but these examples illustrate patterns rather than constrain them. The platform serves the pattern, and within the pattern, every individual Tunisian fills in their own specifics through the configurable workspace described in §4.10.

## 4.2 — Section 1: The Tunisian Digital Market in 2026

Section 1 grounds Pillar 4 in real, verifiable market data about Tunisia at the moment Servyou is being built. Where Pillar 1 anchored to external engineering standards (OWASP, GDPR, Google, WCAG), Pillar 4 anchors to current Tunisian market reality from primary sources: DataReportal's *Digital 2026 Tunisia* report, the MDWEB e-commerce barometer for Tunisia, the U.S. Department of Commerce's Tunisia Commercial Guide, NapoleonCat's Tunisia social media data, payment-processing industry reports, and Tunisian government digital-transformation publications.

The data is current as of late 2025 and early 2026, and is named here so every subsequent Section of Pillar 4 can refer back to a shared factual ground.

### 4.2.1 — Internet and Mobile Penetration

Tunisia in 2026 has a population of approximately twelve million people. As of end of 2025, internet penetration stood at 84.3 percent of the population — approximately 10.4 million Tunisians use the internet. This is materially higher than the global average of around 72 percent, and reflects sustained growth from previous years (72.4 percent in 2023 per World Bank data, climbing steadily since). The remaining 16 percent of the population — approximately 1.95 million Tunisians — are not internet users; they skew elderly (over 65), very rural (interior governorates like Kasserine, Sidi Bouzid, and Tataouine), and lower-income households without smartphones. This 16 percent is acknowledged honestly throughout Pillar 4 as the population segment Servyou does not serve at MVP — not by exclusion in the rejecting sense, but by scope discipline.

Mobile penetration is higher than population: 15.5 million cellular connections were active in Tunisia in late 2025, equivalent to 125 percent of the total population, reflecting the common Tunisian practice of holding two SIM cards across two carriers for cost optimization or coverage. Mobile internet is the dominant access method: more than 70 percent of Tunisian online shoppers use smartphones as their primary device, and mobile commerce represents over 45 percent of all e-commerce transactions. **Tunisia is a mobile-first market, and Servyou's mobile-first architectural commitment (Layer 7) is alignment with reality, not aspiration.**

Social media adoption is also high. As of October 2025, Tunisia had 7.83 million social media user identities, equivalent to 63.3 percent of the population. Facebook alone reached approximately 8.84 million Tunisian users in April 2025 — about 71 percent of the population — per NapoleonCat's tracking data, making Facebook a near-universal Tunisian digital presence. Instagram, TikTok, and to a lesser extent X and LinkedIn round out the active platforms. The implication for Servyou is significant and is developed in §4.2.3.

### 4.2.2 — E-commerce Adoption and the Cash-on-Delivery Reality

Among Tunisia's internet users, **56 percent shop online**, according to the MDWEB e-commerce barometer's fifth wave (October-November 2024). Of those who shop online, 49.2 percent place at least one order per month — meaning roughly half of all Tunisian online shoppers are active monthly buyers. Multiplying through, this places approximately 47 percent of all Tunisians — about 5.8 million people — in the category of active online shoppers. This is the realistic addressable market for Servyou's consumer side at MVP.

The average monthly shopping cart value rose from 156.4 to 173.3 Tunisian Dinars over the survey period; the median expenditure slightly decreased to 91.4 TND, reflecting a polarized market where some buyers spend more while others cut back under inflation pressure. **Servyou should expect a wide range of order values, with the typical transaction landing around 100-200 TND.**

The defining feature of Tunisian e-commerce — the one that shapes every interaction on every Tunisian marketplace platform — is the dominance of **Cash on Delivery**. Estimates vary by source: the MDWEB barometer reports 56 percent of buyers use COD; the U.S. Department of Commerce's Tunisia Commercial Guide reports 80 percent; the Tunisian Ministry of Communication Technologies reports the same; payment industry reports place the figure around 70 percent. The most honest reading is that COD represents approximately two-thirds to four-fifths of all Tunisian online commerce — *the dominant payment method by a margin no other channel approaches*. By comparison, the world average for COD is approximately 7 percent of e-commerce transactions; Tunisia's share is roughly ten times higher.

This is the single most important market reality for Servyou. Layer 2's locked commitment to Cash on Delivery as the MVP payment mechanism is not a limitation, a workaround, or a temporary measure — **it is alignment with the mainstream Tunisian payment behavior**. A platform that tried to force card-only payment at launch would be ignoring how the majority of Tunisia actually shops. Servyou's coordination-not-transaction MVP model fits Tunisia's reality precisely.

What Tunisians buy online has also shifted. As of late 2024, **clothing and fashion now lead the category mix**, surpassing bill payments (previously the largest category). Shoes, bags, and accessories rank third. Lifestyle and fashion have overtaken utility purchases, signaling a maturation of the market: Tunisians are not only using e-commerce to pay bills, they are using it to express themselves through what they wear and carry. Servyou's category mix (Layer 4's categories taxonomy) reflects this reality, with fashion, accessories, and lifestyle categories given prominence.

The total Tunisian e-commerce market was approximately $500 million USD in 2023, growing at approximately 20 percent year-over-year, and projected to surpass $750 million USD by 2026. Per UNCTAD's B2C e-commerce index for 2020, Tunisia ranks 77 of 152 countries — first in the Arab Maghreb Union, third in Africa, ninth among Arab countries. **The market is real, growing, and Tunisia is regionally significant.**

### 4.2.3 — The Social Commerce Shift

The most strategically important market trend for Servyou is the shift from traditional e-commerce websites toward **social and mobile commerce**. As the MDWEB barometer reports honestly: *"traditional e-commerce websites are gradually giving way to social and mobile shopping, appreciated for their accessibility and immediacy."* The places where Tunisians discover products, follow brands, ask sellers questions, and complete transactions are increasingly Instagram, Facebook, TikTok, and WhatsApp — not standalone e-commerce websites.

This shift has two consequences for Servyou's positioning.

The first is **where users are encountered**. Servyou's marketing strategy (Pillar 5, to be written) must meet Tunisians on the social platforms they already use, not assume they will navigate to a separate website. The platform must integrate cleanly with the social-platform experience users are already living within: shareable product pages that look right when pasted into a WhatsApp conversation, profile pages that work as Instagram bio links, transaction flows that respect how Tunisians actually move from a TikTok video to a purchase decision.

The second is **what Servyou is in relation to social commerce**. The platform is not a replacement for Instagram and Facebook in the discovery and conversation phases of commerce; users will continue using those platforms for browsing, comparing, and chatting with sellers. What Servyou offers is **structure for the transaction itself** — the moment when a buyer says "yes, I want this" and a seller needs to coordinate delivery, when payment must be confirmed, when an order needs a status, when a complaint needs a recipient who is more than the seller's own DMs. Pillar 4 develops this positioning in §4.6.

### 4.2.4 — The Tunisian Freelancer Market

Tunisia's freelancer market in 2026 is mature and well-developed, not nascent. The country's technology sector contributed approximately 7.5 percent of GDP in 2025. Tunisia hosts over 1,040 startups, 82 tech institutions, and 450 ICT-related university programs — a substantial pipeline of skilled workers entering the freelance economy. The government's *Digital Tunisia 2025* strategy actively promotes this growth.

Tunisian freelancers cluster in specific cities: **Tunis, Sfax, Sousse, Bizerte, Hammamet, and to a lesser extent Ariana and Ben Arous**. These are the supply-side concentration zones — the cities where universities, co-working spaces (such as Creativa), tech companies, and the freelance ecosystem live. The categories where Tunisian freelancers are most active include software development (full-stack, mobile, web), graphic design, content creation (including UGC creators, an emerging strategic category per Layer 2), video editing and motion graphics, digital marketing, AI and data science (with growth of approximately 27 percent in cybersecurity roles and 18 percent in mobile app development), translation services (leveraging Tunisia's trilingual workforce in Arabic, French, and English), and accounting and finance.

Tunisian freelancer rates internationally range from approximately €7 per hour for entry-level work to €100 per hour for senior specialists, with the typical range falling between €15 and €45 per hour. This range reflects both the diversity of skill levels and the international competitiveness of Tunisian freelancer labor. Many Tunisian freelancers serve both local clients (other Tunisian businesses, fellow freelancers needing services) and international clients (particularly European startups exploiting the proximity, multilingualism, and favorable rates of Tunisian talent).

The infrastructure today is partial: international freelance platforms (Upwork, Fiverr, Freelancer.com) capture some Tunisian freelancers but expose them to high commissions and friction in payments to a non-convertible Tunisian Dinar. Tunisia-specific platforms (Truelancer.com listings, Freelances.tn) have emerged but lack the integrated workspace functionality that would make them a daily home for the freelancer's whole business. **The opportunity Servyou identifies is to be the local platform that gives Tunisian freelancers what international platforms cannot: a Tunisian-currency, Tunisian-language, Tunisian-culturally-aligned home for their service business — with the workspace that ends the scattering of their work across Behance, LinkedIn, email, PDFs, WhatsApp, and ad hoc invoicing.**

## 4.3 — What Section 1 Commits Pillar 4 To

Section 1 establishes the factual ground beneath every subsequent Section of Pillar 4. Servyou is being built for a country of twelve million people, of whom 10.4 million are internet users, of whom 5.8 million are active online shoppers, of whom the great majority pay via Cash on Delivery, shop predominantly via mobile, and increasingly discover and transact through social platforms. Tunisia hosts a mature freelancer market clustered in seven cities, producing skilled service work in IT, design, content, and adjacent categories. The market is growing at approximately 20 percent annually and is regionally significant in North Africa.

This is the ground every Servyou design decision, every feature priority, every marketing claim, every roadmap milestone must respect. Sections 2 through 8 build on it.

## 4.4 — Section 2: Who Servyou Serves

Section 2 names the patterns of users Servyou serves, in the methodology established by the Pattern Approach principle. Each pattern is a description of a real Tunisian user type, anchored to the data in Section 1, with the diversity within the pattern left to the configurable workspace described in §4.10 rather than artificially flattened into a persona.

### 4.4.1 — Consumers: Tunisian Internet Users, Geographically Distributed

The consumer pattern is the simplest to name and the broadest in scope. Servyou's consumers are **Tunisian internet users aged 16 and over, distributed across the entire country, who browse on mobile devices, who already shop online comfortably, and who pay predominantly via Cash on Delivery**. There is no geographic concentration on the consumer side: a buyer in Tataouine, a buyer in Tunis, a buyer in Sfax, and a buyer in Bizerte all use Servyou through the same interface and benefit from the same protections. The locked Layer 2 commitment to universal-buying — every authenticated user can browse and request — is the operational expression of this pattern.

The pattern is broad on age (16 and over per Layer 2's age rules), broad on income (the 100-200 TND typical transaction value spans many income brackets in Tunisia), broad on profession (consumers are workers, students, parents, retirees alike), and broad on tech sophistication (from heavy social media users to occasional smartphone shoppers). **What unites them is the act of shopping, not their demographic identity.** Servyou serves the action, not the actor's demographics.

Within this broad consumer pattern, three usage sub-patterns are worth naming because they shape feature priorities differently:

The **active monthly shopper** — approximately half of online shoppers, by the MDWEB data — uses Servyou frequently. For this user, ease of repeated purchase matters: saved delivery details (within Layer 5's privacy boundaries), favorites lists (Layer 3's favorites feature), browsing patterns Servyou can learn from to surface relevant new products.

The **occasional buyer** — the other half — opens Servyou when a specific need arises. For this user, discoverability matters: search that works, categories that are clear, sellers whose profiles establish trust quickly. The occasional buyer cannot be relied upon to learn complex platform mechanics; the interface must work the first time.

The **mobile-first young user** — a demographic skew within both above patterns — shops in short sessions during commute, lunch breaks, or evening social media windows. For this user, mobile performance, Tunisia-network-aware loading, and social-shareable product pages are the difference between a sale and an abandoned tab.

All three sub-patterns are MVP users. Servyou is not optimizing for one at the expense of the others; the interface must respect all three.

### 4.4.2 — Shop Owners: Concentrated in Seven Urban Governorates

The shop owner pattern is geographically concentrated where the consumer pattern is distributed. Tunisian shop owners — defined per Layer 2 as sellers of physical products, including dropshippers — cluster predominantly in seven urban governorates: **Ariana, Tunis, Ben Arous, Manouba, Sfax, Sousse, and Bizerte**. These are the cities where commerce infrastructure exists at scale: physical shops, warehouses, dropshipping operations, delivery-network density, supplier relationships, and the everyday infrastructure of running an e-commerce business.

This is the locked launch zone for Servyou's seller-side recruitment at MVP. Servyou does not refuse shop owners from other governorates — a seller in Kasserine or Kebili can sign up and operate — but the seller-side marketing energy, partnership conversations, and delivery-network integrations focus on these seven cities first. The carriage-and-horses growth principle from Pillar 1 §1.0 applies: today's Servyou serves where supply already concentrates; tomorrow's Servyou extends as the carriage grows.

The shop owner pattern subdivides by operating model, and each sub-pattern has different needs:

The **physical-shop-plus-online-storefront** owner has a real shop somewhere in one of the seven cities, with physical inventory, walk-in customers, and now an online presence on Servyou as a second channel. Their workspace needs include stock tracking that reconciles with physical inventory, order management that does not conflict with walk-in sales, and delivery coordination from their existing storefront.

The **online-only** shop owner operates entirely online, with inventory in a home, warehouse, or shared space. Their workspace needs include more sophisticated stock tracking (no walk-in buffer), order pipeline visibility (their entire business runs through orders), and tighter delivery-cost management (since delivery is the bulk of their operational cost).

The **dropshipper** has no inventory of their own; they list products sourced from suppliers and fulfill orders by passing the order to the supplier for direct shipment to the buyer. Per the clarification surfaced during Pillar 4 conversation (see Appendix A), **MVP dropshipping is domestic-only**: Tunisian dropshippers sourcing from Tunisian suppliers, fulfilling Tunisian buyers' orders. International sourcing — dropshipping from China, Turkey, or other foreign suppliers — is explicitly out of MVP scope, both for regulatory clarity (avoiding cross-border tax and customs complexity) and for trust posture (buyers expect domestic delivery timelines and recourse).

All three sub-patterns share the unified-workspace need described in §4.8: their business is currently scattered across Facebook Pages, Instagram, TikTok shopfronts, WhatsApp customer chats, Messenger order conversations, bank apps for payment tracking, spreadsheets or paper for stock, and ad hoc delivery-company conversations. Servyou's value to them is consolidation. The mechanics of that consolidation are developed in §4.8.

### 4.4.3 — Freelancers: The Tunisian Service Economy

The freelancer pattern overlaps geographically with the shop owner pattern (clustering in Tunis, Sfax, Sousse, Bizerte, Hammamet, Ariana, Ben Arous) but differs fundamentally in *what is being sold*: **services rather than products, expertise rather than inventory, deliverables and milestones rather than stock**. This is not a small distinction; it shapes everything about the freelancer's workspace.

Tunisian freelancers, per the Section 1 data, work across software development, design, content creation, video, digital marketing, AI and data, translation, accounting, and adjacent categories. They serve a mix of clients: other Tunisians (local businesses needing a website built, a logo designed, a video edited), international clients (particularly European startups exploiting the rate-quality-multilingual advantage), and themselves (their own brands, side projects, courses). They work from cafés, co-working spaces, home offices, and university libraries — geographically and physically scattered, working asynchronously, often in short focused sessions broken by other obligations (school, day jobs, family).

The freelancer pattern, like the shop owner pattern, has sub-patterns worth naming:

The **full-time professional freelancer** runs freelancing as their primary income source. For them, Servyou is potentially their primary business platform — the unified workspace where their work lives, their clients are managed, their portfolio is displayed, their invoices are tracked. Their feature needs are deep: portfolio, service catalog, project tracking, client communications, work history, ratings, and the configurable identity fields named in §4.10.

The **moonlighting freelancer** holds a day job (often in a Tunisian tech company or as a salaried professional) and freelances on the side. For them, Servyou is a way to formalize and grow the side work without quitting the day job. Their feature needs are similar but lighter in volume: they handle fewer simultaneous projects, but each project still needs the same workspace structure.

The **student freelancer** is currently in university (one of Tunisia's 82 tech institutions or other programs), building skills and reputation through paid project work alongside studies. For them, Servyou is where they assemble the early portfolio that becomes their professional foundation. Their feature needs include the same workspace structure but with prominence given to education-in-progress, certifications-in-pursuit, and the learning trajectory their profile reflects.

The **UGC creator** — named in Layer 2 as a strategic emerging category — is a different shape of freelancer: their service is content production for brands (sponsored Instagram posts, TikTok product reviews, YouTube unboxings), and their value to clients is their own social-media reach combined with production skill. For UGC creators, the freelancer workspace must accommodate their portfolio of past sponsored content, their audience-reach statistics, their content rate cards, and the project-by-project deliverable cycle that defines their work.

Within all four sub-patterns, the configurable workspace described in §4.10 lets each individual freelancer assemble their own version: the student fills in education-in-progress; the full-time professional fills in years-of-experience and workplace-history; the UGC creator fills in audience-reach metrics; the moonlighter fills in current-day-job. The pattern is consistent; the contents vary.

### 4.4.4 — Future User Types: Liberal Professionals and Companies

Two user types are explicitly named in Layer 2 as **post-MVP role families**: liberal professionals (doctors, lawyers, accountants, engineers, architects, and other licensed professional categories) and companies (B2B sellers, larger entities, multi-employee operations). These are not in scope at MVP, but Pillar 4 names them here because the Unified Workspace Principle and the Configurable Workspace Principle (developed in §4.8 and §4.10) are built specifically with the *future* extension to these user types in mind.

The strategic logic, locked through Pillar 4 conversation, is that **Servyou earns the right to serve liberal professionals tomorrow by serving freelancers excellently today**. A lawyer evaluating whether to use Servyou as their practice-management platform will look first at how Servyou serves freelance designers, freelance accountants, and freelance consultants who are conceptually similar to the lawyer's own business at a smaller scale. If Servyou has served those freelancers well — if their unified workspace is excellent, their client management is real, their service catalog is well-structured, their professional identity is well-displayed — the lawyer trusts that Servyou understands service-business reality and can grow into serving theirs.

The same logic applies to companies and shop owners: a multi-employee Tunisian business considering Servyou for their commerce operations will look first at how Servyou serves individual shop owners. If the shop-owner workspace is professional, organized, reliable, and integrated, the company trusts Servyou can scale that experience to their larger operation. **The big user comes because the small user was served excellently. This is the bank-discipline standard applied to platform expansion.**

Pillar 4 commits to this trajectory by naming it as the **Unified Workspace Principle** in §4.8 — the principle that today's user-type workspace is built so tomorrow's user-type workspace extends it rather than replaces it.

## 4.5 — What Section 2 Adds to Servyou's Foundation

Section 2 makes the user-side of Servyou concrete. The consumer pattern is broad and distributed; the shop owner pattern is concentrated in seven cities with three operating-model sub-patterns; the freelancer pattern overlaps geographically with shop owners but differs in what is sold and has four sub-patterns of its own; future user types (liberal professionals and companies) are the strategic trajectory that today's MVP earns the right to grow into. The pattern approach, not the persona approach, governs how Pillar 4 names users.

A reader who needs to understand who Servyou is *for* reads Section 2. A reader who needs to know who Servyou is *not yet* for reads Section 6 (§4.12). A reader who needs to know how Servyou's value proposition lands with each user type reads Section 3 (§4.6).

## 4.6 — Section 3: Servyou's Value Proposition

Section 3 names what Servyou offers to each side of the marketplace, in terms specific enough that a reader can verify the proposition against the live platform and a marketing message can be written from it. Servyou's value proposition is **not the same** for consumers and sellers; the two sides of the marketplace need different things, and Pillar 4 says both directly.

### 4.6.1 — For Consumers: The Trustworthy Mobile-First Marketplace

To Tunisian consumers, Servyou's value proposition is dual — both halves are necessary together:

The first half is that Servyou is **the social-mobile shopping experience Tunisians already prefer**. Tunisian consumers, per Section 1's data, increasingly discover, browse, and decide on purchases through social platforms — Instagram, Facebook, TikTok. Servyou does not fight this preference by demanding consumers switch to a standalone-website mental model. Servyou meets them where they are: mobile-first interface, social-shareable product pages, Tunisian-feeling visual presentation, transactions that can be initiated from a TikTok comment, a Facebook share, or a WhatsApp message. **Servyou feels like what Tunisians already do.**

The second half is that Servyou is **the trustworthy alternative to social-commerce without protection**. The same social-platform shopping that Tunisians prefer comes with a real cost: scams are common, sellers are unverified, complaints have no recipient beyond the seller's own DMs, returns are impossible to enforce, and bad transactions leave the buyer with no recourse. Servyou's protection is what differentiates it from a Facebook page selling clothes or an Instagram account selling phones: **real seller verification (per Layer 3 and Layer 5), real reports (per Layer 3), real platform accountability when transactions go wrong**. The buyer who chose Servyou over a random Facebook seller chose it because Servyou provides recourse the Facebook seller cannot.

Both halves together — the social-mobile experience plus the trust protection — form Servyou's unique consumer position. Other platforms have parts: Jumia has structure but feels foreign; Instagram and Facebook have the social experience but no trust layer; standalone Tunisian websites have some trust but feel disconnected from where users actually live online. **Servyou is the combination.**

### 4.6.2 — For Sellers: The End of Confusion

To Tunisian sellers — both shop owners and freelancers — Servyou's value proposition is named in plain words from the Pillar 4 conversation: **the end of confusion**.

The Tunisian seller today, whether a shop owner or a freelancer, runs their business scattered across many tools and channels. The shop owner's clients are on Instagram, Facebook, and TikTok. Their chats with those clients are on WhatsApp, Messenger, and DMs. Their money is in bank apps. Their product stock is in spreadsheets or notebooks. Their orders are scattered across the conversations themselves — a message in WhatsApp here, an Instagram DM there, an order from Facebook Marketplace somewhere else. The freelancer's portfolio is on Behance or Instagram; their proposals are in emails or DMs; their contracts are PDF attachments; their invoices are screenshots or hand-written; their schedule is in WhatsApp messages; their payments arrive via bank transfer or international platform.

**The seller is tired, and the scatter is the cause.**

Servyou's value proposition to sellers is to build **one place for all of it**. Their clients in Servyou. Their orders in Servyou. Their stock in Servyou. Their money tracking in Servyou. Their communications in Servyou. Their portfolio in Servyou. Their proposals in Servyou. Their schedule in Servyou. Not as a replacement for Instagram and Facebook in discovery — those remain the marketing layer per Layer 3's unified-platform growth strategy — but as the consolidated workspace where the business itself lives.

This proposition is not abstract organizational improvement; it is concrete relief from a daily experience of being scattered. Every Tunisian seller who reads this proposition knows what it means because they live the scatter every day.

The mechanics of how Servyou delivers this proposition — what specifically goes into the unified workspace, at what scale-stage — are developed in §4.8 (the Unified Workspace Principle) and §4.10 (the Configurable Workspace Principle).

## 4.7 — What Section 3 Adds to Servyou's Foundation

Section 3 commits Servyou to two specific value propositions that can be tested against the live platform and used as marketing input. For consumers: the social-mobile experience plus the trust protection, both required together. For sellers: the end of the confusion of running a business across many scattered tools, in one consolidated place. Neither proposition is generic; both are written for the specific Tunisian market reality named in Section 1.

A reader who needs to understand why Servyou exists reads Section 3. A reader who needs to understand how the consolidated workspace actually works reads Section 4 (§4.8). A reader who needs to understand how individual users configure that workspace reads Section 5 (§4.10).

## 4.8 — Section 4: The Unified Workspace Principle

Section 4 names a founder-contributed principle that emerged through Pillar 4 conversation and that joins the headroom principle and the Plan-A-B-C principle from Pillar 1 §1.8 as the third named principle Servyou is built on.

**The Unified Workspace Principle.** Servyou exists to end the confusion of running a small business across scattered tools. For each user type Servyou serves today — shop owners and freelancers — Servyou builds one place for all of that user's work: their clients, their orders, their stock, their money tracking, their communications, their schedule, their portfolio, their proposals, the entire surface of their business life.

The shop owner's workspace is built carefully and seriously precisely because it is the proof companies will eventually look at when deciding whether Servyou can serve their larger needs. The freelancer's workspace is built the same way, because it is the proof liberal professionals will eventually look at. Servyou earns the bigger user later by serving the smaller user excellently now.

Each user type's workspace is its own complete system, not a stripped-down version of something larger. The work to serve shop owners well teaches Servyou how to serve companies well later. The work to serve freelancers well teaches Servyou how to serve liberal professionals well later. **Nothing is rushed because tomorrow's bigger users are watching today's smaller users' experience.**

**Today's commitment.** At MVP, Servyou builds two unified workspaces: one for shop owners (consolidating clients, products with stock, orders, communications, payment tracking, delivery coordination, and the configurable shop identity from §4.10), and one for freelancers (consolidating portfolio, service listings, client management, project tracking, communications, and the configurable freelancer identity from §4.10). Both workspaces share a common architectural foundation (the underlying database, authentication, RLS rules from Layer 5, the basic profile system) but present user-type-specific interfaces that respect what each user actually needs.

**Pre-launch additions.** Phase 10 polish reviews both workspaces against the locked principle: is the shop owner workspace genuinely consolidating the scatter, or only relocating some of it? Is the freelancer workspace genuinely the home of their business, or just another place to log in? Honest answers, addressed before opening to real users.

**Post-launch growth additions.** Real users reveal what is missing from each workspace by their behavior — what they look for and cannot find, what features they request, what scatter remains because Servyou did not yet consolidate it. The workspaces grow through this feedback, in the same iterative discipline as the rest of the platform.

**Collaboration scale additions.** When the platform approaches the readiness to add liberal professionals (extending from the freelancer workspace foundation) and companies (extending from the shop owner workspace foundation), the new workspaces are added as deliberate extensions, not as replacements. The freelancer workspace becomes the foundation under the lawyer's practice-management workspace; the shop owner workspace becomes the foundation under the company's commerce-operations workspace. The architectural discipline locked by the Unified Workspace Principle makes this extension possible without rewriting.

**Cup-and-international scale additions.** By this stage, Servyou serves multiple user types (consumers, shop owners, freelancers, liberal professionals, companies) each through their own unified workspace, all built on the same foundation that the original shop-owner and freelancer workspaces established. Independent review of the platform validates that the extension worked — that the small user types of today did not constrain the larger user types of tomorrow, and that the consistency of experience across user types is recognizable.

## 4.9 — What Section 4 Adds to Servyou's Foundation

The Unified Workspace Principle names a strategic commitment that distinguishes Servyou from platforms built feature-by-feature without an organizing logic. By locking the principle, Pillar 4 commits Servyou to **building today's smaller user types' workspaces with the seriousness tomorrow's bigger user types deserve to find when they evaluate Servyou**. This is the institutional discipline applied to product expansion that Layer 1's Value 1 (we protect our users) and Value 2 (we are honest and transparent) imply when extended into platform growth strategy.

A reader who needs to understand Servyou's product philosophy reads Section 4. A reader who needs to understand how individual users adapt the workspace to their own situation reads Section 5 (§4.10).

## 4.10 — Section 5: The Configurable Workspace Principle

Section 5 names a second founder-contributed principle that emerged through Pillar 4 conversation. Where the Unified Workspace Principle answers *what* Servyou builds for each user type, the Configurable Workspace Principle answers *how the individual user assembles their own version of that workspace*.

**The Configurable Workspace Principle.** Servyou does not pre-decide which freelancer is "real" or which shop owner is "legitimate." Servyou provides the building blocks — profile fields, portfolio elements, service or product catalogs, skills, tools, workplace, education, certifications, payment preferences, working hours, location detail, category specialties — and lets each individual user assemble their own workspace based on who they actually are. The university student freelancer fills in what is true for them. The full-time professional moonlighting fills in what is true for them. The agency-owner senior specialist fills in what is true for them. Servyou does not impose a rigid structure that fits one kind of user and excludes others.

This principle is the operational expression of Layer 3's locked progressive data collection principle: Servyou collects only what is necessary, when it is necessary, with explicit user consent. The Configurable Workspace Principle extends progressive collection from signup into the entire ongoing relationship — **the user's profile is itself progressive**, filled in as becomes relevant to them, not demanded all at once.

**Today's commitment (locked into MVP scope).** For freelancers, the configurable workspace includes the following optional building blocks beyond the baseline freelancer profile from Layer 4: working hours and availability, skills, tools and software used, current workplace (if employed elsewhere), education (including current studies for student freelancers), certifications, and preferred payment method. For shop owners, the configurable workspace includes: shop type (physical, online-only, dropshipper), delivery setup (self-delivery, third-party, buyer pickup), working hours, location detail (governorate, city, neighborhood, or specific address for pickup), payment preferences, and category specialties.

These are configurable, not required. A freelancer who does not want to list their current workplace does not; their profile is still complete. A shop owner who has not yet decided on their delivery setup leaves it blank; their shop is still operational. The platform serves the user wherever the user is in their own setup journey, not where Servyou wishes they were.

**Pre-launch additions.** Phase 10 polish includes verification that each configurable field is truly optional in code, in UI, and in user experience — that no path through the application silently requires a field the principle declares optional. Verification also confirms that the optional fields, when filled, produce visible value to the user and to those who view their profile, so users have a genuine reason to fill them in beyond completeness for completeness's sake.

**Post-launch growth additions.** Real users reveal which configurable fields are filled at what rates, which fields are skipped, and which absent fields cause friction in transactions. The configurable field set evolves based on this evidence: fields no one fills are reviewed for removal; missing fields users wish they could fill are evaluated for addition. The principle stays constant; the specific field list evolves.

**Collaboration scale additions.** When liberal professionals and companies arrive as user types, the same configurable principle applies to their workspaces. A lawyer's configurable fields will include bar admission and area of practice; an accountant's will include certifications and software stack; a company's will include legal-entity type and employee count. The principle is universal across user types; the field contents are user-type-specific.

## 4.11 — What Section 5 Adds to Servyou's Foundation

The Configurable Workspace Principle commits Servyou to user-centered identity rather than platform-imposed identity. A reader who needs to understand how the platform respects user diversity reads Section 5. A reader who needs to know which users are explicitly out of MVP scope reads Section 6.

## 4.12 — Section 6: Who Servyou Does NOT Serve at MVP

Section 6 names explicitly who is **out of scope** for Servyou's MVP. Strategic discipline holds that naming who you do not serve is as important as naming who you do, because explicit out-of-scope commitments prevent the feature creep that would otherwise come from trying to serve everyone at once. Layer 7's build plan depends on Servyou's scope being bounded; Pillar 4 makes the bounds explicit.

### 4.12.1 — The Non-Internet Population

Approximately 16 percent of Tunisians — 1.95 million people — are not internet users. They skew elderly (over 65), very rural (interior governorates like Kasserine, Sidi Bouzid, Tataouine, Kebili), and lower-income households without smartphones. Servyou at MVP is **not built for this population**. This is not a rejection; it is a scope discipline. A platform that tried to serve both internet-fluent young urban Tunisians and non-internet rural elderly Tunisians simultaneously would fail at both, because the design constraints are incompatible (rich mobile UI versus simple voice/SMS interface; visual product discovery versus relationship-and-trust-based purchasing; written terms versus oral commitments).

Servyou commits to the digitally-active 84.3 percent of Tunisia honestly, and acknowledges the 16 percent it does not serve at MVP without pretense. If a future Servyou — possibly Pillar 6's roadmap will sequence this — develops a path to serve the non-internet population through community channels, voice interfaces, or partnered intermediary services, that will be a deliberate scope expansion at the appropriate moment, not an accidental MVP overreach.

### 4.12.2 — B2B and Corporate Buyers

Servyou at MVP is **a consumer-to-seller marketplace**, not a business-to-business platform. Companies buying for their business operations — bulk purchases for resale, supplies for office operations, equipment for industrial use — are not in MVP scope. The platform is not optimized for invoice generation against company tax IDs, multi-employee purchase approval flows, contract pricing, volume discounts, or any of the operational features B2B commerce requires.

This is not a permanent exclusion. Companies appear in Layer 2's post-MVP role family as a future user type, and Pillar 4 §4.4.4 names the strategic trajectory by which Servyou earns the right to serve companies later. But at MVP, B2B is explicitly out of scope, and Servyou's design does not accommodate B2B-specific patterns that would dilute the consumer-marketplace experience for the users who are in scope.

### 4.12.3 — International Dropshippers

Layer 2 names dropshippers as included in the shop owner role. Pillar 4 sharpens this commitment: **at MVP, dropshipping is domestic-only**. Tunisian dropshippers sourcing from Tunisian suppliers and fulfilling Tunisian buyers' orders are in scope. Dropshippers sourcing from international suppliers — China, Turkey, AliExpress, foreign warehouses, cross-border arrangements — are explicitly out of MVP scope.

Two reasons justify this clarification. The first is **regulatory clarity**: international dropshipping introduces cross-border customs, foreign-currency payment, and import-tax complications that Servyou is not yet positioned to handle responsibly at MVP. The second is **trust posture**: buyers ordering on Servyou expect domestic delivery timelines (days, not weeks), domestic recourse if something goes wrong, and a Tunisian seller they can hold accountable. International dropshipping breaks these expectations in ways that would damage the trust proposition central to Servyou's consumer value proposition (§4.6.1).

International dropshipping is not permanently excluded; the carriage-and-horses principle from Pillar 1 §1.0 leaves room for its later addition with appropriate regulatory, payment, and trust infrastructure in place. But at MVP, the line is drawn at the Tunisian border.

## 4.13 — What Section 6 Adds to Servyou's Foundation

Section 6 makes Servyou's MVP scope discipline explicit: three categories of users and use cases are deliberately excluded, with honest reasoning for each. The 16 percent non-internet population, B2B and corporate buyers, and international dropshippers all sit outside MVP. Servyou is the better for naming these exclusions clearly rather than pretending to serve everyone and serving no one well.

A reader who needs to understand Servyou's MVP boundaries reads Section 6. A reader who needs to understand how Servyou reduces the friction of Cash on Delivery — the dominant payment behavior named in §4.2.2 — reads Section 7.

## 4.14 — Section 7: Cash-on-Delivery Friction Reduction at MVP

Section 7 names three specific features Servyou commits to at MVP for reducing the friction of Cash on Delivery transactions. The features emerged through Pillar 4 conversation and are surfaced here as both MVP product commitments and as Layer-update items that will need to be reflected in Layer 3 (Features and Journeys) and Layer 4 (Data Model) when Pillar 4 is locked.

The locked rationale: Cash on Delivery dominates Tunisian e-commerce at 56-80 percent of all transactions per §4.2.2's sourced data, and **Servyou aligns with this reality rather than fighting it**. But COD has known friction points that hurt sellers (high refusal rates, complex logistics, delivery costs paid for orders that get cancelled) and hurt buyers (anxiety about whether the delivery will actually come, no recourse if it doesn't). Servyou commits to three MVP features that reduce this friction.

### 4.14.1 — Order Status Transparency

Every order on Servyou progresses through a defined lifecycle, with **both the buyer and the seller seeing the same status at the same time**. The lifecycle is: accepted → prepared → dispatched → in delivery → arrived → received. Both parties view the same status in their respective interfaces. The seller updates the status as the order progresses; the buyer sees the updates as they happen.

The friction reduction is significant: the buyer is not anxious about whether the order is real; the seller is not bombarded with "where is my order?" messages; both parties know exactly what is happening at any moment. The shared truth replaces the scatter of separate WhatsApp updates, Instagram DMs, and phone calls that current COD coordination typically requires.

This is a Layer 3 and Layer 4 update item, named in Appendix A.

### 4.14.2 — Cancellation Discipline

Buyers can cancel orders on Servyou under a structured policy. **Cancellation before dispatch is free and immediate** — the buyer changed their mind, no harm done, the seller has not yet paid delivery costs or committed irreversible resources. **Cancellation after dispatch requires a real reason and is logged on the buyer's record** — the seller has incurred costs (delivery, packaging, time), and post-dispatch cancellations are a real cost the buyer bears responsibility for.

The seller can see a buyer's cancellation history (as part of the future buyer-rating system that Pillar 4 sequences as a post-launch addition, not an MVP feature, but the cancellation-logging foundation begins at MVP). This discipline reduces serial-refuser behavior — buyers who place orders casually and refuse delivery half the time — which is one of the primary pain points of Tunisian COD.

This is a Layer 3 and Layer 4 update item, named in Appendix A.

### 4.14.3 — Delivery Receipt Confirmation

When an order arrives and the buyer accepts it (paying the seller in cash), **the buyer confirms receipt in the Servyou app**. Both sides then see the transaction as complete, and the status moves to "received." This confirmation closes the order from both sides and creates the auditable record that proves the transaction happened successfully.

The friction reduction is in dispute resolution: when a complaint later arises ("the seller says I never received the product, but I did"), the receipt confirmation timestamp is the evidence. When the buyer claims a refund-worthy issue, the confirmation provides the structured starting point for the dispute discussion. Without receipt confirmation, complaints become he-said-she-said with no neutral ground; with it, both sides start from a shared baseline.

This is a Layer 3 and Layer 4 update item, named in Appendix A.

### 4.14.4 — Features Sequenced for Post-Launch and Later

Three additional COD-friction-reduction features were considered during Pillar 4 conversation and are deliberately sequenced as **post-launch additions**, not MVP:

- **Buyer phone confirmation before dispatch** — the seller calls or messages the buyer to confirm commitment before paying delivery costs. Post-launch addition once Servyou has volume of orders that justifies this workflow.
- **Buyer rating and reputation system** — repeat trustworthy buyers earn visible reputation; serial-refusers earn visible warnings; sellers can choose which buyers they accept. Post-launch addition because reputation requires data accumulation from real platform usage.
- **Seller-committed delivery windows** — sellers commit to a delivery window when accepting an order; missing the window counts against their seller rating. Post-launch addition because it requires the broader seller-rating infrastructure to be operational.

These features come online as the carriage grows. They are named here so they are sequenced deliberately, not improvised under pressure.

## 4.15 — What Section 7 Adds to Servyou's Foundation

Section 7 commits Servyou to three concrete MVP features that reduce the dominant friction in Tunisian e-commerce. The features emerged through Pillar 4 conversation and need to be reflected back in Layer 3 and Layer 4 as part of locking this Pillar. Together they answer the implicit question: *if Servyou aligns with Tunisia's Cash-on-Delivery reality rather than fighting it, how does Servyou make that reality work better?* The answer is shared truth (status transparency), behavioral discipline (cancellation policy), and structured closure (receipt confirmation).

## 4.16 — Section 8: How User Understanding Grows

Section 8 applies the carriage-and-horses framing from Pillar 1 §1.0 to Servyou's understanding of its own users. The principle is the same: the horses are added as the carriage grows. **The user understanding gets bigger as Servyou gets bigger**, in the founder's words.

**Today's commitment.** At MVP build, Servyou's understanding of its users comes from three sources working together: the founder's own observation of Tunisian commerce behavior, the real market data anchored in Section 1 of this Pillar (DataReportal, MDWEB, U.S. Commerce Department, payment industry reports), and the discussions that produce this very document. This is honest about today's scale — there are no real users yet, so user research from real users is not yet possible, and pretending to have it would be dishonest.

**Pre-launch additions.** Phase 10 polish includes the first user interviews with real Tunisians who match each user type. The proposed scope: five to ten conversations of approximately thirty minutes each, with prospective consumers, shop owners, and freelancers, focused on the question *"what is the reality of how you currently shop / sell / freelance, and what frustrates you about it?"* The interviews are conducted without pitching Servyou — the founder listens, asks follow-up questions, and writes down what is said. The conversations are summarized in a Phase 10 working document under `docs/` and inform any final adjustments to the platform before opening to real users. This is the lowest-cost, highest-value user research available at pre-launch and is sequenced as a release-readiness item.

**Post-launch growth additions.** Once Servyou is live with real users, two sources of user understanding deepen the foundation. The first is **real platform analytics** — privacy-respecting, no personal data, only behavioral patterns: which categories are browsed most, which products convert to orders, which steps users abandon, which features are used most. These analytics inform feature priorities for ongoing development. The second is **periodic feedback sessions** with active users — a recurring rhythm of conversations with users who are using the platform, asking what is working and what is not. This is qualitative; analytics are quantitative; both together are the post-launch understanding mechanism.

**Collaboration scale additions.** When Servyou approaches Ministry of Finance, bank partnership, or Konnect-integration conversations — collaboration scale per Pillar 1's framing — user research becomes more formal. Structured user interviews following research methodology, surveys reaching broader user populations, usability testing on specific platform flows, and competitive research benchmarking Servyou against alternatives. The research is documented in a form suitable for sharing with institutional partners who want to see evidence that Servyou understands its market.

**Cup-and-international scale additions.** By the cup and international stage, Servyou's user research becomes part of the institutional readiness package. The package includes: documented user-research methodology, periodic published reports on Tunisian e-commerce trends (positioning Servyou as a thought leader on its own market), specific case studies of user types Servyou serves well, and external validation of the research approach by independent consultants if required by the institutional context.

**The discipline that holds throughout.** Whatever stage Servyou is at, the user understanding is honest about its sources, calibrated to the platform's actual scale, and updated continuously rather than treated as a fixed deliverable. **Servyou's understanding of its users is itself a growing thing, like the platform.**

## 4.17 — Closing Note for Pillar 4

Pillar 4 is complete. Eight Sections, taken together, describe who Servyou serves, why, and how the understanding of those users deepens over time.

Section 1 anchored to real 2026 Tunisian market data: a population of twelve million with 84.3 percent internet penetration, 56-80 percent of e-commerce running on Cash on Delivery, a mobile-first market with active social-commerce shift, a mature freelancer economy clustered in seven cities.

Section 2 named the user patterns Servyou serves: consumers distributed across the country with three usage sub-patterns; shop owners concentrated in seven urban governorates with three operating-model sub-patterns; freelancers also clustered in cities with four sub-patterns spanning students through full-time professionals and UGC creators; future user types of liberal professionals and companies as the trajectory Servyou grows into.

Section 3 named Servyou's value propositions explicitly: for consumers, the social-mobile shopping experience Tunisians prefer combined with the trust protection that social commerce lacks; for sellers, the end of the confusion of running a business scattered across many tools, consolidated into one place.

Section 4 named the **Unified Workspace Principle** — a founder-contributed principle joining the headroom and Plan-A-B-C principles from Pillar 1 as the third named principle Servyou is built on. The principle commits Servyou to building today's smaller user types' workspaces with the seriousness tomorrow's larger user types deserve to find.

Section 5 named the **Configurable Workspace Principle** — a second founder-contributed principle, committing Servyou to providing building blocks rather than imposing identity. Each user fills in what is true for them.

Section 6 explicitly named who Servyou does not serve at MVP: the non-internet 16 percent of Tunisians, B2B and corporate buyers, and international dropshippers.

Section 7 named the three MVP Cash-on-Delivery friction reduction features: order status transparency, cancellation discipline, delivery receipt confirmation. Three additional features were sequenced for post-launch.

Section 8 applied the carriage-and-horses framing to user understanding itself, naming how Servyou's knowledge of its users grows as the platform grows — from founder observation today, through pre-launch interviews, to post-launch analytics and feedback, to formal research at collaboration scale, to institutional positioning at cup-and-international scale.

The Pillar 4 commitments do not stand alone. They reach into the other Pillars and into the Layer documents. Pillar 5's marketing strategy is constrained and informed by who Pillar 4 names as users. Pillar 6's roadmap is sequenced around the user-type expansion Pillar 4 commits to. Pillar 3's brand voice will speak to the specific Tunisians described here. Pillar 2's design system will be built for the mobile-first social-commerce-aware experience Section 3 commits to. And the Layer documents need to be updated with the surfaced items in Appendix A.

Pillar 4 is locked.

## Appendix A — Layer Updates Surfaced During Pillar 4 Conversation

Pillar 4 conversation surfaced several items that need to be reflected back in the existing Layer documents so the foundation stays internally consistent. These are listed here explicitly, not silently folded into Pillar 4, so they can be handled deliberately as part of locking this Pillar. Each item names the Layer document(s) it touches and the nature of the update.

**A.1 — (Layer 3 + Layer 4) Order status lifecycle.** The order lifecycle is: accepted → prepared → dispatched → in delivery → arrived → received. Both buyer and seller see the same status at the same time. This requires a status enum on the orders table (Layer 4) with the six values, and UI surfaces in both buyer-side and seller-side dashboards that display and update the status (Layer 3 features).

**A.2 — (Layer 3 + Layer 4) Cancellation discipline.** Buyer can cancel pre-dispatch freely; post-dispatch cancellation requires a reason and is logged on the buyer's record. This requires a cancellation_reason column on the orders table (Layer 4) along with the status enum, plus a buyer-cancellation-history view that aggregates across orders. Layer 3 needs the UI flows for both cancellation paths.

**A.3 — (Layer 3 + Layer 4) Buyer confirmation of receipt.** When an order arrives and the buyer accepts it, the buyer confirms receipt in the app, moving the status to "received." This requires the confirmation action in the buyer-side UI (Layer 3) and the timestamp recording on the orders table (Layer 4).

**A.4 — (Layer 4 + Pillar 4) Freelancer profile additions.** The freelancer profile in Layer 4 gains optional fields for working hours and availability, skills, tools and software, current workplace, education, certifications, and preferred payment method (approximately seven new optional columns or related-table additions). All fields are optional per the Configurable Workspace Principle.

**A.5 — (Layer 4 + Pillar 4) Shop owner profile additions.** The shop profile in Layer 4 gains optional fields for shop type (physical/online-only/dropshipper enum), delivery setup, working hours, location detail, payment preferences, and category specialties (approximately six new optional columns or related-table additions). All fields are optional per the Configurable Workspace Principle.

**A.6 — (Layer 2) Clarification of dropshipping scope.** Layer 2 includes dropshippers in the shop owner role but did not specify domestic-vs-international. Pillar 4 §4.12.3 clarifies that **at MVP, dropshipping is domestic-only**: Tunisian dropshippers sourcing from Tunisian suppliers. International dropshipping is explicitly out of MVP scope. Layer 2 should be updated to reflect this clarification.

**A.7 — (Pillar 1 cross-reference) The Unified Workspace Principle and the Configurable Workspace Principle.** These two founder-contributed principles, named in §4.8 and §4.10 of Pillar 4, join the headroom principle and the Plan-A-B-C principle from Pillar 1 §1.8 as named principles Servyou is built on. A future minor update to Pillar 1 may cross-reference these principles in Section 4 (Architecture Rules) for completeness — sequenced for whenever Pillar 1 next has a substantive revision, not as an urgent change.

These seven Layer updates are part of the Pillar 4 lock. They are handled as a separate work item from writing Pillar 4 itself, sequenced after Pillar 4 is read and approved, before Pillar 5 (Marketing) is started — because Pillar 5 depends on the user understanding Pillar 4 establishes, and the Layer documents need to reflect the updates so the foundation stays consistent.

Pillar 4 is locked. Layer updates from Appendix A are pending.
