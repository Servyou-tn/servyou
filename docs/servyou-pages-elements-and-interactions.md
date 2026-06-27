# SERVYOU PAGE-AND-ELEMENT REFERENCE — EVERY SURFACE, EVERY INTERACTION

This document is the Servyou-specific companion to `platform-pages-and-system.md`. Where that document describes what marketplace platforms in general contain, this one describes what *Servyou* contains — page by page, element by element, button by button, click by click — with the interaction standards that apply across all of them.

It exists for one reason: when a session needs to build, audit, or modify a page, this document tells the session what belongs on that page, how the elements should behave, and what standards every clickable, tappable, swipeable element on the platform should follow. It is the source of truth for the surface — what users actually see and touch — sitting alongside `data-model.md` (the database source of truth) and `architecture.md` (the stack source of truth).

The document is written in prose because the standards are connected. A button's loading state depends on the form validation it sits inside; a form's validation patterns depend on the inline-error spacing the design system provides; the inline-error spacing depends on the eight-point grid the typography is built on. Treating these as a checklist of isolated rules would miss the connections that make the system work as a whole. Treat this as a reference; read it end-to-end the first time, return to specific sections as work demands.

A note on what this document does not do: it does not pick specific colors, specific fonts, or specific visual styling for elements. Those decisions belong to the brand-identity and design-system work, sequenced after the engine and functions are complete. What this document captures is the *structural* and *behavioral* layer — what each page contains, what each element does, how each interaction should feel — independent of which colors and typography eventually clothe them. When the design system arrives, it will be applied to the surfaces this document inventories.

---

## Part I — The complete Servyou page inventory

Servyou at MVP launch will have approximately **62 distinct pages** organized into 11 functional zones. Some are public (anyone can see them); some require authentication (logged-in users only); some are role-gated (only shop owners, only freelancers, only admins). The count includes pages that are currently shipped to production, pages in active development, and pages on the roadmap before public launch. Pages deliberately deferred to post-launch (the rating system, the in-platform payment flow, the buyer-detail-page elaborations of post-launch features) are not in this count.

The eleven zones, in the order a user would naturally encounter them:

**Zone A — Public marketing surface (10 pages)**. Landing, About, Contact, FAQ, Terms of Service, Privacy Policy, Cookie Policy, Accessibility Statement, 404, 500.

**Zone B — Authentication flow (5 pages)**. Signup, Signin, Email Verification confirmation, Password Reset Request, New Password Setup.

**Zone C — Discovery and browsing layer (3 pages + dynamic variants)**. Search results, Category browse, City filter. Each can be combined with the others through URL parameters; conceptually they are three distinct surfaces.

**Zone D — Public detail pages (4 pages)**. Product detail, Service detail, Public shop page, Public freelancer profile.

**Zone E — Buyer transaction layer (4 pages)**. Request submission form, Request confirmation, My Requests list, My Request detail.

**Zone F — Buyer favorites and job posting (4 pages)**. My Favorites, Post a Job, My Job Posts list, My Job Post detail with responses.

**Zone G — Shop owner workspace (9 pages)**. Become a Shop Owner, Shop creation, Shop edit, Shop owner dashboard, Products list, Add product, Edit product, Orders received list, Order detail (seller view).

**Zone H — Freelancer workspace (11 pages)**. Become a Freelancer, Profile creation, Profile edit, Freelancer dashboard, Services list, Add service, Edit service, Service orders received, Job board browse, Job board detail, My Job Responses list.

**Zone I — User account zone (3 pages)**. Profile edit, Settings, Notifications inbox (post-MVP but slot reserved).

**Zone J — Administrator dashboard (Phase 9, 8 pages)**. Admin overview, User management list, User detail, Content moderation (unified across shops/products/services/job posts), Reports queue, Report detail, Disputes resolution, Aggregate statistics.

**Zone K — System pages (1 page so far)**. Logout confirmation (more may be added: session-expired notice, account-disabled notice, maintenance page).

That is sixty-two pages, give or take a few that may be unified or split during implementation. Each one is detailed in the chapters below. The shipped status as of this writing is captured in `roadmap.md`; pages marked there as Phase 1-8 shipped are operational, Phase 9 admin pages are in active development, Phase 10 pages are the pre-launch polish work.

The page count is large but not unusual for a marketplace platform — Etsy's public surface alone is hundreds of distinct page templates if route variations are counted. What matters for Servyou at MVP is that each of the sixty-two pages above does one thing well, fits into a coherent journey for the user role it serves, and follows the universal interaction standards in Part II.

---

## Part II — The universal interaction standards

The standards in this section apply to every page in Servyou. They are the operating system on which the specific page content sits. When a new page is being built and a question arises about how a button should behave, how a form should validate, how an error should display — this section is the answer, and the specific page content in Parts III through XII does not override these standards unless explicitly noted.

### The button standard

Every button on Servyou must implement six states. Anything less breaks the user's trust at the moment when feedback matters most. The states are:

**Enabled.** The default appearance. The button is interactive and ready to be activated. Visual treatment: solid fill for primary actions, outline or muted fill for secondary, text-only for tertiary. The label is specific to the action ("Enregistrer les modifications" not "OK"; "Confirmer la réception" not "Valider"; "Supprimer ce produit" not "Confirmer").

**Hover (desktop only).** When the cursor enters the button's bounding box on a non-touch device. Visual treatment: slight darkening of fill (around 8-12% darker), or slight lightening for secondary buttons on dark backgrounds. The cursor changes to `pointer` (this should be automatic for `<button>` elements). On mobile this state does not exist — there is no hover on touch devices.

**Focus.** When the button receives keyboard focus (tab navigation) or has been clicked but not yet released. Visual treatment: a visible focus ring around the button, distinct from the hover state, with at least 3:1 contrast against the surrounding background. The focus ring is non-negotiable for accessibility (WCAG 2.4.7), and removing the default browser outline without providing a custom replacement is a serious accessibility failure. Servyou's focus ring should be the same color across all buttons for visual consistency; the specific color is a design-system decision but the ring itself is universal.

**Pressed (active).** When the button is being clicked or tapped — the moment between mousedown and mouseup, or between touchstart and touchend. Visual treatment: a momentary visual change (further darkening, slight inset shadow, or a tiny scale-down to 0.98). This is what gives users the felt sense that their click registered. Without it, repeated clicks happen because the user is unsure the first one worked.

**Disabled.** When the button cannot currently be activated. Visual treatment: reduced opacity (around 50%), the cursor changes to `not-allowed`, and the button does not respond to clicks. Critically, a disabled button must communicate *why* it is disabled — either through a tooltip on hover (desktop) or through accompanying text near the button (mobile). A disabled submit button next to a form should be accompanied by inline validation messages that tell the user what they need to fix; a disabled "Confirmer la réception" button next to an order that is not yet `arrived` should have a small helper text saying "Disponible lorsque la commande arrive" so the user understands the condition.

**Loading.** When the button has been activated and the resulting action is in progress. Visual treatment: the button remains the same size and shape (no layout shift), the label changes to a verb-form indicating progress ("Enregistrement..." instead of "Enregistrer"), a small spinner appears inline with the label, and the button is non-interactive (further clicks have no effect). The loading state must appear within 100ms of the click — anything later and the user has already begun to wonder if the click worked.

The visual hierarchy of buttons follows three levels. **Primary** is the one most-important action on the page or in the section. Only one primary button per decision point; if a section has two equally-important actions, neither is primary, both are secondary, and the user is asked to choose. The primary button is visually the most prominent element in its section — bold fill, high contrast, larger size than secondary actions. **Secondary** is a supporting action that does not commit the user to anything destructive or irreversible. Visual treatment: outline or muted fill. Multiple secondary buttons in a section are acceptable. **Tertiary** is a low-priority action, typically text-only or with an underline, often used for "Cancel" links inside modals or for navigation away from a form without saving.

**Destructive buttons** (delete, cancel-an-active-order, remove-a-user) get their own visual treatment that signals risk. The convention is a red or red-tinted fill, but the rule that color is never the only differentiator means destructive buttons should also carry an icon (trash can, warning sign) and explicit destructive language in their label ("Supprimer définitivement", not just "Supprimer"). Destructive actions that are irreversible require a confirmation modal — never a single-click destruction. The confirmation modal asks the user to type the name of what they are deleting, or at minimum to click a second button labeled with the destructive verb.

The accessibility rules for buttons are non-negotiable: 4.5:1 text-to-button contrast ratio, 3:1 button-to-background contrast ratio, 44×44 pixel minimum touch target on mobile (WCAG 2.2 stricter than 2.1), visible focus state, never `color alone` as the differentiator (always pair color with shape, icon, or text change). Use `<button>` for actions and `<a href>` for navigation; mixing the two creates unpredictable keyboard behavior and screen reader confusion. An action that triggers a form submission or a state change is a button; a link that takes the user to another page is an anchor.

### The form standard

Every form on Servyou follows the same validation and feedback pattern. The pattern is calibrated for mobile users with 4G connections and varying typing speeds, because that is the majority of Servyou's expected traffic.

**Inline validation triggers on field blur, not on every keystroke.** When the user leaves a field (tabs out, taps another field, or submits the form), the field's validity is checked. Real-time per-keystroke validation feels aggressive and interrupts the user's typing flow; blur-time validation matches the user's mental break between fields. The exception is password strength indicators, which are useful in real-time because the user benefits from seeing their progress toward a strong password.

**Error messages appear directly beneath the field that has the problem.** Not at the top of the form. Not in a banner. Right beneath the field, with the message text indented to align with the field label, in a clear error color (typically red), with an error icon to satisfy the color-isn't-sufficient rule. The message text is specific: "Le numéro de téléphone doit avoir 8 chiffres" tells the user what to fix; "Erreur dans ce champ" does not.

**The submit button stays enabled until the user attempts to submit.** Disabling the submit button while the form is incomplete prevents the user from triggering the validation that would tell them what is missing. The submit button is always enabled (or shows its disabled state with a clear reason); the act of submitting triggers the form-wide validation that reveals all errors at once if any exist.

**Mobile keyboard types are explicit on every input.** Email fields use `type="email"` to trigger the @-key keyboard. Phone fields use `type="tel"` to trigger the numeric keyboard. Number fields use `type="number"` or `inputMode="numeric"`. Default keyboards on text fields where the user will be writing French or Arabic text. Each input field also has an `autocomplete` attribute set appropriately — `name`, `email`, `tel`, `street-address`, `postal-code` — so browser autofill can populate fields the user has filled before on other sites.

**Field labels are visible at all times.** The pattern of placeholder-text-as-label (where the label disappears once the user starts typing) is forbidden. Labels appear above their fields, visible permanently, in a weight and size that scans as labels not body text. Placeholder text inside the field, if used, shows an example of what to type ("ex: ahmed@example.com") in a muted color.

**Required fields are marked.** A red asterisk after the label is the standard convention, with an explanation at the top of the form ("Les champs marqués d'un astérisque sont obligatoires"). Optional fields can be marked as "(optionnel)" in muted text after the label for clarity.

**Error states are recoverable.** When a user submits a form with errors and the page re-renders to show them, the previously-entered values are preserved. Forcing a user to re-type a long product description because they forgot to fill the price field is the kind of failure that breaks trust.

**Forms that take more than thirty seconds get progress indicators.** The shop creation form, the product addition form, and the freelancer profile form all qualify. The progress indicator can be a step counter at the top ("Étape 2 sur 4"), or a section heading that tracks where the user is, or a scroll-position indicator on long single-page forms.

### The mobile interaction standard

Mobile is the dominant surface for Servyou's expected users. Every page must be designed and verified on a mobile viewport (375-414px wide) before it is considered shippable, not the other way around. The desktop layout is the elaboration of the mobile layout, not the other way.

**Touch targets are at least 44×44 pixels.** This is the WCAG 2.2 stricter rule, and it applies to every clickable element on mobile — buttons, links, form controls, navigation items, swipe handles. Adequate spacing between targets is at least 8 pixels; targets that touch each other cause mis-taps. High-frequency actions (the primary CTA, the "Add to favorites" heart, the order-status-advance button) deserve larger targets, around 48-56 pixels, to feel comfortable.

**One-handed reachability matters.** Research shows that 49% of mobile users hold their phone with one hand, 67% with the thumb doing most of the work. The bottom half of the screen is the thumb-comfortable zone; the top of the screen requires either a stretch or a hand-shift. The primary CTA on action pages (request submission, signin, signup) belongs in the bottom-comfortable zone; the navigation and search are top-screen elements that the user accepts requires a stretch.

**Swipe is an expected pattern for image galleries and carousels.** The product detail page's image gallery on mobile uses horizontal swipe with a visual indicator (small dots or a counter) showing how many images exist. Touch gestures should not conflict with the platform's native gestures (the OS-level swipe-from-edge that goes back, for instance) — Servyou's swipe areas should not start within 20 pixels of the screen edge.

**Vertical stacking is the natural mobile layout.** Two-column layouts that work on desktop should stack into one column on mobile, with the order of stacking matching the user's expected reading sequence. For a product detail page on mobile, the order is: image gallery → title and price → variant selector if any → primary CTA → description → reviews. The "Add to favorites" button is positioned in the upper-right of the image gallery for thumb-comfortable one-handed tapping.

**Collapse secondary information into accordions.** A product's full specifications, shipping details, return policy, and seller policies are useful to some buyers but distracting to most. Accordions that default closed and expand on tap keep the initial view focused while preserving access to the information for those who need it.

**Page-load performance is part of the interaction.** A mobile page that takes seven seconds to load on a Tunisian 4G connection has failed before any of its elements get a chance to convert. The target is under three seconds on a 4G connection in Tunis, with the hero content visible in under one second. This is achieved through aggressive image optimization, code splitting at the route boundary, and avoiding render-blocking third-party scripts. The Lighthouse mobile performance score for every page should be above 80; this is a Phase 10 polish gate.

### The RTL and bilingual standard

Servyou ships in French at MVP launch with Arabic translations sequenced as Phase 8 subtask 3. The architecture is already set up for both: the `<html dir="rtl">` attribute switches automatically when the language is Arabic, and Tailwind's logical properties handle most of the layout flipping. What this standard codifies is the discipline that ensures the Arabic version works as well as the French version, not as an afterthought.

**Use logical properties, not directional ones.** `ps-4` (padding-inline-start, which becomes padding-left in LTR and padding-right in RTL) instead of `pl-4`. `me-2` (margin-inline-end) instead of `mr-2`. `start-0` and `end-0` instead of `left-0` and `right-0`. Borders, rounded corners, and absolute positioning all have logical variants. The legacy directional properties are forbidden in new code; existing directional properties get replaced during the Arabic-translation pass.

**Navigation and primary actions flip side.** In French mode, the navigation menu opens from the left and the primary CTA in the hero sits on the left side of two-column layouts. In Arabic mode, both flip to the right. This is mostly automatic through logical properties, but mental models should match.

**Text expansion is real.** Arabic text takes approximately 20% more horizontal space than equivalent French text. Buttons sized tightly for French labels will visually break in Arabic. The discipline: every button is set to size to its content with a comfortable minimum width that accommodates the longer Arabic translation, never a fixed pixel width.

**Direction-aware icons.** Arrows pointing forward (in a "next step" arrow or a "view more" chevron) point right in French and left in Arabic. Servyou's icon system should either have direction-aware versions or use a single mirrored icon that flips with the `[dir="rtl"]` selector.

**Numbers and dates stay in their conventional form.** Even in Arabic mode, numbers (8 chiffres, 50 TND) typically remain in Western Arabic numerals (0-9), not Eastern Arabic numerals (٠-٩), because the Tunisian convention is Western Arabic numerals in everyday use. Dates follow Tunisian conventions in both languages.

### The loading and feedback standard

Users interpret silence as failure. Every action that takes more than 100 milliseconds must produce visible feedback within that window, and every action that takes more than 300 milliseconds must show an explicit loading indicator.

**Sub-100ms responses feel instant.** No loading state is needed; the result simply appears. Fetching a cached value, toggling a local UI state, navigating to a pre-fetched route — these all qualify.

**100-300ms responses need a small acknowledgment.** A button's pressed state during this window is usually sufficient; the user sees that their click registered and the next state appears before they have time to wonder. Adding an explicit spinner in this window is over-feedback that interrupts the user's flow.

**300ms-1s responses require an explicit indicator.** A button loading state, a skeleton screen for the area that is being populated, a "Chargement..." text inline with the action. The user sees that something is happening and that the system has not crashed.

**>1s responses require a progress indicator with information.** Not just "loading", but "Téléchargement de votre image..." or "Enregistrement de votre boutique...". The user understands what the system is doing and can decide whether to wait or do something else.

**Skeleton screens beat spinners.** When a page or section is being populated, showing a skeleton (gray rectangles where text and images will be) gives the user a sense of what is coming and reduces the felt waiting time. Spinners in the middle of empty space are the older pattern; skeleton screens are the contemporary one.

**Empty states are designed, not defaulted.** When a buyer's "My Requests" page has zero requests, the page does not show a blank table. It shows a friendly illustration or icon, an explanatory message ("Vous n'avez pas encore fait de demande. Parcourez la marketplace pour trouver ce que vous cherchez."), and a primary CTA pointing to the action that would populate the page ("Parcourir la marketplace"). Every list page in Servyou has a designed empty state.

**Toast notifications confirm successful actions.** When a user saves a product, favorites a service, accepts an order, or any other action that completes successfully, a toast notification appears briefly (around 3 seconds) in the corner of the screen with the success message. The toast is not modal — the user can keep working. Failed actions produce a similar toast in an error color with the specific failure message.

**Optimistic updates where safe.** When the user toggles a favorite, the UI updates immediately to show the heart filled, while the database write happens in the background. If the write fails, the UI reverts and a toast explains. This makes the platform feel responsive even on slow connections. Optimistic updates are safe for low-stakes operations (favorites, marking a notification read); they are not safe for high-stakes operations (placing an order, advancing an order's status), where the user must see the confirmed result.

### The navigation standard

**The header is sticky on every page.** It contains, from left to right (or right to left in Arabic): the Servyou logo (clickable, returns to home), the primary navigation menu items, a search bar (or a search icon that expands to a bar on mobile), a notifications bell (post-MVP), the user's avatar with a dropdown menu, and the language toggle. On mobile, the navigation collapses behind a hamburger icon; the logo and search remain visible. The header is around 64px tall on desktop and 56px on mobile.

**The footer appears on every page.** It contains the secondary navigation (About, Contact, FAQ), the legal links (Terms, Privacy, Cookies, Accessibility), the social media links, the language toggle (duplicated from header), and the copyright notice. The footer is around 240px tall on desktop and adapts on mobile. Background color is muted relative to the page content.

**Breadcrumbs appear on interior pages.** Product detail, service detail, category browse, and admin sub-pages all have breadcrumbs at the top of the content area (below the header but above the page title). Each crumb is a link to the corresponding parent page; the current page is the last crumb, in a non-link weight, indicating where the user is.

**The back button is the user's escape.** Every page must work correctly when the user clicks the browser's back button — no broken intermediate states, no lost form data, no infinite redirect loops. This sounds trivial but breaks easily with naive implementations of authentication redirects and form submissions.

### The error and edge case standard

Servyou will encounter every possible edge case in production. The discipline that prevents these from becoming crisis moments is designing for them deliberately.

**Server errors return the user to a usable state.** When a server action fails with a database error, a network timeout, or an unhandled exception, the user sees a French message in a toast or inline alert, not a stack trace, not a blank page, not an English error string. The fallback message is acceptable ("Une erreur s'est produite. Veuillez réessayer.") when the specific cause cannot be communicated; the application logs the actual error for Moatez to investigate.

**Permission denied states are handled gracefully.** When a buyer tries to access a seller-only page, when a freelancer tries to access an admin page, when an anonymous user tries to access a logged-in page, the response is a clear French message explaining what they need to do (log in, become a seller, contact admin) — not a 403 error code.

**Stale data is acknowledged.** When a dashboard's count is shown from a cache that updates every minute, the page shows a small "Mis à jour il y a X secondes" timestamp so the user understands the freshness. When a list might have grown since the page loaded, a "Voir les nouvelles entrées" button appears at the top to refresh.

**Concurrent edit conflicts are surfaced.** If two browser tabs are open to the same edit form and one is saved before the other, the second tab's save should detect the conflict and ask the user what to do. At MVP scale this is rare enough that a simple "Cette ressource a été modifiée depuis le chargement de la page. Veuillez rafraîchir et réessayer." message is sufficient; more sophisticated conflict resolution belongs to a later phase.

**Offline detection is friendly.** When the user's connection drops mid-session, the platform detects the offline state (via the `navigator.onLine` API) and shows a small banner at the top of the page indicating that they are offline. Actions queued during the offline period can be retried when the connection returns; this is a Phase 10 polish for now, but the banner alone makes the offline state visible.

---

## Part III — Page-by-page: the public marketing surface

### A.1 — Landing page (`/`)

The single most consequential page on the platform in marketing terms. It is the destination of every social media link a seller puts in their bio, every paid acquisition click when paid traffic begins, every organic search arrival, and every word-of-mouth share. The strategic frame for the landing page is captured in `servyou-pre-launch-strategic-reference.md`; this section captures the structural elements.

**Above the fold (hero section):**

The Servyou logo and primary navigation in the header (sticky, but the landing page may want the header transparent over the hero for visual impact). The language toggle in the upper right of the header, visible on day one because a visitor arriving in the wrong language must be able to fix it without scrolling.

The hero headline: under 8 words, naming the outcome the visitor wants in their own language. Specific candidates remain Moatez's brand-voice decision. The headline is the largest typography on the page, weight at least 700, sized roughly 36-44px on mobile and 56-72px on desktop.

The hero subheadline: one sentence expanding the headline, around 20-30 words, sized roughly 16-18px on mobile and 18-22px on desktop. This is where the Tunisian-specific positioning (dinars, COD, French and Arabic, governorates) gets articulated.

The primary call-to-action button: one button, one verb, sized as a large primary button (around 56px tall, comfortable touch target). The label is action-oriented: "Créer un compte gratuit" or "Commencer". On the hero, the button sits below the subheadline with comfortable whitespace around it.

The hero visual: a story-driven illustration or animation that demonstrates the platform's transformation value — scattered messaging apps consolidating into one Servyou dashboard, or a hand-written order notebook dissolving into the orders dashboard, or similar. The visual is intentional; at launch a static illustration is acceptable while the animated version is being developed.

A thin band of trust indicators below the hero: "24 governorates served" / "14 categories" / "0% commission at launch" / "Data hosted in Europe". These are honest day-one signals that build credibility without manufacturing false social proof.

**Below the fold:**

The three-benefits section: three cards or three rows describing the Tunisian-first positioning, the honest pricing posture, and the data privacy commitment. Each benefit has a one-word claim, a short paragraph, and a supporting icon. Layout: three columns on desktop, stacked vertically on mobile.

The three user-journey sections: one section per role (consumer, shop owner, freelancer), each with a two-sentence description, a screenshot or illustration of the corresponding product surface, and a "Learn more" link to a fuller explanation. Layout: alternating image-left/image-right on desktop, image-above-text on mobile.

The "how it works" section: a numbered list of three or four steps that describe a typical transaction on the platform. For consumers: find a product → request via WhatsApp → receive the product → confirm receipt. For sellers: post your shop → share the link → manage orders → get paid via COD. Layout: horizontal step row on desktop, vertical on mobile.

The FAQ section: 5-7 questions answering the trust concerns that hesitant visitors will have. Accordion pattern, defaults all closed, expand on tap. Questions cover: how Servyou prevents scams, what happens if a product is wrong, whether Servyou takes a commission (no, at launch), whether data is sold to third parties (no, ever), why French and Arabic but not English (yet).

The closing section: the primary CTA repeated, a single emotional line in the founder's voice, and a footer-leading visual transition.

**The footer** (universal, see Part II navigation standard).

**Interactions on the landing page:**

The primary CTA click navigates to `/inscription` (the signup page). If the visitor is already logged in (detected by the auth session), it instead navigates to their relevant logged-in homepage (consumer homepage, shop owner dashboard, or freelancer dashboard, depending on role).

The language toggle click switches between French and Arabic, persists the choice to a cookie, reloads the page with the new direction (`dir="rtl"` for Arabic), and adjusts all logical-property-based styling.

The "Learn more" links in the user-journey sections navigate to dedicated sections of the About page or to placeholder anchors within the landing page itself.

The FAQ accordion clicks expand the relevant question's answer. Only one open at a time is the friendly default (clicking a closed question collapses any others), but multiple-open is also acceptable. Smooth expansion animation, around 200ms.

The header search bar (if shown on the landing page) navigates to `/recherche?q=` with the query string when submitted. Mobile shows a search icon that expands to a full-width search bar when tapped.

**Mobile adaptations:**

The hero stacks vertically: headline → subheadline → CTA → visual (smaller and positioned below the CTA on mobile, not beside it). The primary CTA sits within the first phone-screen height so it never requires a scroll.

The navigation collapses to a hamburger icon. Tapping the hamburger opens a full-screen menu overlay with the navigation links, the language toggle, and a close button.

The three-benefits section stacks into a vertical card list. Each benefit card is full-width minus the page padding.

The FAQ accordion remains the same pattern but with slightly larger touch targets for the question headers (at least 56px tall).

### A.2 — About page (`/a-propos`)

The page that converts visitors who want to feel emotionally connected to the platform's mission. Structure:

**The headline section**: a single line capturing the mission ("Une vraie maison pour l'économie tunisienne" or whichever phrasing Moatez chooses).

**The story section**: 3-5 paragraphs covering who built Servyou (Moatez, learning to code as he built it, with AI-assisted development acknowledged honestly), why it was built (the Tunisian gap, the foreign-platform exit, the founding insight), and the timeline of the journey.

**The values section**: the three core values from `product.md` — protecting users, honesty about money, genuinely Tunisian — each with a one-paragraph explanation.

**The team section**: a photograph of Moatez (if he chooses to be public-facing) with a brief bio. If Moatez prefers to remain less visible, this section can be omitted or replaced with a "What we believe" elaboration.

**The closing CTA**: a button that takes the visitor either to signup or to contact, depending on what made them visit the About page.

Interactions are minimal: scroll through the page, click the CTA, navigate away. No forms, no complex state.

### A.3 — Contact page (`/contact`)

The page that gives visitors ways to reach the team. Elements:

The primary contact email, displayed as text and as a `mailto:` link, with the expected response time shown clearly ("Nous répondons généralement sous 24 à 48 heures").

A contact form for visitors who prefer that channel. Fields: name (required), email (required), subject (optional dropdown), message (required, with character counter showing remaining characters out of 2000). Submit button labeled "Envoyer le message" with the loading state and the success toast on completion.

The social media links if Servyou has active accounts (Instagram, Facebook).

A WhatsApp link for direct contact, prominent because Tunisian users expect to reach a human via WhatsApp.

The legal entity name and address required by Tunisian commerce regulation.

The Servyou physical address if one is established (this may be omitted at MVP if Moatez works from home and prefers not to publish).

**Interactions:**

The form submission triggers inline validation (email field must be valid email, message must be at least 10 characters). On submit, the form button shows the loading state, the server action creates a record in a `contact_messages` table (a Phase 10 addition; at MVP, the form can send an email to Moatez via a transactional email service or even a simple `mailto:` with a pre-filled subject and body), and on success the form is replaced with a thank-you message and a "Send another message" link.

### A.4 — FAQ page (`/faq`)

A comprehensive set of answers to questions visitors will have. Grouped by category (Account, Buying, Selling, Job posting, Payments, Privacy, Disputes). Each question uses the same accordion pattern as the landing page FAQ but with more questions per category.

The page also has a search bar at the top that filters questions in real-time as the user types. This is a small interaction but improves the page significantly for users who arrive with a specific question.

A "Did this answer your question?" feedback prompt at the bottom of each expanded answer, with thumbs-up and thumbs-down buttons. The thumbs-down opens a small text field for the user to explain what was missing; this feedback feeds into Moatez's understanding of where the FAQ has gaps.

### A.5 — Terms of Service (`/conditions`)

The legally-reviewed terms covering Servyou's relationship with its users. Plain language, organized by section headings, with a table of contents at the top that lets readers jump to relevant sections. The page is dense by necessity but should never read as machine-generated; the Tunisian lawyer review captured in `servyou-pre-launch-strategic-reference.md` produces the readable, defensible version.

Interactions are minimal: scroll, click section headings in the table of contents, navigate away. The "Print this page" link in the footer is a small courtesy for users who want a paper copy.

### A.6 — Privacy Policy (`/confidentialite`)

The page that articulates Servyou's privacy posture — what data is collected, why, where it lives (EU/Frankfurt), what rights users have. Same structural pattern as Terms of Service: section headings, table of contents, plain language.

### A.7 — Cookie Policy (`/cookies`)

The page that discloses what cookies are set and what each does. At MVP this is short — Servyou sets the Supabase Auth session cookie and possibly anonymized Vercel analytics. The page is honest about how few cookies are set, which is itself a trust signal.

Paired with the page is the cookie consent banner that appears on first visit. The banner offers three buttons: "Accepter tout", "Refuser tout", and "Personnaliser". The customize option opens a small modal listing each cookie category with toggles. The user's choice persists to a cookie that prevents the banner from reappearing.

### A.8 — Accessibility Statement (`/accessibilite`)

The page declaring Servyou's commitment to WCAG 2.2 Level AA. It names what has been done (keyboard navigation across all critical flows, color contrast verified, touch targets ≥44×44 pixels, screen reader labels), acknowledges what is in progress (full Arabic-mode screen reader testing, user-generated content accessibility), and provides a contact method for accessibility issues.

### A.9 — 404 page

When a user lands on a URL that does not exist, the 404 page should not be a dead end. Elements:

A clear visual indicator (illustration, large "404" number, or warm graphic) that something is missing.

A friendly French message: "Cette page n'existe pas ou a été déplacée." Followed by suggestions of what the user might do.

A search bar to find what they were looking for.

Quick links to: the homepage, the main categories, the user's logged-in homepage if logged in.

The header and footer remain present so the user can navigate via the normal site structure.

### A.10 — 500 page

When a server error occurs that the application cannot handle, the 500 page apologizes briefly and offers a retry. Elements:

A clear visual indicator that something went wrong on Servyou's side, not the user's.

A French message: "Une erreur s'est produite de notre côté. Nous travaillons à le résoudre." The Sentry error ID (Phase 10) can be shown so users who contact support can reference it.

A retry button that re-attempts the request.

A "Return to homepage" link as a safe fallback.

The header and footer remain present. The error is logged to Sentry (Phase 10) with the request context, so Moatez can investigate.

---

## Part IV — Page-by-page: the authentication flow

### B.1 — Signup page (`/inscription`)

The page that converts a visitor into a registered user. Friction is the enemy here; every additional field reduces conversion. Servyou's required fields at signup are:

Email (required, type="email", with inline validation that the format is valid)
Password (required, with show/hide toggle, with a strength indicator that updates as the user types — this is one of the few cases where real-time validation is welcome)
Full name (required)
Date of birth (required, used for the 16+/18+ age rule)

Below the form fields, a small block of legal acknowledgment: "En créant un compte, vous acceptez nos [Conditions d'utilisation] et notre [Politique de confidentialité]." with the bracketed terms as links.

A primary submit button labeled "Créer mon compte". The button enters the loading state on click, the server action creates the user via Supabase Auth, sends the verification email, and redirects to a "verify your email" page.

Below the submit button, a secondary link: "J'ai déjà un compte" → navigates to `/connexion`.

**Validation rules:**

Email format must be valid (the standard regex applied via `type="email"` browser validation, plus a server-side check that the email is not already registered).

Password must be at least 8 characters, contain at least one letter and one number (the standard minimum for a marketplace platform; stricter rules feel paternalistic and reduce signup conversion).

Full name must be at least 2 characters and at most 100.

Date of birth must result in an age of at least 16 (the universal buying minimum per `product.md`).

If any field fails validation, the inline error appears beneath that field, the submit button returns to its enabled state (the action did not actually attempt to create the account), and focus moves to the first errored field.

**Phase 10 addition:** Cloudflare Turnstile widget appears above the submit button. The server action validates the Turnstile token before creating the account; a missing or invalid token returns a clear error message.

### B.2 — Signin page (`/connexion`)

Simpler than signup. Fields:

Email (required, type="email")
Password (required, with show/hide toggle)

A primary submit button labeled "Se connecter" with the loading state.

A "Mot de passe oublié?" link navigates to `/reinitialiser-mot-de-passe`.

A "Pas encore de compte? Créer un compte" link at the bottom navigates to `/inscription`.

**Phase 10 addition:** Turnstile widget above submit, same pattern as signup.

**Validation:** if the email or password is wrong, the inline error is generic ("Email ou mot de passe incorrect") to avoid giving an attacker information about which accounts exist. The error appears below the form, not beneath individual fields, since either could be the cause.

**On success:** the server action establishes the session and redirects to the user's appropriate landing page based on their role: consumers go to `/`, shop owners go to `/ma-boutique`, freelancers go to `/mon-profil-freelance`. Users who were trying to access a protected page before signin are redirected to that page after signin (via a `?redirect=` query parameter).

### B.3 — Email verification page (`/verifier-email`)

The page shown after signup or after a verification link click. Three states:

**State 1 — Just signed up.** The user just created an account and hasn't clicked the verification link yet. The page shows: "Nous vous avons envoyé un email à [user's email]. Cliquez sur le lien dans cet email pour activer votre compte." A "Renvoyer l'email" button is available with a 30-second cooldown to prevent spam.

**State 2 — Just clicked the verification link.** The user clicked the link in their email and arrived here with a verification token. The page shows the loading state briefly while the token is validated, then shows: "Votre email a été vérifié! Bienvenue sur Servyou." A primary CTA appears: "Continuer" → navigates to `/` or to the user's role-appropriate landing page.

**State 3 — Verification failed.** The token was invalid or expired. The page shows: "Le lien de vérification est invalide ou a expiré." A "Renvoyer un email de vérification" button is available.

### B.4 — Password reset request (`/reinitialiser-mot-de-passe`)

A single-field form. Fields:

Email (required, type="email")

Submit button labeled "Envoyer le lien de réinitialisation".

On submit: the server action calls Supabase Auth's password reset, which sends an email if the address exists in the database. Critically, the response to the user is the same whether the email exists or not — "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation." — to avoid revealing which emails are registered.

### B.5 — New password setup (`/nouveau-mot-de-passe`)

The page reached by clicking the reset link in the email. Fields:

New password (required, with show/hide toggle and strength indicator)
Confirm new password (required, must match)

Submit button labeled "Réinitialiser mon mot de passe".

On success: the user is redirected to `/connexion` with a success toast: "Mot de passe réinitialisé. Veuillez vous connecter."

If the reset token is invalid or expired, the page shows that error and offers a "Demander un nouveau lien" button.

---

## Part V — Page-by-page: the discovery and browsing layer

### C.1 — Search results page (`/recherche`)

Reached from the search bar in the header. The URL contains the search query as `?q=...` and optionally filter parameters as additional query strings.

**Elements:**

A search bar at the top of the content area, pre-populated with the current query, that the user can refine.

A results count: "X produits, Y services, Z boutiques, W freelances trouvés pour 'recherche'".

A filter sidebar (or top-bar on mobile that expands) with filter controls: category (multi-select), city (multi-select), price range (min and max), result type (products / services / shops / freelancers).

A sort control: most relevant (default), newest first, lowest price, highest rated (post-MVP when ratings exist).

The results grid: each result is a card showing a thumbnail, title, price (for products and services), seller or shop name, city, and a "save to favorites" heart in the upper-right of the thumbnail.

Pagination at the bottom: "Page 1 of 5" with previous/next arrows and direct page jumps. Infinite scroll is an alternative pattern but pagination is more SEO-friendly and easier to debug.

**Empty state:** when the search returns zero results, the page shows: "Aucun résultat pour 'recherche'." Followed by suggestions: spelling alternatives, related searches, popular categories.

**Interactions:**

Typing in the search bar updates the URL query parameter as the user types (debounced 300ms), so the back button works. Submitting executes the search.

Filter changes update the URL and re-fetch the results. The filter sidebar on mobile is hidden behind a "Filtres" button that expands a bottom-sheet or full-screen overlay.

Sort changes update the URL and re-fetch.

Clicking a result card navigates to the corresponding detail page (product, service, shop, or freelancer).

Clicking the heart on a result card toggles the favorite status. This is an optimistic update — the heart fills immediately, the database write happens in the background, the toast confirms success.

### C.2 — Category browse page (`/categories/[slug]`)

A category-scoped variant of the search results page. The URL is per-category (`/categories/montage-video`, `/categories/beaute`, etc.), and the page is restricted to listings in that category.

**Elements:**

A category title and description at the top (the description comes from the category record in the database).

Breadcrumbs: "Accueil > Catégories > [Category name]".

The same filter sidebar, sort control, and results grid as the search page.

Sub-category cards at the top of the results, if the category has children — a quick way to drill deeper.

### C.3 — City filter page (`/villes/[ville]`)

A city-scoped variant. Similar pattern to category browse but filtered by city.

---

## Part VI — Page-by-page: the public detail pages

### D.1 — Product detail page (`/produits/[id]`)

The single most important conversion page on the platform after the landing page. The page is where a buyer decides whether to commit to a request. Every element earns its place.

**Above the fold:**

The image gallery. On desktop, this is a large primary image on the left with a column of thumbnails on the right (or below the primary on smaller screens). Clicking a thumbnail swaps the primary. On mobile, the gallery is a swipeable horizontal carousel with a small counter ("1/5") at the bottom. Pinch-to-zoom on the primary image. Product imagery is the single most influential element; 67% of online shoppers cite image quality as the top factor in their buying decision, more than product descriptions, reviews, or pricing.

The product title (large, weight 600-700).

The price in TND, displayed prominently. If the product has a price range or variants, the range or the variant selector appears here.

The seller name with a small avatar (the shop name from the shops table), as a link to the public shop page.

The stock indicator (only shown when stock_count < 10 and tracks_stock = true): "Plus que X en stock". Live inventory counts work because they are verifiable.

The primary call-to-action button: "Demander ce produit" (`Request this product`). Large, prominent, the visually most prominent element below the price. On click, it navigates to the request form `/demander/[product-id]`.

A secondary action: a heart icon for "Save to favorites". Small, positioned in the upper-right of the image gallery on mobile, or beside the primary CTA on desktop.

A tertiary action: a share icon that opens a share dialog with copy-to-clipboard and social platform options.

**Below the fold:**

The full description text, organized into sections (the seller's prose, plus any structured specifications). Long descriptions are collapsed by default with a "Voir plus" link.

The shop information block: shop logo, shop name, shop city, a one-line shop description, "See all products from this shop" link.

The reviews section (post-MVP when reviews exist). At MVP, this section is empty or shows "Les avis seront bientôt disponibles."

Related products: a horizontal scrollable carousel of products from the same shop or the same category, each as a small card.

A "Signaler ce produit" link in muted text near the bottom — the report-this-content action.

**Mobile layout:**

The vertical stack is: image gallery → title and price → stock indicator if any → primary CTA → seller info → favorites/share row → description → related products → report link.

Pinch-to-zoom on images. Horizontal swipe between images. Tap and hold on the primary image opens it in a full-screen lightbox.

**Interactions:**

The "Demander ce produit" click checks if the user is authenticated. If yes, navigates to the request form. If no, opens a quick-signup modal or redirects to signup with a return URL.

The favorites heart click toggles the favorite status with optimistic update.

The share button opens a native share sheet on mobile (using the Web Share API), or a modal with social platform buttons and a copy-link button on desktop.

The "Signaler ce produit" click opens a modal with the report form: a dropdown of reasons (fake/scam, offensive, wrong category, other), a description text area, a submit button. Submission creates a row in the `reports` table.

Clicking the shop name or the shop info block navigates to the public shop page.

### D.2 — Service detail page (`/services/[id]`)

Similar structure to the product detail page but adapted for services. Differences:

The image gallery is replaced (or supplemented) by work samples (images and possibly short videos). The portfolio dimension matters more for services than for products.

The price is shown as a starting price ("À partir de X TND") or a range ("X-Y TND") rather than a fixed price.

The "Stock indicator" doesn't apply; instead, an "Availability" indicator can show the freelancer's current availability ("Disponible cette semaine" / "Délai de réponse: 24h" — these are post-MVP).

The delivery time is shown ("Délivré en 3-5 jours" or "Délivré en personne à Tunis").

The seller info block links to the freelancer's public profile rather than a shop.

The primary CTA is "Demander ce service" → navigates to the request form for the service.

The reviews section, when populated, shows reviews specific to this service and the freelancer.

### D.3 — Public shop page (`/boutique/[slug]`)

The public-facing storefront for a single shop. This is the page that a shop owner shares in their Instagram bio. It must work as a standalone landing for visitors who arrive without context.

**Elements:**

A banner image at the top of the page (the shop's banner_url).

The shop logo (logo_url) as an avatar, overlapping the banner.

The shop name as the main heading.

The shop city/governorate.

The shop description.

The configurable workspace fields if filled (shop type, delivery setup, working hours, location detail) — shown as small inline info bits in the header area.

The accepted payment methods as small chips below the description.

The category specialties as small chips.

A "Suivre cette boutique" button (post-MVP follow system) — for now, just a "Ajouter aux favoris" if Servyou favorites whole shops (per `data-model.md`, favorites are per-product/service, not per-shop, so this is omitted at MVP).

A "Partager cette boutique" button.

A "Signaler cette boutique" link in muted text.

The grid of all the shop's active products: each product as a card with image, title, price, "view details" link, and a favorites heart.

**Mobile layout:** the header info stacks vertically, the products grid is two columns or one column depending on screen width.

**Interactions:**

Clicking a product card navigates to the product detail page.

The share button opens the share dialog with the shop's public URL pre-filled.

The report button opens the report modal scoped to "shop" as the target type.

### D.4 — Public freelancer profile (`/freelance/[slug]`)

The freelancer equivalent of the public shop page. Elements:

A banner image at the top.

The freelancer's avatar photo.

The freelancer's full name and professional headline.

The city/governorate.

The bio text.

Skills as chips.

Configurable workspace fields if filled (working hours, current workplace, preferred payment method) — shown as small inline info bits.

Tools and software as chips (from the freelancer_tools child table).

Education entries as cards (from the freelancer_education child table), sorted newest first.

Certifications as cards (from the freelancer_certifications child table), with a "View credential" link if a credential URL is present.

Years of experience, languages spoken (from the scalar profile fields).

The portfolio link (external URL) if provided.

The work samples gallery if provided (from the service_media table on the freelancer's services, or a dedicated portfolio media table — `data-model.md` has the freelancer's portfolio via `service_media`).

The grid of all the freelancer's active service listings.

**Interactions:** same patterns as the public shop page, scoped to "freelancer_profile" for reports.

---

## Part VII — Page-by-page: the buyer transaction layer

### E.1 — Request submission form (`/demander/[product-id]` or `/demander/[service-id]`)

The form that collects the details needed to complete a Cash on Delivery request (for products) or a service request. Different flows for products vs services.

**For a product request:**

A summary block at the top showing what is being requested: product image, title, seller, total price.

Delivery details form fields:
- Full name of recipient (required, defaults to the user's profile full_name if present, but editable for orders shipping to someone else)
- Full address with all components: street/number, neighborhood, city, governorate (required)
- Phone number (required, type="tel", with format validation for Tunisian phones — 8 digits, can start with +216)
- Optional note from buyer to seller (text area, character counter)

A quantity selector if applicable (defaults to 1, can be incremented up to the stock count for stock-tracking products).

The order total recalculated as quantity changes.

A primary submit button labeled "Confirmer la demande" with the loading state.

A small note: "Paiement à la livraison. Aucune carte requise." — reinforcing the COD-default and the no-payment-on-platform reality.

**For a service request:**

Simpler form. Summary of the service, the freelancer, and the starting price.

Description text area for the buyer to explain their specific need (required).

Optional desired timeframe field.

Optional budget field (if different from the listed starting price).

A primary submit button labeled "Envoyer la demande".

**Interactions:**

The submit button triggers form validation. If all fields are valid, the server action creates an order row with status='pending', writes the relevant details, and redirects to the confirmation page.

If a field is invalid, inline errors appear, focus moves to the first errored field, the submit button returns to enabled.

**The WhatsApp pre-filled message integration:**

The confirmation page (E.2) is where the WhatsApp message gets displayed; the submission page itself just creates the order. The WhatsApp pre-filled message naming the item and referencing Servyou is the next step after a successful submission.

### E.2 — Request confirmation page (`/demande/confirmation/[id]`)

The page shown after a successful request submission. Currently this exists as a static confirmation; per `roadmap.md`, PR-C promotes it to a live order detail page that reads the order's status and renders the OrderLifecycleStepper.

**Elements (current MVP state, pre-PR-C):**

A clear success indicator: a checkmark icon, the message "Demande envoyée avec succès!"

A recap of what was requested.

The WhatsApp pre-filled message with a "Contacter le vendeur via WhatsApp" button. The button opens WhatsApp with the seller's phone number and the pre-filled message text.

The next steps explained: "Le vendeur recevra votre demande et vous contactera bientôt. Vous pouvez suivre l'avancement dans 'Mes demandes'."

A "Voir mes demandes" button navigates to `/mes-demandes`.

A "Retour à l'accueil" link navigates to `/`.

**Elements (post-PR-C, the live order detail view):**

The page reads the order's current status from the database and renders the OrderLifecycleStepper showing the eight stages with the current stage highlighted.

The order details: product or service, quantity, total, delivery details (if a product order).

For a product order in `arrived` status, a primary CTA appears: "Confirmer la réception" — the button that moves the order to `received` and records the `received_at` timestamp. The button is the buyer-only `received` rule that the trigger enforces.

For any pre-terminal status, a "Annuler cette demande" button is available. Clicking it opens the cancellation modal (PR-D): the cancellation reason dropdown plus free-text field. Submitting writes `cancelled_by='buyer'` and the `cancellation_reason`.

The WhatsApp button remains visible at all times so the buyer can reach the seller throughout the lifecycle.

### E.3 — My Requests list (`/mes-demandes`)

The buyer's list of all their requests across both products and services. Elements:

A header: "Mes demandes".

Filter controls: by status (all / pending / in progress / received / cancelled), by date range, by type (products / services).

The list itself, each request a card showing:
- Thumbnail of the product or service
- Title
- Seller name
- Date of request
- Current status as a badge (color-coded per the lifecycle: yellow for pending, blue for in-progress states, green for received, red for cancelled)
- "View details" link to the request detail page

Pagination if the user has many requests.

**Empty state:** "Vous n'avez pas encore fait de demande. Parcourez la marketplace pour trouver ce que vous cherchez." with a "Parcourir la marketplace" primary CTA.

**Interactions:**

Filter changes update the URL and re-fetch the list.

Clicking a request card navigates to the request detail page (E.2 in its post-PR-C form).

### E.4 — My Request detail (`/mes-demandes/[id]`)

Same page as E.2 in its post-PR-C form. The two routes (`/demande/confirmation/[id]` and `/mes-demandes/[id]`) can resolve to the same page, or the confirmation page can be a one-time redirect after submission that lands on the detail page. Implementation choice.

---

## Part VIII — Page-by-page: the buyer favorites and job posting

### F.1 — My Favorites (`/mes-favoris`)

The user's saved products and services. Elements:

A header: "Mes favoris".

Tabs or filters to switch between favorited products and favorited services.

The list/grid: each favorite as a card with the same elements as in the discovery layer (image, title, price, seller, city), plus a heart icon that is filled to indicate the favorite state. Tapping the heart removes the favorite (with a brief "Are you sure?" confirmation or with an undo toast — undo-toast is the friendlier pattern).

**Empty state:** "Vous n'avez pas encore d'articles favoris. Ajoutez des produits ou services à vos favoris pour les retrouver ici plus tard."

### F.2 — Post a Job (`/poster-emploi`)

The form for creating a job post. Fields:

Title (required, up to 100 characters)
Detailed description (required, text area with character counter, minimum 50 characters)
Category (required, dropdown of all 14 categories)
Budget type: fixed or range (radio buttons)
Budget min and max in TND (required if range, single value if fixed)
City/governorate (required, dropdown)
Remote-acceptable toggle (checkbox)
Desired deadline (optional, date picker)
Required skills (multi-select chip input — the user types a skill, presses enter, the skill becomes a chip)

A primary submit button labeled "Publier l'offre".

**Interactions:**

The skills chip input: typing a skill and pressing enter adds it as a chip. Clicking the X on a chip removes it. There is no hard limit on skills but the UI hints at 3-7 skills being the useful range.

On submit, the server action creates a job_posts row with status='open' and inserts the skills into job_post_skills. Redirects to the job post's detail page.

### F.3 — My Job Posts list (`/mes-emplois`)

The list of jobs the consumer has posted. Each card shows:
- Title
- Status (open / filled / expired / deleted)
- Date posted
- Days remaining until expiry (computed lazily: 30 - days_since_created)
- Number of responses received
- "View" link to the detail page

A primary CTA at the top: "Poster une nouvelle offre" → navigates to F.2.

### F.4 — My Job Post detail with responses (`/mes-emplois/[id]`)

The consumer's view of a specific job post with all the responses from freelancers. Elements:

The job post details at the top.

Action buttons: "Modifier" (edit the post), "Marquer comme pourvue" (close the post, status='filled'), "Supprimer" (delete the post).

The list of responses below, each a card showing:
- The freelancer's name, avatar, headline
- The proposal message text
- Any proposed price or timeframe
- Link to the freelancer's public profile
- A "Contacter via WhatsApp" button that uses the get_contact_phone function (the consumer can call only those freelancers who responded — the function enforces this)

**Interactions:**

Clicking "Modifier" navigates to an edit form (same as F.2 but pre-populated).

Clicking "Marquer comme pourvue" prompts a confirmation, then updates status='filled' and the post no longer accepts responses.

Clicking "Supprimer" prompts a stronger confirmation (irreversible action), then sets status='deleted' (soft delete — the row remains for any references but is hidden from listings).

Clicking the WhatsApp button opens WhatsApp with the freelancer's phone (revealed only because they responded to this post).

---

## Part IX — Page-by-page: the shop owner workspace

### G.1 — Become a shop owner (`/devenir-vendeur`)

The marketing page that explains the shop owner role and converts consumers into shop owners. Structure similar to a landing page but scoped to the seller proposition: what selling on Servyou looks like, what the workflow is, what the COD lifecycle means for sellers, the no-commission-at-launch positioning, and a primary CTA to start.

**The primary CTA:** "Créer ma boutique" → navigates to G.2 if the user is logged in and 18+, or to signup with a return URL if not, or to an "age requirement" message if the user is logged in but under 18.

### G.2 — Shop creation (`/ma-boutique/creer`)

The form for creating a shop. Fields:

Shop name (required, up to 100 characters, must be unique — server-side check)
Shop description (required, text area)
City/governorate (required, dropdown)
Logo image upload (optional)
Banner image upload (optional)

Below these required basics, the configurable workspace fields appear in expandable sections (collapsed by default to keep the form short for sellers who want the minimum):

**Optional section: shop type** — radio buttons (physical, online_only, dropshipper).

**Optional section: delivery setup** — radio buttons (self_delivery, third_party, buyer_pickup).

**Optional section: working hours** — text area.

**Optional section: location detail** — text area for neighborhood or pickup address.

**Optional section: payment methods accepted** — checkboxes (COD always pre-checked since it's the universal default; others: bank_transfer, D17, Konnect, Flouci, other).

**Optional section: category specialties** — multi-select chips of the 14 categories the shop specializes in.

A primary submit button labeled "Créer ma boutique".

**Interactions:**

Image uploads use Vercel's image optimization for the display. The actual storage is via URL at MVP (the seller pastes a URL from their own hosting); a Phase 11 upgrade is Supabase Storage.

On submit, the server action creates the shop row, the shop_payment_methods rows for any payment methods checked beyond COD (which is the default), the shop_categories rows for any selected categories, updates the user's seller_type='shop_owner'. Redirects to the shop dashboard.

### G.3 — Shop edit (`/ma-boutique/modifier`)

The same form as G.2 but populated with the existing shop's data. Same interactions, but the submit button is labeled "Enregistrer les modifications", and the redirect after save returns to the dashboard.

### G.4 — Shop owner dashboard (`/ma-boutique`)

The landing page for a logged-in shop owner. Structure:

A header with the shop name and a "Edit shop" link, a "View public page" link (opens G.7 in a new tab), and a "Share my shop" button.

A summary metrics row at the top showing key numbers (calculated live from the database with appropriate caching per the strategic reference, chapter 8):
- Total products listed
- Active products (excluding hidden and sold_out)
- Total orders received (all-time)
- Orders pending action (status in pending, accepted, prepared)
- Orders this week

A quick-action row: "Add product" button, "View orders" button, "Edit shop" button.

A recent orders preview: the most recent 5 orders received, each with the buyer name, product, status, and a "View" link. A "View all orders" link at the bottom navigates to G.8.

A recent products preview: the most recent 5 products added, each with thumbnail, title, status. A "View all products" link navigates to G.5.

**Empty state for new shop owners:** when the shop has no products yet, the dashboard shows: "Bienvenue dans votre boutique! Ajoutez votre premier produit pour commencer à vendre." with a prominent "Ajouter un produit" button.

### G.5 — Products list (`/ma-boutique/produits`)

The shop owner's list of all their products. Elements:

A header: "Mes produits".

A primary CTA: "Ajouter un produit" → navigates to G.6.

Filter controls: by status (all / active / hidden / sold_out), by category.

Sort: by date added, by stock level (low first), by views (post-MVP).

The list itself, each product a row in a table (desktop) or a card (mobile) showing:
- Thumbnail
- Title
- Price
- Stock (count or "Non suivi" for tracks_stock=false)
- Status badge
- Units sold (calculated live)
- Quick actions: "Modifier", "Masquer/Activer", "Supprimer"

Pagination at the bottom.

### G.6 — Add product (`/ma-boutique/produits/ajouter`)

The form for creating a new product. Fields:

Title (required, up to 100 characters)
Description (required, text area with character counter)
Category (required, dropdown)
Price in TND (required, numeric, with two decimal places allowed)
Stock tracking toggle: "Je suis le stock de ce produit" (boolean, default true)
Stock count (required if tracking, hidden if not)
Status: active or hidden (default active)

Image upload area: at least one image required, up to 8 images. Drag-and-drop or click-to-upload, with previews and the ability to reorder via drag.

A primary submit button labeled "Publier le produit". A secondary button "Enregistrer comme brouillon" saves with status='hidden' so the seller can return to finish later.

**Interactions:**

Image upload: each image gets a thumbnail preview, an X to remove, and drag-handles to reorder. The first image is the primary (used as the thumbnail in listings).

On submit with validation pass, the server action creates the product, inserts the product_images rows in display_order, and redirects to the products list with a success toast.

### G.7 — Edit product (`/ma-boutique/produits/[id]/modifier`)

The same form as G.6 but populated with the existing product's data. The submit button is labeled "Enregistrer les modifications".

### G.8 — Orders received (`/ma-boutique/commandes`)

The shop owner's list of orders. Elements:

A header: "Commandes reçues".

Filter controls: by status (the 8 lifecycle states + cancelled), by date range, by product.

Sort: newest first (default), oldest first.

The list itself, each order a row showing:
- Buyer name and city
- Product (with thumbnail)
- Quantity
- Total price
- Date of request
- Current status as a colored badge
- The next action button based on the lifecycle state (the specific action that the seller can advance the order to)
- A "Voir détails" link to the order detail page

**The next-action button on each row** is the most important UI element here. Based on the order's current status:
- `pending` → button labeled "Accepter" (advances to `accepted`)
- `accepted` → button labeled "Marquer préparée" (advances to `prepared`)
- `prepared` → button labeled "Marquer expédiée" (advances to `dispatched`)
- `dispatched` → button labeled "Marquer en livraison" (advances to `in_delivery`)
- `in_delivery` → button labeled "Marquer arrivée" (advances to `arrived`)
- `arrived` → no action available to seller (waiting for buyer confirmation), shows "En attente de confirmation acheteur" as muted text
- `received` → no action available, shows "Reçue" with a green checkmark
- `cancelled` → no action available, shows "Annulée" in muted text

Each row also has a "Annuler" link (in muted destructive text) that opens the cancellation modal — for pre-pivot states, it's a simple cancel; for post-pivot states (dispatched and beyond), it requires the cancellation reason.

**Interactions:**

Clicking the next-action button triggers the status advancement via the server action, which is gated by the `check_order_status_transition` trigger. On success, the row updates in place with the new status and the new next-action button. On failure (e.g., another tab already advanced it), a toast explains.

Clicking "Voir détails" navigates to the order detail page (G.9).

### G.9 — Order detail (seller view) (`/ma-boutique/commandes/[id]`)

A detailed view of a single order. Elements:

The order header: order ID (or a friendly short reference), date, current status, OrderLifecycleStepper showing the full progression.

The buyer information: name, city, phone (revealed via get_contact_phone since the seller is in a relationship with this buyer).

The delivery information: address, optional buyer note.

The product information: thumbnail, title, quantity, total.

A WhatsApp button to contact the buyer (uses the revealed phone).

The next-action button, same as in G.8 but more prominent on this detail page.

The cancellation button if applicable.

A history of status transitions if Servyou has implemented the per-transition timestamps (this is post-launch per `roadmap.md`).

---

## Part X — Page-by-page: the freelancer workspace

### H.1 — Become a freelancer (`/devenir-freelance`)

Mirrors G.1 for the freelancer role. Marketing page explaining the freelancer proposition, with a primary CTA to create a profile.

### H.2 — Freelancer profile creation (`/mon-profil-freelance/creer`)

The form for creating a freelancer profile. Fields:

Avatar photo upload (recommended but optional)
Banner image upload (optional)
Full name (defaults from profile, editable)
Professional headline (required, up to 100 characters)
Bio (required, text area)
City/governorate (optional)
Skills (multi-select chip input, at least 1 required)
Years of experience (numeric, optional)
Languages spoken (multi-select chips)
External portfolio link (optional URL)

Below these basics, the configurable workspace expandable sections:

**Optional section: working hours** — text area.
**Optional section: current workplace** — text area.
**Optional section: preferred payment method** — dropdown or free text.
**Optional section: tools and software** — chip input.
**Optional section: education** — repeatable card rows with institution, degree, field, year_start, year_end (year_end optional, blank means ongoing).
**Optional section: certifications** — repeatable card rows with name, issuing organization, year obtained, optional credential URL.

A primary submit button "Créer mon profil" with the diff-save strategy already in place (PR-H2): the profile saves first, then the child tables save with their diffs.

### H.3 — Freelancer profile edit (`/mon-profil-freelance/modifier`)

Same as H.2 but populated. Submit labeled "Enregistrer les modifications".

### H.4 — Freelancer dashboard (`/mon-profil-freelance`)

Mirrors G.4 for freelancers. Summary metrics: total services listed, active services, total service requests received, requests pending action, this week's activity. Quick actions: add service, view requests, edit profile. Recent activity preview.

### H.5 — Services list (`/mon-profil-freelance/services`)

Mirrors G.5 for services. Each service a row with title, price, status, requests received, quick actions.

### H.6 — Add service (`/mon-profil-freelance/services/ajouter`)

Form for creating a service listing. Fields: title, description, category, starting price, delivery time (flexible text), status, optional sample images. Similar to the product form but adapted for services.

### H.7 — Edit service (`/mon-profil-freelance/services/[id]/modifier`)

Same as H.6 but populated.

### H.8 — Service orders received (`/mon-profil-freelance/commandes`)

Mirrors G.8 for service orders, but with the abbreviated lifecycle (pending → accepted → arrived → received). The next-action buttons follow the same pattern but with fewer states.

### H.9 — Job board browse (`/emplois`)

The list of all open job posts. Elements:

A header: "Offres disponibles".

Filter controls: by category, by city, by budget range, by required skills, by remote-acceptable.

Sort: newest first (default), highest budget, fewest responses (for the freelancer who wants to bet on less-competed jobs).

The list itself, each job a card showing:
- Title
- Budget (fixed or range)
- City (or "Remote acceptable")
- Date posted
- Days remaining until expiry
- Number of responses already received (to indicate competition)
- Required skills as small chips
- A brief excerpt of the description (first 100 characters)

Pagination at the bottom.

**Interactions:** clicking a job card navigates to the job detail page H.10.

### H.10 — Job board detail (`/emplois/[id]`)

The full job post detail with a response form. Elements:

The job post details: title, full description, budget, city, deadline, required skills, the consumer's first name and city (the full identity is revealed only after the freelancer is engaged — `get_contact_phone` handles the post-response reveal).

The "Submit a response" form below:
- Proposal message (required, text area with character counter)
- Optional proposed price
- Optional proposed timeframe

A primary submit button "Envoyer ma réponse".

The number of responses already received, shown prominently. If the post is at the 10-response cap, the form is disabled with a clear message ("Cette offre a atteint la limite de réponses."). If the freelancer has 5 active responses already, the form is disabled with a different message ("Vous avez atteint la limite de 5 réponses actives.").

**Interactions:**

The submit triggers the server action, which the `check_job_response_limits` trigger gates. The trigger enforces the post-open status, the post non-expiry, the 10-response cap, the 5-active-response cap, and the no-self-response rule. Any violation surfaces as a French message in a toast.

On success, the response is created, the freelancer sees "Votre réponse a été envoyée. Le client vous contactera s'il est intéressé.", and a "View my responses" link is provided.

### H.11 — My Job Responses list (`/mon-profil-freelance/reponses`)

The freelancer's list of all their submitted responses. Each entry shows:
- The job post title (link to H.10 in the read-only form, since the response is already submitted)
- The proposed price/timeframe
- The post's current status (open / filled / expired / deleted)
- A status indicator for the response: "Submitted", "Client replied" (post-MVP messaging), "Hired" (post-MVP), "Not selected" (post-MVP)
- A "Contact client" button if the response is active and the post is still open — uses get_contact_phone to reveal the consumer's phone

---

## Part XI — Page-by-page: the user account zone

### I.1 — Profile edit (`/mon-compte`)

The page where any user, regardless of role, manages their personal information. Fields:

Full name
Email (changing requires re-verification — a confirmation flow with the new email)
Phone (optional, used for COD and for the relationship-scoped phone reveal)
Date of birth (read-only after signup, or editable with a clear warning about the age rule)
City/governorate
Language preference (French / Arabic)
Profile photo

A "Change password" section with: current password, new password, confirm new password.

A primary submit button "Enregistrer les modifications".

A destructive action at the bottom: "Supprimer mon compte" (in muted destructive text) opens a confirmation modal explaining what happens (data deletion, account closure) and requires typing "SUPPRIMER" to confirm. At MVP, this triggers an admin-mediated deletion request (an email to Moatez or a record in a `deletion_requests` table); the self-service automatic deletion is post-MVP.

### I.2 — Settings (`/parametres`)

The page covering preferences beyond personal information. Sections:

**Notifications**: which types of emails to receive (order updates, marketing — opt-out by default per the privacy posture), which in-app notifications to enable (post-MVP).

**Privacy**: visibility settings for the user's activity, an "export my data" button that triggers a data export (at MVP this is admin-mediated; self-service is post-MVP).

**Language**: same as in profile, can be set here too.

**Connected accounts**: if Servyou ever adds social login, this section appears.

### I.3 — Notifications inbox (post-MVP)

The slot is reserved in the navigation for the in-app notification center. At MVP, this page doesn't exist or shows "Bientôt disponible." When it ships post-launch, it lists every recent notification with a timestamp, a brief summary, and a link to the relevant page.

---

## Part XII — Page-by-page: the administrator dashboard

### J.1 — Admin overview (`/admin`)

The landing page for an authenticated admin. Per the strategic reference chapter 9, the action queue comes first, statistics come second.

**Elements:**

Header: "Vue d'ensemble — mis à jour il y a X secondes" (with the cache-age timestamp visible).

The action queue at the top: open reports (count), pending disputes (count), suspended users awaiting review (count), flagged content (count). Each count is a link to the corresponding section. The triage order is: severe abuse reports → other reports → disputes → suspensions → flagged content.

The aggregate statistics row below (cached, revalidate=60): total users, total shops, total freelancers, total products, total services, total job posts, completed orders, pending reports.

Quick links to admin sub-pages.

The page is server-rendered with the eight count queries running in parallel.

### J.2 — User management list (`/admin/utilisateurs`)

The admin list of all users. Elements:

Filter controls: by role (consumer / shop_owner / freelancer / admin), by status (active / suspended), by signup date range, by city.

Search by name or email.

Sort: newest first, by last activity, by city.

The list itself, each user a row showing:
- Avatar and name
- Email
- Role
- City
- Signup date
- Last activity (computed from auth.users or session logs)
- Status badge (active / suspended)
- Quick actions: "View details", "Suspend" or "Reactivate", "Remove"

Pagination at the bottom.

**Interactions:**

Clicking "View details" navigates to J.3.

Clicking "Suspend" prompts a reason in a modal, then suspends the user (blocks login, preserves data) and writes to the admin audit log.

Clicking "Remove" requires a stronger confirmation (typing the user's email or "SUPPRIMER"), then removes the user (cascade-deletes their dependent data via the foreign-key constraints).

### J.3 — User detail (`/admin/utilisateurs/[id]`)

The detail view of a single user. Elements:

The user's full profile.

Their activity history: shops they created, products listed, services listed, orders placed as buyer, orders received as seller, job posts created, job responses submitted, reports filed by them, reports filed against them.

Quick actions: suspend, remove, grant admin (if appropriate), revoke admin, edit profile on their behalf (rare, only for support cases).

The admin audit log entries for this user.

### J.4 — Content moderation list (`/admin/contenu`)

A unified content moderation interface across all content types (shops, products, services, job posts, freelancer profiles). Tabs or filters switch between content types.

Each content row shows: thumbnail or summary, owner, creation date, status (active / hidden / removed), report count if any, quick actions (view, hide, remove).

### J.5 — Reports queue (`/admin/signalements`)

The list of all reports submitted by users. Elements:

Filter controls: by status (open / under_review / resolved), by reason, by target type.

Sort: by date (newest first), by severity (severe abuse first — `fake_scam` reasons treated as severe).

The list itself, each report a row showing:
- Reporter name (with their report history flagged if they are a repeat reporter)
- Target type and a link to the targeted content
- Reason
- Description excerpt
- Status badge
- Quick actions: "Review", "Resolve", "Dismiss"

### J.6 — Report detail (`/admin/signalements/[id]`)

The full detail view of a report. Elements:

The reported content (the actual product / service / shop / freelancer page, or a preview if it's been hidden).

The reporter's profile (with their report history — repeat reporters need to be calibrated separately).

The reason given.

The full description.

Any other reports about the same content.

Action buttons: "Resolve with note", "Dismiss", "Hide the content", "Remove the content", "Suspend the reported user", "Remove the reported user".

The admin_note field that gets shown to the reporter on resolution.

A "Save and resolve" button that writes the resolution to the database, sets status='resolved', and writes to the admin audit log.

### J.7 — Disputes resolution (`/admin/litiges`)

The list of disputes between buyers and sellers. A dispute is conceptually a special class of report scoped to a specific order. Elements:

The list of disputes, each showing the order details, the parties involved, the status of the dispute, the actions available.

The detail view of a single dispute pulls together: the order's lifecycle history (every status transition with timestamp), the `received_at` if buyer-confirmed, any cancellation reason, the messages exchanged if accessible. The admin can side with the buyer, the seller, or propose a compromise, and the decision is logged.

### J.8 — Aggregate statistics (`/admin/statistiques`)

The page showing platform health metrics. Elements:

A header: "Statistiques — mis à jour il y a X minutes" (these are cached longer, possibly via a materialized view refreshed hourly).

KPI cards at the top: total users (with weekly delta), total active sellers, total active orders, this week's transactions completed, dispute rate, average time to fulfillment.

Charts showing trends over time: signups per week, orders per week, retention curves (post-MVP when there is enough data).

A "Download CSV" button for any KPI that the admin wants to share with stakeholders.

The page is read-only — no actions, just visibility.

---

## Closing — how this document is maintained

This document is a living reference. Every time a new page is shipped or an existing page is modified, this document should be updated to reflect the new state. Every time a new interaction pattern is decided (a new modal style, a new validation behavior, a new mobile gesture), it joins Part II as a universal standard.

The discipline that keeps it useful is the same discipline applied to the other foundation documents: read it when a decision needs framing, update it when reality contradicts what it says, and treat it as a working reference rather than a closed contract.

When the design system arrives in its dedicated phase, the visual styling will be applied to the structural skeletons this document describes. The skeletons will not change; the dressing will. That is the right separation of concerns — structure and behavior here, visual identity in the design system.

Until then, this document is the answer to questions about what belongs where, what each click does, and how every interaction should feel for the Tunisian users that Servyou is being built for.

— End of document.
