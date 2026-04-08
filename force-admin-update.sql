-- Force Admin Role Update
-- This script ensures abenitak9@gmail.com has proper admin role and permissions

-- First, let's check the current user data
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

-- Force update the admin role
UPDATE users 
SET 
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

-- Also check if there are any duplicate users
SELECT 
    email,
    COUNT(*) as user_count
FROM users 
WHERE email = 'abenitak9@gmail.com'
GROUP BY email;

-- If there are duplicates, delete non-admin ones
DELETE FROM users 
WHERE email = 'abenitak9@gmail.com' 
AND role != 'admin';

-- Final verification
SELECT 'Admin role update completed!' as result,
       (SELECT COUNT(*) FROM users WHERE email = 'abenitak9@gmail.com' AND role = 'admin') as admin_count;
