-- Link Auth User to Admin Profile
-- This creates the missing profile for the existing auth user

-- First, let's see what auth users exist
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'abenitak9@gmail.com';

-- Check if there's a profile for this auth user
SELECT 
    id,
    email,
    name,
    role,
    branch_id
FROM users 
WHERE id = '316d3088-08d1-4034-9d5d-f32b5ef2d0e1';

-- Create the missing admin profile
INSERT INTO users (id, email, name, role, branch_id, created_at, updated_at)
VALUES 
(
    '316d3088-08d1-4034-9d5d-f32b5ef2d0e1', -- Use the exact auth user ID
    'abenitak9@gmail.com',
    'Admin User',
    'admin',
    NULL, -- Admin has access to all branches
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    branch_id = NULL,
    updated_at = NOW();

-- Verify the profile was created
SELECT 
    id,
    email,
    name,
    role,
    branch_id,
    created_at,
    updated_at
FROM users 
WHERE id = '316d3088-08d1-4034-9d5d-f32b5ef2d0e1';

-- Clean up any other profiles with the same email
DELETE FROM users 
WHERE email = 'abenitak9@gmail.com' 
AND id != '316d3088-08d1-4034-9d5d-f32b5ef2d0e1';

-- Success message
SELECT 'Auth user linked to admin profile successfully!' as result;
