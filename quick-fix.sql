-- Quick fix for manufacturing_orders table
-- Add missing columns directly
ALTER TABLE manufacturing_orders 
ADD COLUMN product_name TEXT,
ADD COLUMN product_category TEXT;

-- Make finished_product_id optional
ALTER TABLE manufacturing_orders 
ALTER COLUMN finished_product_id DROP NOT NULL;
