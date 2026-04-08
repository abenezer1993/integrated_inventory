-- Complete Admin Fix - Comprehensive Solution
-- This addresses all potential issues with admin access

-- Step 1: Check current state
SELECT '=== CURRENT AUTH USER ===' as info;
SELECT 
    id as auth_id,
    email as auth_email,
    created_at as auth_created
FROM auth.users 
WHERE email = 'abenitak9@gmail.com';

SELECT '=== CURRENT PROFILE ===' as info;
SELECT 
    id as profile_id,
    email as profile_email,
    name,
    role,
    branch_id,
    created_at as profile_created,
    updated_at as profile_updated
FROM users 
WHERE email = 'abenitak9@gmail.com';

-- Step 2: Delete any existing profiles for this email (clean slate)
DELETE FROM users 
WHERE email = 'abenitak9@gmail.com';

-- Step 3: Create the correct admin profile with exact auth user ID
INSERT INTO users (id, email, name, role, branch_id, created_at, updated_at)
VALUES 
(
    '316d3088-08d1-4034-9d5d-f32b5ef2d0e1', -- Exact auth user ID
    'abenitak9@gmail.com',
    'Admin User',
    'admin',
    NULL, -- Admin has access to all branches
    NOW(),
    NOW()
);

-- Step 4: Verify the profile was created correctly
SELECT '=== VERIFICATION ===' as info;
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

-- Step 5: Double-check the auth user still exists
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'abenitak9@gmail.com';

-- Step 6: Test the relationship (this should return 1 row)
SELECT '=== RELATIONSHIP TEST ===' as info;
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    u.id as profile_id,
    u.email as profile_email,
    u.role as profile_role,
    CASE 
        WHEN au.id = u.id THEN 'MATCHING'
        ELSE 'NOT MATCHING'
    END as status
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.email = 'abenitak9@gmail.com';

-- Success message
SELECT 'Complete admin fix applied successfully!' as result,
       (SELECT COUNT(*) FROM users WHERE email = 'abenitak9@gmail.com' AND role = 'admin') as admin_profile_count;
