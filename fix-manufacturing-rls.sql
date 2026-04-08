-- Fix RLS policy for manufacturing orders to allow admins without branch restrictions
DROP POLICY IF EXISTS "Users can insert manufacturing orders" ON manufacturing_orders;

-- Allow users to insert manufacturing orders (updated for admin branch_id null)
CREATE POLICY "Users can insert manufacturing orders" ON manufacturing_orders
FOR INSERT WITH CHECK (
    auth.role() = 'admin' OR
    (branch_id IS NOT NULL AND auth.role() = 'admin') OR
    branch_id IN (SELECT id FROM branches WHERE manager_id = auth.uid())
);

-- Allow users to update manufacturing orders (updated for admin branch_id null)
CREATE POLICY "Users can update manufacturing orders" ON manufacturing_orders
FOR UPDATE USING (
    auth.role() = 'admin' OR
    (branch_id IS NOT NULL AND auth.role() = 'admin') OR
    branch_id IN (SELECT id FROM branches WHERE manager_id = auth.uid())
);
