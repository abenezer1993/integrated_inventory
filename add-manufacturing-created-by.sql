-- Add created_by column to manufacturing_orders table
ALTER TABLE manufacturing_orders 
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Update existing records to use the admin user ID
UPDATE manufacturing_orders 
SET created_by = '316d3088-08d1-4034-9d5d-f32b5ef2d0e1' 
WHERE created_by IS NULL;

-- Add RLS policy for created_by
CREATE POLICY "Users can view manufacturing orders" ON manufacturing_orders
FOR SELECT USING (
    auth.role() = 'admin' OR 
    created_by = auth.uid() OR
    branch_id IN (SELECT id FROM branches WHERE manager_id = auth.uid())
);

-- Allow users to insert manufacturing orders
CREATE POLICY "Users can insert manufacturing orders" ON manufacturing_orders
FOR INSERT WITH CHECK (
    auth.role() = 'admin' OR
    branch_id IN (SELECT id FROM branches WHERE manager_id = auth.uid())
);

-- Allow users to update manufacturing orders
CREATE POLICY "Users can update manufacturing orders" ON manufacturing_orders
FOR UPDATE USING (
    auth.role() = 'admin' OR
    created_by = auth.uid() OR
    branch_id IN (SELECT id FROM branches WHERE manager_id = auth.uid())
);

-- Grant necessary permissions
GRANT ALL ON manufacturing_orders TO authenticated;
