-- Check the actual enum values for order_status
SELECT 
    enumlabel AS enum_value
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'order_status'
)
ORDER BY enumlabel;

-- Alternative: Check table constraints
SELECT 
    conname,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'purchase_orders'::regclass 
AND contype = 'c';

-- Check if there's a check constraint on status
SELECT 
    conname,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'purchase_orders'::regclass 
AND conkey @> ARRAY[
    (SELECT attnum FROM pg_attribute WHERE attrelid = 'purchase_orders'::regclass AND attname = 'status')
];
