-- Check purchase_orders table structure and any triggers
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND table_schema = current_schema()
ORDER BY ordinal_position;

-- Check for any triggers on the purchase_orders table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'purchase_orders'
AND trigger_schema = current_schema();

-- Check for any default values specifically for status column
SELECT 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND column_name = 'status'
AND table_schema = current_schema();
