-- Add missing columns to manufacturing_orders table
ALTER TABLE manufacturing_orders 
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS product_category TEXT;

-- Update existing records to have proper data
UPDATE manufacturing_orders 
SET 
    product_name = COALESCE(product_name, 'Unknown Product'),
    product_category = COALESCE(product_category, 'Unknown Category')
WHERE product_name IS NULL OR product_category IS NULL;

-- Drop the foreign key constraint temporarily if it exists
-- (This is a workaround for some Supabase setups)
ALTER TABLE manufacturing_orders 
DROP CONSTRAINT IF EXISTS manufacturing_orders_finished_product_id_fkey;

-- Make finished_product_id optional since we're using product_name directly
ALTER TABLE manufacturing_orders 
ALTER COLUMN finished_product_id DROP NOT NULL;
