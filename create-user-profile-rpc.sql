-- Create RPC function to get user profile without auth locks
-- This bypasses the Supabase client locking issues

CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    branch_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.branch_id,
        u.created_at,
        u.updated_at
    FROM users u
    WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to execute the function
GRANT EXECUTE ON FUNCTION get_user_profile TO authenticated;

-- Test the function (optional)
-- SELECT * FROM get_user_profile('316d3088-08d1-4034-9d5d-f32b5ef2d0e1');
