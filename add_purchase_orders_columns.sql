-- PostgreSQL script for Supabase - Add columns to purchase_orders table if they don't exist

-- Add supplier_contact column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'supplier_contact'
    ) THEN
        ALTER TABLE purchase_orders 
        ADD COLUMN supplier_contact TEXT;
        RAISE NOTICE 'Added supplier_contact column';
    ELSE
        RAISE NOTICE 'supplier_contact column already exists';
    END IF;
END $$;

-- Add expected_delivery column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'expected_delivery'
    ) THEN
        ALTER TABLE purchase_orders 
        ADD COLUMN expected_delivery DATE;
        RAISE NOTICE 'Added expected_delivery column';
    ELSE
        RAISE NOTICE 'expected_delivery column already exists';
    END IF;
END $$;

-- Add order_date column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'order_date'
    ) THEN
        ALTER TABLE purchase_orders 
        ADD COLUMN order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added order_date column';
    ELSE
        RAISE NOTICE 'order_date column already exists';
    END IF;
END $$;

-- Add actual_delivery column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'actual_delivery'
    ) THEN
        ALTER TABLE purchase_orders 
        ADD COLUMN actual_delivery TIMESTAMP;
        RAISE NOTICE 'Added actual_delivery column';
    ELSE
        RAISE NOTICE 'actual_delivery column already exists';
    END IF;
END $$;

-- Add branch_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE purchase_orders 
        ADD COLUMN branch_id TEXT;
        RAISE NOTICE 'Added branch_id column';
    ELSE
        RAISE NOTICE 'branch_id column already exists';
    END IF;
END $$;

-- Check final table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
ORDER BY ordinal_position;
