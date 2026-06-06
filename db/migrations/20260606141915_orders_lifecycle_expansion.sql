-- Step 1: drop the old 3-value CHECK FIRST (it forbids 'received')
ALTER TABLE orders DROP CONSTRAINT orders_status_check;

-- Step 2: now the rename is allowed (no status constraint active)
UPDATE orders SET status = 'received' WHERE status = 'completed';

-- Step 3: add the new 8-value CHECK (validates the 'received' row cleanly)
ALTER TABLE orders ADD CONSTRAINT orders_status_check
CHECK (status = ANY (ARRAY[
  'pending','accepted','prepared','dispatched',
  'in_delivery','arrived','received','cancelled'
]));

-- Step 4: add cancelled_by
ALTER TABLE orders ADD COLUMN cancelled_by text
CHECK (cancelled_by IS NULL OR cancelled_by = ANY (ARRAY['buyer','seller']));

-- Step 5: add cancellation_reason
ALTER TABLE orders ADD COLUMN cancellation_reason text;

-- Step 6: add received_at (NULL for legacy row by design)
ALTER TABLE orders ADD COLUMN received_at timestamptz;
