-- Simple Admin User Setup Script
-- This version is more straightforward and should work without issues

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

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Branch managers can view branch users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Create RLS policies for users table
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

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'Admin user setup completed successfully!' as result;
