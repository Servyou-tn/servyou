# SERVYOU — LAYER 2: USERS AND ROLES

This is the second layer of the Servyou platform definition, built section by section with the founder and locked before moving on. It defines who uses Servyou, what each user type wants and fears, the rules that govern roles, and how the roles relate to one another. Every decision here is direct input to the data model (Layer 4) and the architecture (Layer 6), so that the database schema is correct from the first migration rather than rebuilt later.

Layer 1 (Vision and Purpose) is complete and recorded separately. This document covers Layer 2 and includes the Pillar 4 Appendix A item A.6 — the clarification that MVP dropshipping is domestic-only, with the post-MVP dropshipping-integration trajectory developed in §2.4.

## 2.1 — The Full Cast of Users and the Role Model

Servyou serves a defined cast of users across its life, of which the MVP builds the first set.

**MVP roles (built first):** Administrator (internal), and public users who all share a universal buying baseline, with two optional seller capabilities — freelancer and e-commerce shop owner.

**First post-MVP addition (about two months after launch):** Liberal professionals. This is not a single role but a *family* of professions — accountant, doctor, lawyer, engineer, and others — each with its own specialized template, its own fields, and potentially its own interaction model with consumers (for example, appointment booking for doctors).

**Later additions (from the 2030 vision):** Small companies (registered businesses needing invoicing and possibly multiple staff accounts), and further roles as the platform grows.

**The role model (locked).** Buying is universal: every user can buy products and request services, always. "Consumer" is therefore not a separate exclusive role but the baseline capability everyone has. On top of that baseline, a user may hold one seller capability — either freelancer or e-commerce shop owner, but never both at once. A user starts as a pure consumer (buying only) and may later upgrade to add one seller capability. Sellers never lose the ability to buy. The administrator is a separate internal role outside this model.

**Architectural note.** The role system and database must allow a seller type to branch into specialized sub-types in the future (the liberal professional templates) without rebuilding the foundation, and must separate the universal buyer identity from the optional seller capability rather than using a single rigid role value.

## 2.2 — The Consumer (The Buyer)

**Profile.** Age 16 and above. Any gender. Discovers Servyou through online ads or word of mouth. Often has multiple different needs over time, using Servyou repeatedly rather than once. Mobile-first, as most Tunisians browse on phones.

**Age rule (locked).** Minimum age to use Servyou as a consumer (browse and buy) is 16. Minimum age to upgrade to a seller capability (freelancer or shop owner) is 18, because selling involves binding contracts, money, and responsibility that minors cannot legally hold. Signup must capture date of birth, and the upgrade-to-seller flow must verify the user is 18 or older. This protects young users and the platform alike, per Value 1.

**Core fears.** First, the consumer cannot tell whether a seller is trustworthy — on social media anyone can pretend to be a real business. Second, the consumer worries the product will differ from the photos. Both are the same wound: the fear of being deceived by a stranger in a transaction where one must commit before verifying.

**MVP trust approach.** The MVP reduces these fears partially: complete, detailed seller profiles that signal seriousness; real information required at signup (verified email, real name, city) so sellers are not anonymous; visible signs of how established a seller is; and the ability for buyers to vet a seller through WhatsApp conversation before any money changes hands. The full solution — verified reviews and ratings, escrow, buyer protection — is version two, because it depends on in-platform payment. The MVP builds the trusted place; version two adds the trusted transaction.

## 2.3 — The Freelancer

**Profile.** Typically around 20 years old, digital-native. Common fields: IT and development, video editing, and marketing. An emerging and strategically important category is the UGC creator — someone with a talent for speaking naturally on camera, producing short authentic video content (product reviews, testimonials, presentations) for brands and shops. UGC is one of the fastest-growing freelance categories globally, fits the strengths of Tunisian youth, and connects the freelancer side to the e-commerce side, since shops hire creators for product videos. Must be 18 or older to register.

**Primary need (MVP).** Find good clients who pay a fair price. This is the freelancer's deepest working pain and the core of Servyou's freelancer side.

**Core fears.** First, delivering the work and then not getting paid. Second, clients who disappear or change the deal halfway. These mirror the consumer's fears from the opposite side of the table — the fear of committing effort before the other party has proven good faith.

**MVP approach and the key insight.** The MVP reduces these fears partially through client profile visibility, real signup information, and WhatsApp vetting before committing work. The full cure — in-platform payment with escrow, where the client's payment is held safely before work begins and released on delivery — is version two. Importantly, this same payment-and-escrow system heals the deepest fear of *both* sides of the marketplace at once, which makes it the single most important version-two priority.

**Future need (deferred).** Freelancer-to-freelancer collaboration: freelancers finding each other to form teams across complementary skills, build projects together, or found businesses such as agencies. This directly expresses Servyou's "connect and collaborate" vision but is a substantial standalone system, deferred beyond the MVP. The foundation should remain open enough that freelancer-to-freelancer relationships can be added later without a rebuild.

## 2.4 — The E-Commerce Shop Owner

**Profile.** Sells trending consumer products, commonly face care, health care, and beauty. Needs to organize products: stock counts, units sold, units remaining, sorted by category. Many are dropshippers who sell without holding inventory, often using Tunisian platforms like Converty. They hunt for "winning products" — trending items that sell fast before the market saturates. They rely heavily on social commerce (TikTok, Meta) for traffic and increasingly on UGC-style content for ads. Must be 18 or older to register.

**Critical market reality — Cash on Delivery.** Tunisian consumers overwhelmingly prefer paying cash when the product is physically delivered, because it removes the fear of paying for something unseen. COD is the Tunisian cultural solution to the buyer's trust fear, and Servyou must respect and accommodate it deeply.

**Payment in the MVP (locked).** Cash on Delivery is presented as the expected, normal, default way deals happen on Servyou. Product pages and the pre-filled WhatsApp messages openly assume COD. This makes Servyou native to Tunisian shopping reality and serves the value of being genuinely Tunisian. Card payment and in-platform payment remain version-two features; COD is the MVP answer to the payment-trust problem and fits the off-platform coordination model perfectly.

**Core fears.** First, COD failures: customers who order cash-on-delivery and then refuse to pay or are not home when delivery arrives — one of the most expensive problems in Tunisian e-commerce. Second, scattered orders: managing demand pouring in from Instagram, Facebook, WhatsApp, and TikTok all at once with no single place to organize it.

**Competitive note.** Converty is a direct Tunisian e-commerce competitor with an instructive pricing model: free until the seller reaches 10,000 TND in turnover, then a 0.3% commission. This risk-free-for-small-sellers model aligns with Servyou's values and is worth learning from.

**Dropshipping note for the data model.** Because dropshippers do not hold inventory the way normal shops do, the product model must handle both stock-tracking sellers and dropshippers who do not track stock the same way.

**Dropshipping scope at MVP (locked).** At MVP, dropshipping on Servyou is *domestic-only*: Tunisian dropshippers sourcing from Tunisian suppliers, fulfilling Tunisian buyers' orders. International dropshipping — sourcing from China, Turkey, AliExpress, or any other foreign supplier — is explicitly out of MVP scope, both for regulatory clarity (avoiding cross-border customs, foreign-currency payment, and import-tax complications) and for trust posture (buyers expect domestic delivery timelines and recourse). This commitment is named in Pillar 4 §4.12.3 and implemented in Layer 4's `shop_type` enum where `'dropshipper'` is reserved for the domestic case.

**Post-MVP dropshipping integration trajectory.** Tunisian dropshippers commonly run their business across multiple platforms simultaneously: Converty for the Tunisian-facing storefront, AliExpress or Alibaba for international product sourcing, sometimes Shopify or independent supplier accounts for specific product categories, and ad hoc supplier relationships through WhatsApp and email. Their pain is not a missing platform — it is the *scatter* of running their business across many of them. Per the Unified Workspace Principle locked in Pillar 4 §4.8, Servyou's long-term value to dropshippers is **integration, not replacement**: post-MVP iterations sequence connector integrations that let a shop owner link their Servyou shop to their existing accounts on Converty, AliExpress, and other platforms, so the dropshipper's orders, stock signals, and supplier relationships flow into the unified Servyou workspace without forcing them to abandon the platforms their business already runs on. This is the carriage-and-horses principle from Pillar 1 §1.0 applied to dropshipper integrations: each connector is added when the carriage is ready to carry it — first domestic-only at MVP (no external connectors yet), then domestic-plus-Converty-integration at a specific post-launch scale-stage (since Converty is the most common Tunisian dropshipping platform and the integration cost is bounded), then international-platform connectors (AliExpress, Alibaba, Shopify) at collaboration scale with the regulatory, payment, and trust infrastructure in place. The order in which connectors arrive is sequenced deliberately in Pillar 6 (Roadmap, not yet written), not improvised under demand. Each connector goes through its own Step 0 discovery, technical due diligence on the third-party platform's API stability and terms of service, and explicit founder approval before integration work begins.

**COD-failure solution (version two).** Deep solutions to failed COD deliveries — order-confirmation calls before shipping, delivery-company integration and tracking, buyer reliability history — depend on delivery integrations and data deferred beyond the MVP. The MVP organizes orders (which helps) but does not yet solve failed deliveries. This is recorded as a version-two priority.

## Servyou's Core Positioning and Growth Strategy (locked)

Social media (Instagram, Facebook, TikTok) is the marketing layer; Servyou is the transaction and organization hub. Shop owners and freelancers share their Servyou shop or profile link in their social bios and at the end of their content. Viewers who click through become Servyou users and customers for that seller. This solves the shop owner's scattered-orders pain by consolidating social-driven demand into one organized place, and it grows Servyou through sellers' own existing audiences. It requires no extra features beyond the public shop and freelancer profile pages already planned, since each has a shareable link by design. This is the unified-platform advantage no other Tunisian platform has.

## 2.5 — The Administrator (and the Developer/Owner)

Two responsibilities are kept deliberately separate, because collapsing them into one super-role would endanger users' personal data.

**The Developer / Platform Owner** (the founder, and future engineers) works on the machine itself: the codebase through GitHub, the database structure and raw data through Supabase's protected dashboard and migrations, and deployment through Vercel. Responsible for fixing technical problems, upgrading features over time based on user needs and new technology, and keeping the platform running. This work happens through professional technical tools under the strongest access controls, never through the in-app admin dashboard, because it can touch everyone's data.

**The Administrator / Moderator** (the in-app admin role, present in the MVP) works on people and content through the admin dashboard: viewing users and suspending or removing rule-breakers, viewing and hiding or removing fake or harmful content (shops, products, freelancer profiles, services, job posts), handling user-submitted reports, resolving disputes between users, and granting admin access to other trusted team members. This role deliberately cannot touch the raw database or codebase. That limitation is a protective feature, not a weakness.

**Data protection principle (locked).** Upgrading features and fixing problems must never violate users' rights over their personal data. Access to raw personal data is restricted to the technical layer under the strongest controls, never exposed through the moderation dashboard, and never used beyond what is necessary to operate the platform honestly. Users own their personal data; Servyou is its careful guardian. This follows from Values 1 and 2.

## 2.6 — How the Roles Relate to Each Other

Consumers connect to shop owners by browsing products, requesting to buy, and arranging Cash on Delivery through WhatsApp. Consumers connect to freelancers in two ways: by requesting a listed service, or by posting a job that freelancers respond to, then coordinating through WhatsApp. The administrator connects to everyone through oversight and moderation.

Critically, because buying is universal, sellers are also buyers. A shop owner can hire a freelancer — for example, a UGC creator to film a product video for a TikTok ad — and a freelancer can buy from a shop. This creates a living internal economy where members both give and receive, which is the structural expression of Servyou's "connect and collaborate" vision. It costs nothing extra to enable because buying is already the universal baseline. Freelancer-to-freelancer collaboration is a richer future feature, deferred beyond the MVP.

## Bridge to Later Layers

Every decision in this layer feeds directly into the data model and architecture. The universal-buying-with-optional-seller-capability model reshapes the early profiles table away from a single rigid role column. The liberal professional templates require a role system that can branch into sub-types. The age rule requires storing date of birth and checking it at upgrade. The dropshipping reality requires a product model that handles both stock-tracking and non-stock sellers, with the MVP scope deliberately limited to domestic Tunisian operations and a clear post-MVP trajectory of connector integrations to Converty, AliExpress, and other platforms (per §2.4). The COD default and the deferral of in-platform payment shape the order structure to fit COD now while leaving room for cards and escrow later. The social-to-Servyou strategy requires clean shareable public pages for every shop and freelancer. When the schema is designed in Layer 4, each table and column must trace back to a decision recorded here.
