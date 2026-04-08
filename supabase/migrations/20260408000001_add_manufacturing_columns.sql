-- Add missing columns to manufacturing_orders table
ALTER TABLE manufacturing_orders 
ADD COLUMN product_name TEXT,
ADD COLUMN product_category TEXT;

-- Update existing records to have proper data
UPDATE manufacturing_orders 
SET 
    product_name = COALESCE(product_name, 'Unknown Product'),
    product_category = COALESCE(product_category, 'Unknown Category')
WHERE product_name IS NULL OR product_category IS NULL;
