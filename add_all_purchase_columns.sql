-- Add all essential columns to purchase_orders table if they don't exist

-- Add product_name column if it doesn't exist
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

-- Add quantity column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'quantity'
    ) THEN
        ALTER TABLE purchase_orders 
        ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added quantity column';
    ELSE
        RAISE NOTICE 'quantity column already exists';
    END IF;
END $$;

-- Add unit_price column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'unit_price'
    ) THEN
        ALTER TABLE purchase_orders 
        ADD COLUMN unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00;
        RAISE NOTICE 'Added unit_price column';
    ELSE
        RAISE NOTICE 'unit_price column already exists';
    END IF;
END $$;

-- Add total_amount column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE purchase_orders 
        ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00;
        RAISE NOTICE 'Added total_amount column';
    ELSE
        RAISE NOTICE 'total_amount column already exists';
    END IF;
END $$;

-- Add supplier_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'supplier_name'
    ) THEN
        ALTER TABLE purchase_orders 
        ADD COLUMN supplier_name TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added supplier_name column';
    ELSE
        RAISE NOTICE 'supplier_name column already exists';
    END IF;
END $$;

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE purchase_orders 
        ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
        RAISE NOTICE 'Added status column';
    ELSE
        RAISE NOTICE 'status column already exists';
    END IF;
END $$;

-- Check final table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
ORDER BY ordinal_position;
