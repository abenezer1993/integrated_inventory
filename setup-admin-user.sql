-- Setup admin user and ensure proper user management structure

-- First, let's check if users table exists and has the right structure
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
-- This will create the auth user first, then the profile
-- Note: You'll need to create this user through the app or Supabase dashboard first

-- For now, let's insert the profile if the auth user exists
-- This assumes the auth user was created separately

-- First, let's create a function to handle admin user creation
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if admin user already exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'abenitak9@gmail.com') THEN
        -- Try to find the auth user
        SELECT id INTO admin_user_id 
        FROM auth.users 
        WHERE email = 'abenitak9@gmail.com' 
        LIMIT 1;
        
        -- If auth user exists, create profile
        IF admin_user_id IS NOT NULL THEN
            INSERT INTO users (id, email, name, role, branch_id, created_at)
            VALUES (
                admin_user_id,
                'abenitak9@gmail.com',
                'Admin User',
                'admin',
                NULL, -- Admin has access to all branches
                NOW()
            );
        ELSE
            -- Create a placeholder profile that can be updated when auth user is created
            INSERT INTO users (id, email, name, role, branch_id, created_at)
            VALUES (
                gen_random_uuid(),
                'abenitak9@gmail.com',
                'Admin User',
                'admin',
                NULL, -- Admin has access to all branches
                NOW()
            );
        END IF;
    END IF;
END;
$$;

-- Execute the function
SELECT create_admin_user();

-- Clean up the function
DROP FUNCTION create_admin_user();

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

CREATE POLICY "Admins can manage all users" ON users
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN auth.jwt() ->> 'role' = 'admin';
END;
$$;

-- Create function to check if user is branch manager
CREATE OR REPLACE FUNCTION is_branch_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN auth.jwt() ->> 'role' = 'branch_manager';
END;
$$;
