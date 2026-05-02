-- Add product_name column to purchase_orders table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'product_name'
    ) THEN
        ALTER TABLE purchase_orders 
        ADD COLUMN product_name TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added product_name column';
    ELSE
        RAISE NOTICE 'product_name column already exists';
    END IF;
END $$;

-- Check if the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND column_name = 'product_name';
