-- Migration: shop_workspace_market_alignment
-- Purpose: Incorporate market research findings into the shop workspace schema
--   before PR-F UI ships. Two related changes from the same research signal:
--
--   1. Real Tunisian shop owners name 1-3 actual delivery carriers from a
--      universe of 12+ (First Delivery, Aramex, Mylerz, Adex, Navex,
--      Bestway, Jetpack, Droppex, Collissimo, FedEx, UPS, Best Delivery, etc.).
--      Our delivery_setup enum (self_delivery / third_party / buyer_pickup)
--      captures the strategy but not which carrier(s). Free-text MVP column;
--      post-launch promotion to structured shop_carriers child table with FK
--      to a curated delivery_companies lookup is in docs/roadmap.md.
--
--   2. Tunisian payment landscape names Flouci alongside D17 and Konnect
--      in every reference. It was the gap in our shop_payment_methods.method
--      enum — currently covered by 'other'. Promoting it to a first-class
--      enum value before any shop owner names it via 'other'.
--
-- Deferred: paymee, e_dinar, orange_money — covered by 'other' until they
--   emerge as common shop-owner choices, then promoted in a future migration.

-- ============================================================
-- Step 1: Add preferred_carriers free-text column on shops
-- ============================================================
ALTER TABLE public.shops
  ADD COLUMN preferred_carriers text NULL;

COMMENT ON COLUMN public.shops.preferred_carriers IS
  'Free-form text where shop owners name their preferred Tunisian delivery carriers (e.g. First Delivery, Aramex, Mylerz). MVP free-text; post-launch promotion to a structured shop_carriers child table is planned per docs/roadmap.md.';

-- ============================================================
-- Step 2: Expand shop_payment_methods.method enum to include flouci
-- ============================================================
ALTER TABLE public.shop_payment_methods
  DROP CONSTRAINT shop_payment_methods_method_check;

ALTER TABLE public.shop_payment_methods
  ADD CONSTRAINT shop_payment_methods_method_check
  CHECK (method = ANY (ARRAY['cod'::text, 'bank_transfer'::text, 'd17'::text, 'flouci'::text, 'konnect'::text, 'other'::text]));
