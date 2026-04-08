-- Final Admin User Setup Script
-- This version handles existing objects gracefully

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'sales_staff',
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin user for abenitak9@gmail.com
-- This creates a placeholder that will be linked when auth user is created
INSERT INTO users (id, email, name, role, branch_id, created_at)
VALUES 
(
    gen_random_uuid(),
    'abenitak9@gmail.com',
    'Admin User',
    'admin',
    NULL, -- Admin has access to all branches
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    branch_id = NULL,
    updated_at = NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);

-- Enable Row Level Security (only if not already enabled)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'users' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop ALL existing policies for users table to avoid conflicts
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON users';
    END LOOP;
END $$;

-- Create fresh RLS policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "Branch managers can view branch users" ON users
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'branch_manager' AND 
        branch_id::text = auth.jwt() ->> 'branch_id'
    );

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON users
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Grant necessary permissions (only if not already granted)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.role_table_grants 
        WHERE table_name = 'users' 
        AND grantee = 'authenticated'
        AND privilege_type = 'SELECT'
    ) THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.role_sequence_grants 
        WHERE sequence_schema = 'public'
        AND grantee = 'authenticated'
    ) THEN
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    END IF;
END $$;

-- Success message
SELECT 'Admin user setup completed successfully!' as result;
