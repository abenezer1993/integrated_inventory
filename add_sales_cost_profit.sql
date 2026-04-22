-- Add cost_price and profit columns to sales table
ALTER TABLE sales 
ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN profit DECIMAL(10,2) DEFAULT 0.00;

-- Add comments
COMMENT ON COLUMN sales.cost_price IS 'Cost price of the product for profit calculation';
COMMENT ON COLUMN sales.profit IS 'Profit made on this sale (selling_price - cost_price) * quantity';
