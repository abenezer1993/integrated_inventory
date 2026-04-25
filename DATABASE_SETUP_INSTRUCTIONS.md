# Database Setup Instructions

## 🗄️ Execute in Supabase SQL Editor

### **Step 1: Open Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your inventory management project
3. Click on **SQL Editor** in the left sidebar
4. Click **"New query"**

### **Step 2: Execute This SQL**

Copy and paste the entire content of `purchase_materials_schema.sql` into the SQL editor and click **"Run"**.

### **Step 3: Verify Tables Created**
After execution, verify these tables exist:
- ✅ `suppliers`
- ✅ `material_categories` 
- ✅ `materials`
- ✅ `purchase_orders`
- ✅ `purchase_order_items`
- ✅ `material_inventory`
- ✅ `material_stock_movements`

### **Step 4: Check Default Data**
The schema includes default material categories:
- Gypsum Powder
- Gypsum Additives
- Packaging Materials
- Wood Planks
- Screws & Fasteners
- Finishing Materials
- Safety Equipment
- Tools & Equipment
- Transportation
- Labor Services

### **Step 5: Test the System**
Once tables are created, the Purchases page should be fully functional with:
- Material registration
- Supplier management
- Purchase order creation
- Inventory tracking

## 🔍 Troubleshooting

### **If you get errors:**
1. Check if tables already exist (use "DROP TABLE IF EXISTS" if needed)
2. Verify your Supabase permissions
3. Check for syntax errors in the SQL

### **If tables exist but no data:**
1. The INSERT statements for material categories should run automatically
2. If not, run them manually:
```sql
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
('Labor Services', 'Contract labor and services', 'service', 0);
```

## ✅ Success Indicators

After successful execution, you should see:
1. **"Query executed successfully"** message
2. **All 7 tables** created in your database
3. **10 default material categories** inserted
4. **Purchases page** becomes fully functional

## 🚀 Next Steps

After database setup:
1. Test the Purchases page functionality
2. Add some sample suppliers and materials
3. Create a test purchase order
4. Verify integration with manufacturing system
