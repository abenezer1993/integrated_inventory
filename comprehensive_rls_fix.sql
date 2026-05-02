-- COMPREHENSIVE RLS FIX FOR ALL MANUFACTURING-RELATED TABLES
-- This prevents similar issues in the future

-- 1. MANUFACTURED_PRODUCTS TABLE
ALTER TABLE manufactured_products DISABLE ROW LEVEL SECURITY;

-- 2. PRODUCTS TABLE (for fallback)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 3. INVENTORY TABLE 
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;

-- 4. STOCK_MOVEMENTS TABLE
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;

-- 5. MANUFACTURING_ORDERS TABLE
ALTER TABLE manufacturing_orders DISABLE ROW LEVEL SECURITY;

-- 6. MANUFACTURING_EXPENSES TABLE
ALTER TABLE manufacturing_expenses DISABLE ROW LEVEL SECURITY;

-- 7. MANUFACTURING_MATERIALS TABLE
ALTER TABLE manufacturing_materials DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled for all critical tables
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename IN (
    'manufactured_products', 
    'products', 
    'inventory', 
    'stock_movements',
    'manufacturing_orders',
    'manufacturing_expenses',
    'manufacturing_materials'
)
ORDER BY tablename;

-- Alternative: If you want to keep RLS enabled with proper policies
-- Uncomment and run the section below instead of disabling RLS

/*
-- CREATE PROPER RLS POLICIES FOR ALL TABLES

-- Manufactured Products
DROP POLICY IF EXISTS "manufactured_products_all" ON manufactured_products;
CREATE POLICY "manufactured_products_all" ON manufactured_products
    FOR ALL USING (auth.role() = 'authenticated');

-- Products  
DROP POLICY IF EXISTS "products_all" ON products;
CREATE POLICY "products_all" ON products
    FOR ALL USING (auth.role() = 'authenticated');

-- Inventory
DROP POLICY IF EXISTS "inventory_all" ON inventory;
CREATE POLICY "inventory_all" ON inventory
    FOR ALL USING (auth.role() = 'authenticated');

-- Stock Movements
DROP POLICY IF EXISTS "stock_movements_all" ON stock_movements;
CREATE POLICY "stock_movements_all" ON stock_movements
    FOR ALL USING (auth.role() = 'authenticated');

-- Manufacturing Orders
DROP POLICY IF EXISTS "manufacturing_orders_all" ON manufacturing_orders;
CREATE POLICY "manufacturing_orders_all" ON manufacturing_orders
    FOR ALL USING (auth.role() = 'authenticated');

-- Manufacturing Expenses
DROP POLICY IF EXISTS "manufacturing_expenses_all" ON manufacturing_expenses;
CREATE POLICY "manufacturing_expenses_all" ON manufacturing_expenses
    FOR ALL USING (auth.role() = 'authenticated');

-- Manufacturing Materials
DROP POLICY IF EXISTS "manufacturing_materials_all" ON manufacturing_materials;
CREATE POLICY "manufacturing_materials_all" ON manufacturing_materials
    FOR ALL USING (auth.role() = 'authenticated');

-- Enable RLS again
ALTER TABLE manufactured_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_materials ENABLE ROW LEVEL SECURITY;
*/
