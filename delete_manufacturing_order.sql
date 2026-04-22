-- RPC function to delete manufacturing order and related records
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION delete_manufacturing_order_with_related(order_id_param UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    product_name_var TEXT;
BEGIN
    -- Get the product name first
    SELECT product_name INTO product_name_var
    FROM manufacturing_orders 
    WHERE id = order_id_param;
    
    -- Delete stock movements that reference the manufactured products
    DELETE FROM stock_movements 
    WHERE manufactured_product_id IN (
        SELECT id 
        FROM manufactured_products 
        WHERE name = product_name_var
    );
    
    -- Delete stock movements that reference the manufacturing order directly
    DELETE FROM stock_movements 
    WHERE reference_id = order_id_param 
    AND reference_type = 'manufacturing_order';
    
    -- Delete inventory records that reference the manufactured products
    DELETE FROM inventory 
    WHERE manufactured_product_id IN (
        SELECT id 
        FROM manufactured_products 
        WHERE name = product_name_var
    );
    
    -- Now delete the manufactured products (no more references)
    DELETE FROM manufactured_products 
    WHERE name = product_name_var;
    
    -- Finally delete the main manufacturing order
    DELETE FROM manufacturing_orders 
    WHERE id = order_id_param;
    
    -- Return success result
    RETURN QUERY VALUES (true, 'Manufacturing order deleted successfully');
END;
$$;

-- Grant permission to execute the function
GRANT EXECUTE ON FUNCTION delete_manufacturing_order_with_related TO authenticated;
