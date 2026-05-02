-- Check the actual column names in purchase_orders table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check a sample of actual data
SELECT * FROM purchase_orders LIMIT 3;
