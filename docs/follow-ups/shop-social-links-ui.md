# Follow-ups — shop social links UI (`feat/shop-social-links`, #293, 2026-11-01)

## Focus does not move to a refused social link

**What** When a social link is refused, G3 opens the « Réseaux sociaux » section and marks the field (`aria-invalid` + message), and the form's
alert is announced — but focus stays on the submit button. The identity fields behave the same way today (not a regression).

**Why deferred** A form-wide « focus the first invalid field » pass belongs to all of G3, not to this section.

**Where it lives** `src/app/ma-boutique/modifier/_components/EditShopForm.tsx` (`onSubmit`).

**Trigger** The next G3 PR, or an accessibility pass on the seller forms.

## Arabic placeholders and examples keep « votreboutique » / « maboutique »

**What** The AR placeholders (`shop.edit.social.*_ph`) and the examples in the AR « invalid link » messages use the French slug. They are
addresses (LTR), so they read fine, but a neutral slug would be cleaner.

**Why deferred** Copy choice for the founder's AR review (all AR strings here are `REVIEW_AR_TRANSLATION`).

**Where it lives** `src/lib/i18n/ar.ts` (`shop.edit.social.*`).

**Trigger** The AR review pass.
