-- Purchase Materials Registration Schema
-- For Manufacturing Material Management

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    tax_number VARCHAR(100),
    payment_terms VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Material Categories
CREATE TABLE IF NOT EXISTS material_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    unit VARCHAR(50) NOT NULL, -- kg, pcs, bags, boxes, etc.
    min_stock_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials Master List
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category_id UUID REFERENCES material_categories(id),
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    unit_cost DECIMAL(10, 2),
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 1000,
    reorder_point INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    branch_id UUID REFERENCES branches(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, received, cancelled
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    total_amount DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id)
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id),
    quantity DECIMAL(10, 2) NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    received_quantity DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material Inventory (Raw Materials Stock)
CREATE TABLE IF NOT EXISTS material_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materials(id),
    branch_id UUID REFERENCES branches(id),
    quantity DECIMAL(10, 2) DEFAULT 0,
    unit_cost DECIMAL(10, 2) DEFAULT 0,
    total_value DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location VARCHAR(255), -- Storage location within branch
    notes TEXT,
    UNIQUE(material_id, branch_id)
);

-- Material Stock Movements
CREATE TABLE IF NOT EXISTS material_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_number VARCHAR(50) UNIQUE NOT NULL,
    material_id UUID REFERENCES materials(id),
    branch_id UUID REFERENCES branches(id),
    movement_type VARCHAR(50) NOT NULL, -- purchase, usage, adjustment, transfer
    quantity DECIMAL(10, 2) NOT NULL, -- positive for incoming, negative for outgoing
    unit_cost DECIMAL(10, 2),
    reference_id UUID, -- Reference to purchase_order, manufacturing_order, etc.
    reference_type VARCHAR(50), -- purchase_order, manufacturing_order, manual_adjustment
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Insert default material categories
INSERT INTO material_categories (name, description, unit, min_stock_level) VALUES
('Gypsum Powder', 'Raw gypsum powder for gypsum products', 'kg', 100),
('Gypsum Additives', 'Chemical additives for gypsum mixing', 'kg', 50),
('Packaging Materials', 'Bags, boxes, and packaging supplies', 'pcs', 200),
('Wood Planks', 'Raw wood planks for manufacturing', 'pcs', 50),
('Screws & Fasteners', 'Screws, nails, and fastening hardware', 'kg', 25),
('Finishing Materials', 'Paint, varnish, and finishing supplies', 'l', 30),
('Safety Equipment', 'Safety gear and protective equipment', 'pcs', 20),
('Tools & Equipment', 'Manufacturing tools and equipment', 'pcs', 10),
('Transportation', 'Transport and logistics services', 'service', 0),
('Labor Services', 'Contract labor and services', 'service', 0)
ON CONFLICT (name) DO NOTHING;

-- RLS Policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Suppliers
CREATE POLICY "Suppliers are viewable by all authenticated users" ON suppliers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Suppliers can be created by admin and branch_manager" ON suppliers
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        (EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role IN ('admin', 'branch_manager')
        ))
    );

CREATE POLICY "Suppliers can be updated by admin and branch_manager" ON suppliers
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        (EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role IN ('admin', 'branch_manager')
        ))
    );

-- Similar policies for other tables...
CREATE POLICY "Materials are viewable by all authenticated users" ON materials
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Materials can be managed by admin and branch_manager" ON materials
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        (EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role IN ('admin', 'branch_manager')
        ))
    );

-- Purchase Orders Policies
CREATE POLICY "Purchase orders are viewable by all authenticated users" ON purchase_orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Purchase orders can be created by admin and branch_manager" ON purchase_orders
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        (EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role IN ('admin', 'branch_manager')
        ))
    );

CREATE POLICY "Purchase orders can be updated by admin and branch_manager" ON purchase_orders
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        (EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role IN ('admin', 'branch_manager')
        ))
    );

-- Material Inventory Policies
CREATE POLICY "Material inventory is viewable by all authenticated users" ON material_inventory
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Material inventory can be managed by admin and branch_manager" ON material_inventory
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        (EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role IN ('admin', 'branch_manager')
        ))
    );

-- Stock Movements Policies
CREATE POLICY "Stock movements are viewable by all authenticated users" ON material_stock_movements
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Stock movements can be created by authenticated users" ON material_stock_movements
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch_id ON purchase_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_material_id ON purchase_order_items(material_id);
CREATE INDEX IF NOT EXISTS idx_material_inventory_material_id ON material_inventory(material_id);
CREATE INDEX IF NOT EXISTS idx_material_inventory_branch_id ON material_inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_movements_material_id ON material_stock_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_movements_branch_id ON material_stock_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_movements_type ON material_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_material_stock_movements_created_at ON material_stock_movements(created_at);

-- Updated triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_inventory_updated_at BEFORE UPDATE ON material_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
