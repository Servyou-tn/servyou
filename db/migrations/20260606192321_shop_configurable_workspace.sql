-- Migration: shop_configurable_workspace
-- Adds the configurable workspace fields to the shops table per data-model.md
-- (Layer 4 origin) and the Configurable Workspace Principle from product.md
-- (Pillar 4 origin). All new shop columns are nullable; the two new child
-- tables capture multi-value attributes.

-- Step 1: Add four nullable columns to shops table
ALTER TABLE shops ADD COLUMN shop_type text
  CHECK (shop_type IS NULL OR shop_type = ANY (ARRAY['physical','online_only','dropshipper']));

ALTER TABLE shops ADD COLUMN delivery_setup text
  CHECK (delivery_setup IS NULL OR delivery_setup = ANY (ARRAY['self_delivery','third_party','buyer_pickup']));

ALTER TABLE shops ADD COLUMN working_hours text;

ALTER TABLE shops ADD COLUMN location_detail text;

-- Step 2: Create shop_payment_methods child table
CREATE TABLE shop_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method = ANY (ARRAY['cod','bank_transfer','d17','konnect','other'])),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, method)
);
CREATE INDEX shop_payment_methods_shop_idx ON shop_payment_methods(shop_id);

ALTER TABLE shop_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment methods viewable by everyone"
  ON shop_payment_methods FOR SELECT USING (true);

CREATE POLICY "Owner manages own shop payment methods"
  ON shop_payment_methods FOR ALL
  USING (EXISTS (
    SELECT 1 FROM shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()
  ));

-- Step 3: Create shop_categories child table
CREATE TABLE shop_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, category_id)
);
CREATE INDEX shop_categories_shop_idx ON shop_categories(shop_id);
CREATE INDEX shop_categories_category_idx ON shop_categories(category_id);

ALTER TABLE shop_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop categories viewable by everyone"
  ON shop_categories FOR SELECT USING (true);

CREATE POLICY "Owner manages own shop categories"
  ON shop_categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()
  ));
