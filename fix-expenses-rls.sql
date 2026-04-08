-- Fix RLS policy for manufacturing_expenses table
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can insert manufacturing expenses" ON manufacturing_expenses;
DROP POLICY IF EXISTS "Users can update manufacturing expenses" ON manufacturing_expenses;
DROP POLICY IF EXISTS "Users can view manufacturing expenses" ON manufacturing_expenses;

-- Simple insert policy - allow admins, all others need to be authenticated
CREATE POLICY "Users can insert manufacturing expenses" ON manufacturing_expenses
FOR INSERT WITH CHECK (
    auth.role() = 'admin' OR
    auth.role() = 'authenticated'
);

-- Simple update policy - allow admins, all others need to be authenticated
CREATE POLICY "Users can update manufacturing expenses" ON manufacturing_expenses
FOR UPDATE USING (
    auth.role() = 'admin' OR
    auth.role() = 'authenticated'
);

-- Simple select policy - allow admins, all others need to be authenticated
CREATE POLICY "Users can view manufacturing expenses" ON manufacturing_expenses
FOR SELECT USING (
    auth.role() = 'admin' OR
    auth.role() = 'authenticated'
);
