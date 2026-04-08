-- Fix Profile Link - Update Existing Profile
-- This updates the existing profile to match the auth user ID

-- First, let's see what profiles exist for this email
SELECT 
    id,
    email,
    name,
    role,
    branch_id,
    created_at,
    updated_at
FROM users 
WHERE email = 'abenitak9@gmail.com';

-- Also check the auth user details
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'abenitak9@gmail.com';

-- Update the existing profile to use the correct auth user ID
UPDATE users 
SET 
    id = '316d3088-08d1-4034-9d5d-f32b5ef2d0e1',
    role = 'admin',
    branch_id = NULL,
    updated_at = NOW()
WHERE email = 'abenitak9@gmail.com';

-- Verify the update worked
SELECT 
    id,
    email,
    name,
    role,
    branch_id,
    updated_at
FROM users 
WHERE email = 'abenitak9@gmail.com';

-- Success message
SELECT 'Profile updated and linked to auth user successfully!' as result;
