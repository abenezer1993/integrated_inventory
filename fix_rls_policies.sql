-- Fix Row-Level Security policies for purchase_orders table

-- First, disable RLS temporarily for testing
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;

-- Or create proper RLS policies (choose one approach)

-- Approach 1: Allow all authenticated users to manage purchase orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can insert their own purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can update their own purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can delete their own purchase_orders" ON purchase_orders;

-- Create new policies for authenticated users
CREATE POLICY "Users can view all purchase_orders" ON purchase_orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert purchase_orders" ON purchase_orders
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update purchase_orders" ON purchase_orders
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete purchase_orders" ON purchase_orders
    FOR DELETE USING (auth.role() = 'authenticated');

-- Check current RLS status and policies
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerlspolicy
FROM pg_tables 
WHERE tablename = 'purchase_orders';

-- Show all policies on purchase_orders
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'purchase_orders';
