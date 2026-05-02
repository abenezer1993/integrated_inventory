-- Simple RLS fix for purchase_orders table

-- Option 1: Quick fix - Disable RLS completely
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;

-- Check if RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'purchase_orders';

-- If you want to keep RLS enabled, run this instead:

-- Enable RLS and create policies for authenticated users
-- ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can insert purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can update purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can delete purchase_orders" ON purchase_orders;

-- Create new policies for authenticated users
CREATE POLICY "Users can view purchase_orders" ON purchase_orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert purchase_orders" ON purchase_orders
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update purchase_orders" ON purchase_orders
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete purchase_orders" ON purchase_orders
    FOR DELETE USING (auth.role() = 'authenticated');

-- Show current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'purchase_orders';
