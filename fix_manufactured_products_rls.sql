-- Fix RLS policies for manufactured_products table
-- Allow authenticated users to insert manufactured products

-- Option 1: Disable RLS completely (temporary fix)
ALTER TABLE manufactured_products DISABLE ROW LEVEL SECURITY;

-- Option 2: Create proper RLS policies (recommended)
-- Uncomment below if you want to keep RLS enabled with proper policies

-- Drop existing policies if any
DROP POLICY IF EXISTS "manufactured_products_insert_policy" ON manufactured_products;
DROP POLICY IF EXISTS "manufactured_products_select_policy" ON manufactured_products;
DROP POLICY IF EXISTS "manufactured_products_update_policy" ON manufactured_products;
DROP POLICY IF EXISTS "manufactured_products_delete_policy" ON manufactured_products;

-- Create new policies for authenticated users
CREATE POLICY "manufactured_products_insert_policy" ON manufactured_products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "manufactured_products_select_policy" ON manufactured_products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "manufactured_products_update_policy" ON manufactured_products
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "manufactured_products_delete_policy" ON manufactured_products
    FOR DELETE USING (auth.role() = 'authenticated');

-- Enable RLS again if using Option 2
-- ALTER TABLE manufactured_products ENABLE ROW LEVEL SECURITY;

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'manufactured_products';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'manufactured_products';
