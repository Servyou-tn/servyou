# PLATFORM PAGES AND SYSTEM REFERENCE — THE COMPLETE PICTURE

This document is a generic reference for what a multi-sided marketplace platform looks like in terms of its pages, the elements each page contains, and how the system works end to end. It is a companion to `project-overview.md`, which covers the platform-building lifecycle from idea to first users. Where the lifecycle document tells you *when* each stage happens, this document tells you *what* the platform actually consists of when it is built.

It is written generically rather than tied to any specific project, because the page anatomy of marketplace platforms is remarkably consistent across products. A platform connecting buyers with shop owners, a platform connecting consumers with freelancers, a platform connecting both groups plus a job-posting flow — all share roughly the same surface area, the same page types, the same element conventions. The differences are in the specific data each platform stores and the specific journeys each role takes, not in the inventory of pages.

This document distills the consensus from contemporary marketplace, e-commerce, and SaaS design literature into a single reference that can be returned to when planning a new feature, designing a new page, or auditing what is missing from an existing platform. It is written in prose because the lessons are connected; pages do not exist in isolation but as part of journeys that flow from one to the next.

## The complete site map — what a marketplace platform actually contains

A multi-sided marketplace platform typically has around forty to sixty distinct pages in its MVP state, organized into roughly eight zones. Some pages are accessible to anyone visiting the site, including logged-out visitors. Some require authentication. Some are role-specific, visible only to users who have taken on a particular role such as shop owner or freelancer. And some are administrative, accessible only to platform staff.

The eight zones are: the public marketing surface, the authentication flow, the discovery and browsing layer, the transaction layer, the seller-side workspace, the service-provider-side workspace, the job or request-posting flow, the user account zone, and the administrative dashboard. Each zone contains a coherent set of pages that work together to deliver one body of value. Each page within a zone has its own purpose, its own audience, and its own set of elements.

This document walks each zone in turn, naming every page, listing what each page contains, and explaining how the page fits into the larger journey it belongs to. Sometimes a page belongs to more than one zone — the search results page is both a discovery page and a navigation hub — but every page has a primary home.

## Zone 1 — The public marketing surface

The public marketing surface is everything a non-logged-in visitor sees when they first arrive at the platform. This zone has the highest traffic, the lowest conversion expectation per visit, and the strongest influence on whether visitors return. "Every high-converting landing page contains the same core components, arranged in a sequence that matches how a motivated visitor naturally processes information and makes decisions, from first impression to conversion action."

### The landing page

The landing page is the home page that visitors arriving from marketing channels see first. It is the most important page on the platform from a first-impression perspective, and its job is to convert a visitor into either a signup or a meaningful action like browsing the catalog. The contemporary consensus on landing page structure is consistent across the literature: "Hero — Headline, subheadline, primary CTA, product visual · Visual Product Demo — Screenshot, animation, or interactive preview · Benefits — 3 to 4 outcome-focused benefits with icons · Social Proof, first wave — Logos, user count, or top testimonial · Problem and Feature Breakdown — Problem agitation, then feature cards · Objection Handling — Pricing clarity, integration list, security note · Social Proof, second wave — Detailed testimonials or case study".

The elements that compose the landing page are: a navigation bar at the top with the logo, a slim menu of two to four top-level links, a language toggle for multilingual platforms, and a primary call-to-action button. Below the navigation sits the hero section with the main headline that communicates the value proposition in under ten words, a subheadline of one or two sentences that expands on the headline, a hero image or animation that shows the product in use, and a single primary CTA that is visually the most prominent element on the page. Below the hero come the trust indicators — logos of customers or partners, user counts, ratings — that visitors scan to validate that other people use the platform.

Further down the page, the benefits section displays three to four outcome-focused statements with supporting icons, each describing what the user gains from using the platform. The features section breaks down the product capabilities in more detail with screenshots or animations. The social proof section presents testimonials, case studies, or aggregated trust signals. The pricing section, if the platform charges for use, displays the pricing tiers transparently with a clear comparison of what each tier includes. The FAQ section answers the questions that hesitant visitors are likely to have. The closing CTA section restates the value proposition and provides a final clear path to signup. And the footer, which appears on every page on the platform, contains the secondary navigation, the legal links, the social media links, the language toggle, and the company information.

One critical finding from the research: "Research from Unbounce consistently finds that landing pages with navigation menus convert at 10 to 15% lower rates than equivalent pages without navigation. Removing the navigation menu is the single highest-impact, lowest-effort conversion improvement available on most landing pages — and most businesses never do it." For landing pages used in paid acquisition campaigns specifically, removing the top navigation increases conversion meaningfully. For the home page that visitors arrive at organically, the navigation stays.

### The about page

The about page tells the story of the platform — who built it, why it exists, what values guide its decisions. This page is more important than founders typically realize because it is the page that converts users who want to feel emotionally connected to the platform's mission, not just informed about its features. The elements that compose it are: a headline that captures the mission in one line, a longer story about the problem the platform exists to solve, photographs of the founder or team if appropriate to the brand, the values that guide decisions, and a CTA at the bottom that leads either to signup or to the contact page.

### The contact page

The contact page provides ways for visitors to reach the platform team. The elements are: an email address visible as text and as a `mailto:` link, a contact form for visitors who prefer that channel, links to social media accounts, a physical address if the company has one, expected response time so users know what to expect, and any phone number if support is provided by phone.

### The FAQ or help center page

The FAQ page answers the questions that come up most often in support conversations. It is grouped by category (account, payments, listings, disputes, etc.) and uses an accordion or expandable pattern so visitors can scan headings and only expand the questions relevant to them. For larger platforms this evolves into a full help center with search and articles.

### The legal pages

Every serious platform needs a set of legal pages that protect both the users and the business. The contemporary literature is consistent that "Most professional websites should have five important legal pages: a privacy policy, terms and conditions, a refund policy, a disclaimer, and a cookie policy."

The **terms of service** (sometimes called terms and conditions or terms of use) defines the legal relationship between the platform and its users. "The website terms and conditions page defines the legal relationship between the business and website users. It lists the rules for use, intellectual property rights, limits on liability, and ways to settle disputes." The page is dense with legal language but should still be readable, with section headings that let users find the parts that matter to them.

The **privacy policy** explains what data the platform collects, why it collects it, how it stores it, and what rights the user has over that data. For platforms operating in jurisdictions with data protection regulation — the European Union under GDPR, Tunisia under Loi organique 2004-63, the Gulf states under their national laws — this page must be reviewed by a qualified lawyer before publication and must be specific about the platform's actual data practices rather than copied from a template.

The **cookie policy** discloses what cookies the platform sets in users' browsers, what each cookie does, and how users can opt out. This page is often paired with a cookie consent banner that appears on a user's first visit.

The **accessibility statement** declares the platform's commitment to accessibility standards (typically WCAG 2.2 Level AA), describes what has been done to meet the standards, names known limitations, and provides a contact method for users who encounter accessibility problems.

The legal pages are linked from the footer of every page on the platform, so they are always reachable, and the privacy policy is also linked near every form that collects personal data. "The most common place for a Privacy Policy link is in the footer section of a website, on each and every page. This would make it accessible to all users, regardless of what web page they're on."

### The error pages

The error pages — typically a 404 page for missing content and a 500 page for server errors — are part of the public surface even though no one wants to land on them. They should be helpful rather than apologetic: a clear statement of what happened, suggestions for what the user can do next (search, browse categories, return to home), and a working navigation that lets the user continue their journey. The 404 page especially should never be a dead end.

## Zone 2 — The authentication flow

The authentication flow is the bridge between the public surface and the private platform. Every signup is a moment of friction, and every additional field reduces conversion. "Minimal form fields: The fewer fields you ask for, the less resistance you'll face. Most high-converting forms request just a name and email to minimize effort. Each additional field creates friction, so keep inputs to the bare essentials."

### The signup page

The signup page collects the minimum information needed to create an account. The contemporary best practice is to ask for as little as possible upfront — often just email and password, or even just email with a magic link sent to confirm. Additional information is collected progressively as the user takes actions that require it, rather than all at once at signup.

The elements are: a clear headline that confirms the user is about to create an account, the email field with type="email" so mobile keyboards show the @ key, the password field with show/hide toggle, optional fields like name only if essential, the submit button as the most visually prominent element, error messages displayed inline next to the field that has the problem, a link to the signin page for users who already have an account, and the legal acknowledgment that signing up means accepting the terms of service and privacy policy.

For platforms that need to collect age verification (because users must be over 18, for example), the date of birth field is asked at signup with clear messaging about why it is required. For platforms that need to collect a phone number, progressive collection is preferred — collect it later when the user is about to take an action that needs it, rather than blocking signup on it.

"Case studies show that trimming a form from four fields to three can boost conversion by nearly 50%. ClickUp applies that lesson perfectly by delaying all other details, like team size, role, and billing, until after you're already engaged. By asking only what's essential upfront, ClickUp turns signup from a chore into a quick win."

### The signin page

The signin page is even simpler than signup. The elements are: a headline, the email field, the password field with show/hide toggle, a "forgot password" link, the submit button, and a link to the signup page at the bottom for users who do not yet have an account. Nothing else. No marketing copy, no extra options, no distractions.

### The email verification page

After signup, the user typically receives an email with a verification link. Clicking the link brings them to an email verification page that confirms the verification was successful and redirects them either to onboarding or directly into the platform. For platforms that use magic links instead of passwords, this page is also where the user lands after clicking the login link in their email.

### The password reset flow

The password reset flow consists of two pages. The first is the password reset request page, where the user enters their email address and the platform sends a reset link to that address. The second is the new password page, where the user clicks through from the email and sets a new password. Both pages should be reachable without being logged in.

### The onboarding flow

For some platforms, the first signin is followed by a brief onboarding flow that collects additional information needed to personalize the experience. This is the right moment to ask the questions that signup deliberately skipped — preferences, role selection, city or location, language preference. The onboarding should be skippable when possible, since users who feel forced to complete a long form often abandon, and the platform can always ask later.

## Zone 3 — The discovery and browsing layer

The discovery and browsing layer is where users find what they came for. This zone is the heart of any marketplace platform, because it is where the platform's value proposition becomes concrete: the user arrives looking for something, and the platform helps them find it.

### The homepage (for logged-in users)

The homepage for logged-in users differs from the landing page in that the value proposition has already been accepted and the question is no longer "should I trust this platform" but "what do I do next." The elements are: a navigation bar with the platform logo, the primary navigation links, a search bar, a notifications indicator, the user's avatar with access to the account menu, and a primary CTA appropriate to the user's role.

Below the navigation, the homepage typically shows recently added content (new products, new services, new freelancers), categories that the user can browse into, featured or curated content if the platform curates, and content personalized to the user based on their history of browsing or transacting. The exact mix depends on the platform's content strategy and how much personalization data is available.

### The category browse page

The category browse page lists all the content in a single category, with filtering and sorting controls that let the user narrow down to what they need. The elements are: a category title and short description at the top, breadcrumb navigation showing where the user is in the category hierarchy, a filter sidebar (or top filter bar on mobile) with controls for price range, city or location, sub-category, and any other category-specific facets, a sort control with options like newest first, lowest price, highest rated, and the grid of listing cards itself.

Each listing card on this page is a compact summary of one item: a representative image, the title, the price or price range, the seller or provider name with optional star rating, the city or location, and any badges that mark the listing as featured, verified, or recently added. Cards are designed to be scannable rather than to deliver complete information; the goal is to let the user pick the listings worth exploring in detail.

### The search results page

The search results page is the category browse page applied to a user-entered query rather than a pre-defined category. The elements are mostly the same, with the addition of a clear display of the query that produced the results, suggestions for alternative spellings if the platform supports them, and an empty state that handles the case where no results were found. "A smart search engine will help users immediately find what they need. It would be great to provide advanced filtering options. They allow narrowing the search by categories, including price, color, size, and other custom characteristics."

### The product detail page

The product detail page is the single most important page on an e-commerce platform after the landing page, because it is the page where the buyer makes the decision to transact. The contemporary research is uncompromising about what belongs on it. "A successful PDP should include essential elements such as high-quality images, comprehensive product descriptions, pricing information, and customer reviews to enhance user experience and drive conversions."

The elements that compose the product detail page above the fold are: the product images in a gallery with a primary image and thumbnails of additional angles, the product title and short description, the price displayed clearly, the seller name and rating with a link to their profile, the primary call-to-action button (typically "Add to cart" or "Request to buy"), a secondary action like "Save to favorites," and any variant selectors (size, color, options) if the product has variants.

Below the fold come the longer description with full specifications, the shipping and delivery information, the return or refund policy specific to this listing or this seller, the customer reviews section with star ratings and written feedback from previous buyers, and a recommendations section showing related products from the same seller or the same category.

The mobile layout flattens this structure into a single column. "Stack content vertically. On mobile, the natural flow is: image gallery > title/price > variant selector > CTA > description > reviews. Make tap targets large. Buttons, variant selectors, and interactive elements should be at least 44x44 pixels with adequate spacing between them. Use swipeable image galleries. Horizontal swipe for product images is an expected mobile pattern."

Image quality matters more than any other element on this page. "Product imagery is the single most influential element on a PDP. 67% of online shoppers cite image quality as the top factor in their buying decision, more than product descriptions, reviews, or pricing." A platform that allows sellers to upload poor images is a platform that loses conversions on every poor-image listing.

### The service detail page

The service detail page is the product detail page for service marketplaces. The differences from a product page are structural: a service does not have inventory but has availability, does not have a single price but typically a range or hourly rate, does not have shipping but has a service area or delivery method, and the buyer's call to action is typically "Request a quote" or "Request this service" rather than "Add to cart."

The elements are: the service title and short description, the provider's name and rating, the price or price range, a description of what is included in the service, the service area or service delivery method (in-person at provider's location, in-person at buyer's location, remote, etc.), the provider's qualifications or work samples, customer reviews specific to this service or to this provider, and the primary CTA to request the service.

### The shop or seller public page

The shop public page is the public-facing storefront for a single seller. This page is the social-sharing target for the seller's marketing — the URL they put in their Instagram bio, their WhatsApp status, their Facebook page. It must therefore be standalone enough to convert a visitor who arrives without context.

The elements are: a banner image at the top of the page, the shop logo as an avatar, the shop name as the main heading, the city or location, the seller's name as the operator, the shop description, any rating or trust signals, and the grid of products this seller has listed. The page is sharable — a public URL that works for any visitor whether logged in or not.

### The freelancer or service-provider public page

The freelancer public page is the same concept applied to service providers. The elements are: a banner image, an avatar photo of the provider, the provider's name and professional title, the city or location, the provider's bio describing their experience and approach, their skills and specializations, their portfolio or work samples, their customer reviews, the grid of services they offer, and contact options.

## Zone 4 — The transaction layer

The transaction layer is where the platform's value actually materializes. A buyer found a product or service they want; now they need to take the action that completes the exchange. For platforms that handle payment directly, this is the checkout flow. For platforms that operate on a request or cash-on-delivery model, this is the request flow.

### The request or checkout page

The request page collects the information needed to complete the transaction. For a product transaction with cash-on-delivery, the elements are: a summary of what is being requested (the product, the quantity, the seller, the total), the delivery details (full name of recipient, full address with all components, phone number for the courier), an optional note from the buyer to the seller, and the primary submit button to confirm the request.

For service transactions, the elements differ: a description of what is being requested, the buyer's contact information, the desired timeframe, and any specific requirements or preferences. Service requests are typically less structured than product requests because services vary more in scope.

For platforms with in-app payment, the checkout page adds the payment method selection, the order total with taxes and fees broken out clearly, the privacy and security indicators near the payment fields, and the final confirmation step before the transaction completes.

### The order or request confirmation page

After the buyer submits a request, they land on a confirmation page that confirms what was just submitted. The elements are: a clear visual confirmation that the request went through (a checkmark icon, a confirmation message), a recap of what was requested, the next steps the buyer should expect (waiting for the seller to accept, expected delivery timeframe, how the buyer will be notified), and links to the buyer's "My Requests" page where they can track the request later.

### The my requests or order history page

The buyer's "My Requests" page lists every request the buyer has made on the platform with the current status of each. The elements are: a header explaining what the page shows, filter controls to filter by status, the list itself with each request showing a thumbnail, the title, the seller, the date, and a status badge, and pagination or infinite scroll for buyers with many requests.

For each request in the list, the buyer can drill into a request detail page that shows the full history of that request — what was ordered, the current status, any messages exchanged with the seller, and any actions available like cancellation or confirmation of receipt.

### The order lifecycle stages

For platforms that handle COD or coordinate delivery, the order status follows a defined lifecycle from creation to completion. The contemporary best practice for COD-driven platforms is to track the status across multiple stages rather than just pending/completed/cancelled. A typical lifecycle is: pending (seller has not yet responded), accepted (seller agreed to fulfill), prepared (seller has packaged the order), dispatched (the order is on its way), in delivery (the courier is delivering it), arrived (the courier reports delivery completed), received (the buyer confirmed receipt), with cancelled as a parallel terminal state that can occur from any pre-dispatch stage.

The buyer sees the current stage on their My Requests page and receives notifications as the stage changes. The seller advances the stage from their orders dashboard. Some stages are advanced by the courier or the system rather than the user. The cancellation discipline distinguishes between pre-dispatch cancellation (free, often without reason required) and post-dispatch cancellation (logged with reason, may carry consequences).

## Zone 5 — The seller-side workspace

The seller-side workspace is where shop owners and product sellers manage their listings, their orders, and their shop presence. This zone is where the platform's tooling for the supply side lives.

### The seller dashboard

The seller dashboard is the landing page for a seller after they log in. "Build the shell: dashboard shell with fixed sidebar (240px), top nav (64px), and scrollable content area." The elements are: a sidebar with navigation to all the seller's tools (products, orders, analytics, shop settings, public page preview), a top bar with the platform navigation, the user's avatar, and notifications, and a main content area that opens to an overview of the seller's recent activity.

The overview content typically shows a summary bar at the top with key metrics (orders today, pending requests, total products listed, recent revenue if the platform tracks it). "HubSpot's CRM dashboard uses a large summary bar at the top showing deal pipeline value, followed by a grid of activity widgets. The hierarchy is enforced by size: the pipeline number is the largest element on the page." Below the summary bar, a grid of recent activity widgets — recent orders, recent product views, recent messages — gives the seller a quick read on what is happening with their shop.

### The shop create and edit pages

When a seller first becomes a shop owner, they go through a shop creation flow that collects the essential information: shop name, shop description, city, and optionally shop logo and banner. The shop edit page is the same form, accessible later, that lets the seller update any of these fields.

For platforms with configurable seller workspaces, the shop edit page may also include fields for shop type, delivery setup, working hours, payment methods accepted, and product categories. These optional fields let each seller describe their operation accurately without forcing every seller into the same shape.

### The products list page

The products list page shows the seller all their products in a sortable, filterable table or grid. The elements are: filter controls (by status, by category, by stock level), sort controls (by date added, by views, by orders), a primary action button to add a new product, and the list itself with each product showing a thumbnail, the title, the price, the stock state, the status (active, hidden, sold out), and quick actions to edit or delete.

### The add product page

The add product page is the form for creating a new product listing. The elements are: a primary image upload area with the ability to add additional images, the product title field, the category selection, the price field with currency indicator, the description text area, the variants section if the product has options like size or color, the stock tracking section (tracks stock with count, or always available for made-to-order and dropshipping), the status selector (active immediately, save as draft), and the submit button.

### The edit product page

The edit product page is the same form populated with the existing product's data. Editing a product republishes it with the new values; the platform may version the listing or simply overwrite the previous values depending on its model.

### The orders received dashboard

The orders received dashboard lists every order or request the seller has received with the current status of each. The elements are: filter controls (by status, by date range), the list of orders with each showing the buyer's name and delivery details, the product, the quantity, the requested date, the current status, and the action buttons appropriate to the current status. For platforms with an 8-stage order lifecycle, the action buttons reflect the next available transition (Accept → Prepare → Dispatch → In Delivery → Arrived).

Each order has a detail view that shows the full history of the order, the messages exchanged with the buyer, and any cancellation reason if the order was cancelled.

### The shop public page preview

The seller can preview their public shop page from their dashboard to see what visitors see. This is the same page that customers see when they visit the shop URL — the seller views it as a visitor would, with a clear indicator that they are seeing their own shop in preview mode.

## Zone 6 — The service-provider workspace

The service-provider workspace mirrors the seller-side workspace but is adapted to the differences between products and services. A freelancer or service provider does not manage inventory; they manage their services, their availability, and the requests they receive.

### The freelancer profile create and edit pages

The freelancer profile creation flow collects: the provider's name, professional title, city, bio describing their experience, skills (selected from a tag list or entered freely), portfolio uploads, and contact preferences. The edit page is the same form for ongoing updates.

For platforms with configurable provider workspaces, the profile may also include working hours, current workplace if relevant, preferred payment methods, education history, certifications, and the tools or platforms they use.

### The services list page

The services list page shows the provider all the services they have listed with controls to filter, sort, edit, and delete. Each service appears as a card with the service title, a thumbnail or icon, the price or price range, the status (active or hidden), and quick action buttons.

### The add and edit service pages

The add service page collects: the service title, the category, the description, the price or price range, the delivery method (in-person at provider, in-person at client, remote), the duration or scope, optional images or work samples specific to this service, and the status. The edit service page is the same form populated with existing data.

### The job board

For platforms that connect freelancers with clients via posted jobs (rather than only via direct service listings), the job board is where freelancers browse available jobs. The elements are: filter controls (by category, by city, by budget, by required skills), sort controls (newest first, highest budget, fewest responses), and the list of job posts. Each job in the list shows the title, the budget, the city, the posting date, the number of responses already received (to indicate competition), and a brief excerpt of the description.

### The job detail page

Clicking a job in the board opens the job detail page which shows the full description, the requirements, the budget, the deadline if any, the client's information (typically a first name and city; full identity revealed only after the freelancer is engaged), the number of responses already submitted, and a form or button for the freelancer to submit their response.

### The respond to job form

The job response form collects: the freelancer's proposal message explaining how they would approach the job, their proposed price if it differs from the posted budget, their proposed timeframe, and optionally their portfolio links or relevant work samples.

The platform typically enforces fairness limits on this form: a cap on how many responses each job post can receive (so popular jobs don't drown out the response from any one freelancer), and a cap on how many active responses each freelancer can have outstanding (so freelancers cannot spam every job post on the platform).

### The requests received dashboard

The provider's requests received dashboard lists every service request that has come in. Each request shows the buyer's name, the service requested, the date, the current status, and action buttons to accept, decline, or message the buyer.

### The provider public page preview

The provider can preview their public freelancer profile page to see what visitors see, the same way shop owners preview their shop page.

## Zone 7 — The job or request posting flow

For platforms that allow consumers to post jobs that providers can respond to, the job posting flow is the consumer-facing path to creating a job.

### The post a job page

The post a job page is a multi-section form that collects: the job title, the category, the description in detail, the city or location, the budget (sometimes a range, sometimes hourly, sometimes "open"), the required skills as tags, the desired deadline, and the consumer's contact preference. The form may be split into multiple steps for clarity, with progress indicators showing the user how far they are through.

### The my jobs page

The consumer who has posted jobs can see all their posted jobs on a my-jobs page, with the current status of each (open, closed, in progress, completed). For each job, the consumer can drill into a detail page that shows all the responses received from freelancers.

### The job responses review page

The job responses page for the consumer shows every freelancer who responded to a specific job, with their proposal message, their proposed price, their portfolio, and their rating. The consumer can review these responses, message the freelancers, and eventually select one to work with.

## Zone 8 — The user account zone

The user account zone is where every user, regardless of role, manages their personal information, their preferences, and their cross-role activity.

### The profile edit page

The profile edit page lets the user update their personal information: full name, email (which typically requires re-verification when changed), phone number, date of birth, city, language preference, and notification preferences. The page also typically allows the user to upload a profile photo and to change their password.

### The settings page

The settings page (sometimes the same as the profile edit page, sometimes separate) covers preferences that affect how the platform behaves for the user: notification settings (which types of email to receive, which push notifications to enable), privacy settings (visibility of their activity to other users), language and locale, currency display preference if relevant, and account-level controls like change password and delete account.

### The favorites or wishlist page

The favorites page shows everything the user has saved across the platform — products favorited, services favorited, shops or freelancers followed. The page is private; only the user sees their own favorites. The elements are: tabs or filters to switch between favorited products, services, and providers; the list of favorited items as cards with the same elements as in the discovery layer; and the ability to remove items from favorites.

### The notifications page

For platforms with an in-app notification center (separate from email notifications), the notifications page lists every recent notification the user has received: order status updates, new messages, system announcements, and so on. Each notification has a timestamp, a brief summary, and a link to the relevant page on the platform.

### The messages or inbox page

For platforms with in-app messaging between users, the messages page is the inbox. The elements are: a list of conversations on the left (or top on mobile), with each conversation showing the other party's avatar, name, the last message preview, and the timestamp. Clicking a conversation opens the conversation view with the full message history and a compose area at the bottom.

## Zone 9 — The administrative dashboard

The administrative dashboard is where platform staff moderate users, content, reports, and disputes. This zone is accessible only to users with administrative permissions and is deliberately separated from the regular platform interface.

### The admin overview

The admin overview shows the platform's aggregate state: total users, total active sellers, total active providers, total orders this week, pending reports, pending disputes, and any system alerts. The elements are similar to other dashboards but with platform-level metrics rather than user-level.

### The user management page

The user management page lists every user on the platform with controls to search, filter, sort, suspend, or remove. Each user row shows the user's name, email, role, signup date, last activity, and current status. Clicking a user opens their detail page where the admin can see the user's full activity history, transactions, reports for or against the user, and take moderation actions.

### The content moderation pages

The content moderation interface has separate pages for each type of moderated content: products, services, shops, freelancer profiles, job posts. Each page lists the content with filters for flagged or reported items, and lets the admin hide, remove, or take other moderation actions on violating content.

### The report queue

The report queue lists every report submitted by users about other users or content. Each report shows who reported, what was reported, the reason given, the current status (new, under review, resolved), and the admin who is handling it. Clicking a report opens the report detail page where the admin can review the reported content with full context and take action.

### The dispute resolution surface

For platforms that handle disputes between buyers and sellers, the dispute resolution surface pulls together the structured evidence the platform has collected — order lifecycle history, timestamps, messages exchanged, cancellation reasons — into a single view that lets the admin resolve the dispute from one place. The admin can side with the buyer, the seller, or propose a compromise, and record the decision with reasoning.

### The platform statistics page

The platform statistics page shows aggregate metrics that help the platform team understand health and growth: signup rate over time, active users, transactions completed, revenue if the platform takes commission, average time to fulfillment, dispute rate, retention curves. These metrics are anonymized at the aggregate level; individual user data is not exposed here.

## Global elements — what every page has

Beyond the zones, certain elements appear consistently across every page on the platform.

### The header

The header is the navigation bar at the top of every page. The elements are: the platform logo (which acts as a home link), the primary navigation menu (typically three to five top-level items), the search bar for platforms with search, the language toggle for multilingual platforms (positioned in the top right corner, where the research shows the highest conversion impact), the notifications bell with a badge for unread notifications, and the user's avatar or login button.

The header is sticky on most platforms (it stays visible as the user scrolls) so that the primary navigation is always one click away. On mobile, the navigation collapses behind a hamburger icon to save space.

### The footer

The footer is the navigation that appears at the bottom of every page. The elements are: secondary navigation links (about, contact, help, careers), legal links (terms, privacy, cookies, accessibility), social media links, language toggle, currency selector if the platform supports multiple currencies, the copyright notice, and the company information including the legal entity name and address.

### The breadcrumbs

For platforms with hierarchical content (categories within categories, subcategories within categories), the breadcrumbs at the top of each interior page show the user where they are in the hierarchy. Each breadcrumb is a link that takes the user up one level.

### The modals

Modals are floating windows that appear on top of the page content for actions that need focus without leaving the current page. Common modals include: confirm destructive action (delete, cancel), quick login when an action requires authentication, image lightbox for full-size product photos, share dialog with copy-to-clipboard and social platform options.

### The alerts and toasts

Alerts and toasts are temporary messages that appear at the top of the page (alerts) or in a corner (toasts) to confirm an action completed or to warn about an issue. Success messages, error messages, and informational messages each have a distinct visual treatment so the user can scan the page and immediately tell the message's type.

### The empty states

Every list page on the platform has an empty state — what the user sees when there is nothing to show. Empty states are not failures to handle; they are opportunities to guide the user toward their next action. An empty "My Favorites" page has an empty state that says "You haven't favorited anything yet" with a CTA to browse products. An empty "My Requests" page has an empty state that says "You haven't requested anything yet" with a CTA to start browsing.

### The loading states

Pages that load data asynchronously have loading states that appear briefly before the data arrives. Loading states should not be blank screens; they should be skeleton screens that show the shape of the content that is about to load, so the user has a sense of what is coming.

## How the system works — the architecture loop

Beyond the individual pages, there is a system that ties them all together. Understanding this system is essential to understanding why each page contains what it contains.

The platform runs on a layered architecture. At the bottom sits the **database**, which stores all the data the platform handles: users, listings, transactions, reports, and so on. The database enforces the most important rules itself through constraints (like "price must be positive") and through row-level security policies (like "only the owner can edit their own shop"). This is the principle that protection lives in the data itself, not just in the code that reads it.

Above the database sits the **authentication layer**, which knows who is currently logged in and provides that identity to every database query. When a user makes a request to the platform, their authentication token tells the database who they are, and the row-level security policies use that identity to decide what they are allowed to see and change.

Above the authentication layer sits the **application layer**, which is the code that renders pages, handles form submissions, validates input on the way in, and constructs database queries. The application layer cannot bypass the security rules because the rules are enforced below it, in the database itself. This means even if the application has a bug, even if a query is constructed wrong, the database still refuses to return data the user is not allowed to see.

Above the application layer sits the **frontend**, which is the browser-side code that renders the pages the user actually sees, handles client-side interactions, and sends requests back to the application layer when the user takes an action.

The flow for a typical request is: the user clicks a button on the frontend, the frontend sends a request to the application layer, the application layer validates the request and constructs a database query with the user's authentication context, the database checks the row-level security policies against the user's identity, the database returns the allowed data, the application layer formats the data for the response, the frontend receives the response and updates what the user sees on the page.

This architecture is what allows a platform to have many pages, many roles, and many data types while still keeping every user's data isolated from every other user. The page you see is the result of the rules in the database deciding what you are allowed to see, applied through the application layer, rendered into the frontend.

### Where pages map to database operations

Every page on the platform is fundamentally a combination of database read operations (to display data) and database write operations (when the user takes an action). The product detail page reads the product, the seller, and the reviews. The request submission page writes a new order row. The orders dashboard reads all the orders belonging to the seller. The order status advance writes an update to the order's status field.

Understanding this mapping makes it clearer why some changes are easy and some are hard. Adding a new field to a page is easy if the field already exists in the database; it is harder if the field needs to be added (requiring a schema migration) and harder still if the field needs row-level security policies updated. Changes that ripple through the database often require coordinated changes across the application layer and the frontend; changes that are purely visual can usually happen in the frontend alone.

### The notification system

Alongside the page-and-query architecture, most platforms have a notification system that sends emails, SMS messages, or push notifications when certain events happen. When a buyer submits a request, the seller is notified by email. When a seller accepts a request, the buyer is notified. When a freelancer responds to a job post, the consumer is notified. These notifications are triggered by database events — typically by triggers that fire when a row is inserted or updated — and they handle the asynchronous communication that page interactions cannot.

### The search index

For platforms with search, the search functionality typically does not query the main database directly because main-database queries are too slow for full-text search across many records. Instead, the platform maintains a search index (often in a service like Algolia, Meilisearch, or PostgreSQL's full-text search features) that is updated whenever the underlying data changes. The search page queries the index, not the main database, which is why search results are fast even on large catalogs.

### The storage system

For platforms with uploaded images (product photos, profile pictures, banners), the images are stored in a separate storage system rather than in the main database. The database stores the URL or path to each image; the storage system stores the image bytes. This separation lets the storage system scale independently of the database and lets images be served through a content delivery network without going through the application layer on every page load.

## How the pages connect to one another — the journey view

The pages above are listed by zone, but users do not navigate them by zone. Users follow journeys that cross zone boundaries — a consumer journey starts in the public surface, passes through authentication, enters the discovery layer, completes a transaction, and ends in the user account zone where they track what they ordered.

A typical buyer journey runs: landing page → signup → homepage → category browse or search → product detail → request page → confirmation page → my requests page (immediately after) → my requests page (returning days later to check status). A typical seller journey runs: landing page → signup → onboarding to seller role → create shop → add products → seller dashboard → orders received as buyers request items → advance the lifecycle stages → see the shop public page as buyers see it. A typical service-provider journey runs similarly but with services instead of products and with the job board added as a secondary discovery surface for incoming work.

These journeys are what the platform should be designed around. The pages exist to serve the journeys, not the other way around. A page that does not fit into any user's journey is a page that does not need to exist.

## Closing — How to use this document

This document is meant to be returned to whenever a new page is being designed, an existing page is being audited, or a question arises about whether a platform has what it needs. The page inventory above is comprehensive enough that a small platform can use it as a checklist; an established platform can use it as a sanity check against what they have built.

Not every platform needs every page. A platform with no job-posting feature does not need the job board, the job detail page, or the job response form. A platform with no in-app messaging does not need the messages page or the inbox. A platform that handles payment outside the system does not need the checkout page in the in-app-payment sense. The point of the inventory is not to argue every page must exist; the point is to make clear what exists in the universe of platform pages so a deliberate choice can be made about each one.

The element lists within each page are similarly comprehensive but not prescriptive. The specific elements a platform needs depend on its specific data model, its specific user roles, and its specific transaction model. The element lists describe what the literature says belongs on each page type in general; the platform-specific decisions are about which of those elements apply to this particular platform.

What is consistent across all platforms is the architectural layering — database, authentication, application, frontend — and the way pages map to database operations through that stack. Understanding that architecture is the foundation that makes every other design decision tractable.

— End of document.
