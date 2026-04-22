-- Add employee_id column to manufacturing_orders table
-- Run this in your Supabase SQL Editor

-- Add employee_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_orders' 
        AND column_name = 'employee_id'
    ) THEN
        ALTER TABLE manufacturing_orders ADD COLUMN employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_employee_id ON manufacturing_orders(employee_id);

-- Update RPC function to include employee_id
CREATE OR REPLACE FUNCTION get_manufacturing_orders_with_branches()
RETURNS TABLE (
    id UUID,
    order_number VARCHAR(50),
    branch_id UUID,
    employee_id UUID,
    product_name VARCHAR(255),
    quantity_produced INTEGER,
    status VARCHAR(20),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    product_category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    branches_id UUID,
    branches_name VARCHAR(255),
    branches_location VARCHAR(255),
    employees_id UUID,
    employees_full_name VARCHAR(255),
    employees_position VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mo.id,
        mo.order_number,
        mo.branch_id,
        mo.employee_id,
        mo.product_name,
        mo.quantity_produced,
        mo.status,
        mo.completed_at,
        mo.notes,
        mo.product_category,
        mo.created_at,
        mo.updated_at,
        b.id AS branches_id,
        b.name AS branches_name,
        b.location AS branches_location,
        e.id AS employees_id,
        e.full_name AS employees_full_name,
        e.position AS employees_position
    FROM manufacturing_orders mo
    LEFT JOIN branches b ON mo.branch_id = b.id
    LEFT JOIN employees e ON mo.employee_id = e.id
    ORDER BY mo.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions on the function
GRANT EXECUTE ON FUNCTION get_manufacturing_orders_with_branches TO authenticated;
