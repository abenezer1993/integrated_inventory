-- Create Auth User Script
-- Run this if you can't access the Supabase Dashboard

-- Create auth user for abenitak9@gmail.com
-- You'll need to replace 'your_password_here' with your actual password

SELECT auth.admin.create_user(
  email => 'abenitak9@gmail.com',
  password => 'your_password_here',  -- REPLACE THIS!
  email_confirm => true
);

-- Success message
SELECT 'Auth user created successfully! Please update the password in the script above.' as result;
