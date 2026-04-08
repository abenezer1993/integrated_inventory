-- Fix Admin Role Script
-- This ensures the auth user gets admin role properly

-- Update the admin user to ensure proper role
UPDATE users 
SET 
    role = 'admin',
    updated_at = NOW()
WHERE email = 'abenitak9@gmail.com';

-- Verify the update
SELECT 
    email,
    name,
    role,
    branch_id,
    updated_at
FROM users 
WHERE email = 'abenitak9@gmail.com';

-- Success message
SELECT 'Admin role fixed successfully! User now has admin privileges.' as result;
