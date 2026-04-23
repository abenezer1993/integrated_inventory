-- Create function to log access
CREATE OR REPLACE FUNCTION log_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Get current user info from auth context
  DECLARE
    current_user_id UUID;
    current_user_name TEXT;
    current_user_email TEXT;
    current_user_role TEXT;
  BEGIN
    -- Try to get user info from auth.users
    SELECT 
      auth.uid(),
      COALESCE(u.name, 'Unknown'),
      COALESCE(auth.jwt()->>'email', 'unknown@example.com'),
      COALESCE(u.role, 'unknown')
    INTO 
      current_user_id,
      current_user_name,
      current_user_email,
      current_user_role
    FROM auth.users au
    LEFT JOIN users u ON u.id = au.id
    WHERE au.id = auth.uid();
    
    -- Insert into access_logs
    INSERT INTO access_logs (
      user_id,
      user_name,
      user_email,
      user_role,
      action,
      resource,
      resource_id,
      method,
      ip_address,
      user_agent,
      details
    ) VALUES (
      current_user_id,
      current_user_name,
      current_user_email,
      current_user_role,
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id)::TEXT,
      'TRIGGER',
      'SYSTEM_IP',
      'SYSTEM_AGENT',
      json_build_object(
        'old_data', OLD,
        'new_data', NEW,
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'timestamp', NOW()
      )
    );
    
    RETURN COALESCE(NEW, OLD);
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the original operation
      RETURN COALESCE(NEW, OLD);
  END;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all important tables
-- Products table
DROP TRIGGER IF EXISTS products_access_log ON products;
CREATE TRIGGER products_access_log
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION log_access();

-- Sales table
DROP TRIGGER IF EXISTS sales_access_log ON sales;
CREATE TRIGGER sales_access_log
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION log_access();

-- Inventory table
DROP TRIGGER IF EXISTS inventory_access_log ON inventory;
CREATE TRIGGER inventory_access_log
  AFTER INSERT OR UPDATE OR DELETE ON inventory
  FOR EACH ROW EXECUTE FUNCTION log_access();

-- Employees table
DROP TRIGGER IF EXISTS employees_access_log ON employees;
CREATE TRIGGER employees_access_log
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION log_access();

-- Branches table
DROP TRIGGER IF EXISTS branches_access_log ON branches;
CREATE TRIGGER branches_access_log
  AFTER INSERT OR UPDATE OR DELETE ON branches
  FOR EACH ROW EXECUTE FUNCTION log_access();

-- Manufacturing orders table
DROP TRIGGER IF EXISTS manufacturing_orders_access_log ON manufacturing_orders;
CREATE TRIGGER manufacturing_orders_access_log
  AFTER INSERT OR UPDATE OR DELETE ON manufacturing_orders
  FOR EACH ROW EXECUTE FUNCTION log_access();

-- Purchase orders table
DROP TRIGGER IF EXISTS purchase_orders_access_log ON purchase_orders;
CREATE TRIGGER purchase_orders_access_log
  AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION log_access();

-- Users table (for user management)
DROP TRIGGER IF EXISTS users_access_log ON users;
CREATE TRIGGER users_access_log
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION log_access();
