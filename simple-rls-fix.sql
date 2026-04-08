-- Simple RLS policy fix for manufacturing orders
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can insert manufacturing orders" ON manufacturing_orders;
DROP POLICY IF EXISTS "Users can update manufacturing orders" ON manufacturing_orders;

-- Simple insert policy - allow admins, all others need to be authenticated
CREATE POLICY "Users can insert manufacturing orders" ON manufacturing_orders
FOR INSERT WITH CHECK (
    auth.role() = 'admin' OR
    auth.role() = 'authenticated'
);

-- Simple update policy - allow admins, all others need to be authenticated
CREATE POLICY "Users can update manufacturing orders" ON manufacturing_orders
FOR UPDATE USING (
    auth.role() = 'admin' OR
    auth.role() = 'authenticated'
);

-- Simple select policy - allow admins, all others need to be authenticated
CREATE POLICY "Users can view manufacturing orders" ON manufacturing_orders
FOR SELECT USING (
    auth.role() = 'admin' OR
    auth.role() = 'authenticated'
);
