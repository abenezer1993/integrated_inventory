-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view sales" ON sales;
DROP POLICY IF EXISTS "Users can insert sales" ON sales;
DROP POLICY IF EXISTS "Users can update own sales" ON sales;
DROP POLICY IF EXISTS "Users can delete own sales" ON sales;

-- Create new permissive policies
CREATE POLICY "Users can view sales" ON sales
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert sales" ON sales
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update sales" ON sales
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete sales" ON sales
    FOR DELETE USING (auth.role() = 'authenticated');
