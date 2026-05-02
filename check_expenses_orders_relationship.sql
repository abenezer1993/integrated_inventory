-- Check the structure of manufacturing_expenses table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'manufacturing_expenses' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'manufacturing_expenses';

-- Check sample data from manufacturing_expenses
SELECT 
    id,
    manufacturing_order_id,
    expense_type,
    description,
    amount,
    created_at
FROM manufacturing_expenses 
LIMIT 5;

-- Check if these order IDs exist in manufacturing_orders
SELECT 
    e.id as expense_id,
    e.manufacturing_order_id,
    mo.id as order_exists,
    mo.order_number,
    mo.product_name
FROM manufacturing_expenses e
LEFT JOIN manufacturing_orders mo ON e.manufacturing_order_id = mo.id
WHERE e.manufacturing_order_id IS NOT NULL
LIMIT 5;
