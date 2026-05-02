-- Check if the finished_product_id exists in manufactured_products table
SELECT 
    mo.id as manufacturing_order_id,
    mo.order_number,
    mo.product_name,
    mo.finished_product_id,
    mp.id as manufactured_product_id,
    mp.name as manufactured_product_name
FROM manufacturing_orders mo
LEFT JOIN manufactured_products mp ON mo.finished_product_id = mp.id
WHERE mo.finished_product_id IS NOT NULL
LIMIT 10;

-- Check for any orphaned finished_product_ids
SELECT 
    mo.id,
    mo.order_number,
    mo.product_name,
    mo.finished_product_id
FROM manufacturing_orders mo
WHERE mo.finished_product_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM manufactured_products mp 
    WHERE mp.id = mo.finished_product_id
);

-- Check manufactured_products table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'manufactured_products'
ORDER BY ordinal_position;
