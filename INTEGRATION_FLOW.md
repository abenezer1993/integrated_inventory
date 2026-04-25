# Integration Flow: Purchase → Expenses → Manufacturing

## 🎯 System Integration Overview

This document explains how the Purchase Materials System integrates with the Expenses Module and Manufacturing Module to create a complete material tracking and cost allocation workflow.

## 🔄 Complete Integration Flow

```
🛒 Purchase Materials → 📦 Receive Materials → 🏭 Manufacturing Process → 💰 Cost Allocation → 📊 Analytics
```

## 📋 Step-by-Step Integration

### **Step 1: Purchase Materials System**
**Purpose:** Acquire raw materials and supplies

**Process:**
1. Create Purchase Order with supplier
2. Receive materials and update raw material inventory
3. Record purchase costs and supplier information

**Data Flow:**
```javascript
// Purchase Order Created
{
  order_number: "PO20240424001",
  supplier_id: "supplier-uuid",
  total_amount: 15000,
  items: [
    {
      material_id: "gypsum-powder-uuid",
      quantity: 100,
      unit_cost: 15,
      total_cost: 1500
    }
  ]
}

// Material Inventory Updated
{
  material_id: "gypsum-powder-uuid",
  quantity: 100,
  unit_cost: 15,
  total_value: 1500
}
```

### **Step 2: Manufacturing Process Integration**
**Purpose:** Consume raw materials during production

**Process:**
1. Create Manufacturing Order for finished products
2. Select raw materials to be consumed
3. Update material inventory (reduce stock)
4. Record material consumption in expenses

**Data Flow:**
```javascript
// Manufacturing Order Created
{
  order_number: "MFG20240424001",
  product_name: "Gypsum Board 8x4",
  quantity_produced: 50,
  materials_consumed: [
    {
      material_id: "gypsum-powder-uuid",
      quantity_consumed: 25,
      unit_cost: 15,
      total_cost: 375
    }
  ]
}

// Material Stock Movement Recorded
{
  movement_type: "usage",
  material_id: "gypsum-powder-uuid",
  quantity: -25, // Negative for consumption
  reference_id: "mfg-order-uuid",
  reference_type: "manufacturing_order"
}

// Material Inventory Updated
{
  material_id: "gypsum-powder-uuid",
  quantity: 75, // 100 - 25 consumed
  unit_cost: 15,
  total_value: 1125
}
```

### **Step 3: Expenses Module Integration**
**Purpose:** Track material costs in manufacturing expenses

**Process:**
1. Automatically create expense entries for consumed materials
2. Link expenses to manufacturing orders
3. Calculate total manufacturing costs (materials + labor + overhead)

**Data Flow:**
```javascript
// Manufacturing Expense Created
{
  expense_type: "raw_materials",
  description: "Gypsum powder for MFG20240424001",
  amount: 375,
  quantity: 25,
  unit_cost: 15,
  manufacturing_order_id: "mfg-order-uuid",
  created_at: "2024-04-24T10:30:00Z"
}

// Manufacturing Order Cost Summary
{
  order_id: "mfg-order-uuid",
  product_name: "Gypsum Board 8x4",
  quantity_produced: 50,
  total_materials_cost: 375,
  total_labor_cost: 500,
  total_overhead_cost: 125,
  total_cost: 1000,
  cost_per_unit: 20
}
```

## 🔗 Integration Implementation

### **1. Database Integration Points**

#### **Material Stock Movements Table**
```sql
CREATE TABLE material_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_number VARCHAR(50) UNIQUE NOT NULL,
  material_id UUID REFERENCES materials(id),
  branch_id UUID REFERENCES branches(id),
  movement_type VARCHAR(50) NOT NULL, -- 'purchase', 'usage', 'adjustment', 'transfer'
  quantity DECIMAL(10, 2) NOT NULL, -- Positive for incoming, negative for outgoing
  unit_cost DECIMAL(10, 2),
  reference_id UUID, -- Link to purchase_order or manufacturing_order
  reference_type VARCHAR(50), -- 'purchase_order', 'manufacturing_order', 'manual_adjustment'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

#### **Manufacturing Expenses Integration**
```sql
-- Link material consumption to manufacturing expenses
ALTER TABLE manufacturing_expenses 
ADD COLUMN material_stock_movement_id UUID REFERENCES material_stock_movements(id);

-- Add material cost tracking to manufacturing orders
ALTER TABLE manufacturing_orders
ADD COLUMN total_materials_cost DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN materials_consumed JSONB; -- Store consumed materials details
```

### **2. API Integration Functions**

#### **Material Consumption Function**
```typescript
async function consumeMaterialsForManufacturing(
  manufacturingOrderId: string,
  materials: Array<{
    material_id: string;
    quantity_consumed: number;
    notes?: string;
  }>
) {
  // 1. Check material availability
  // 2. Update material inventory
  // 3. Record stock movements
  // 4. Create manufacturing expenses
  // 5. Update manufacturing order costs
}
```

#### **Purchase Order Receiving Function**
```typescript
async function receivePurchaseOrder(
  purchaseOrderId: string,
  receivedItems: Array<{
    material_id: string;
    quantity_received: number;
    unit_cost: number;
  }>
) {
  // 1. Update purchase order status
  // 2. Add materials to inventory
  // 3. Record stock movements
  // 4. Update material costs
}
```

### **3. Real-time Cost Allocation**

#### **Manufacturing Cost Calculation**
```typescript
interface ManufacturingCostBreakdown {
  materials_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_cost: number;
  cost_per_unit: number;
  profit_margin: number;
}

async function calculateManufacturingCosts(manufacturingOrderId: string) {
  // 1. Sum material expenses
  // 2. Add labor costs
  // 3. Calculate overhead allocation
  // 4. Determine cost per unit
  // 5. Calculate profit margin
}
```

## 📊 Data Flow Diagram

```
Purchase Materials System
├── Purchase Order Created
│   ├── Supplier Information
│   ├── Materials Ordered
│   └── Total Cost
├── Materials Received
│   ├── Update Material Inventory
│   ├── Record Stock Movement (purchase)
│   └── Update Material Costs
│
Manufacturing System
├── Manufacturing Order Created
│   ├── Product Information
│   ├── Materials Selected
│   └── Production Planning
├── Materials Consumed
│   ├── Update Material Inventory
│   ├── Record Stock Movement (usage)
│   └── Create Material Expenses
│
Expenses System
├── Material Expenses Created
│   ├── Link to Manufacturing Order
│   ├── Material Cost Details
│   └── Cost Allocation
├── Total Manufacturing Costs
│   ├── Materials + Labor + Overhead
│   ├── Cost Per Unit Calculation
│   └── Profit Margin Analysis
```

## 🎯 Integration Benefits

### **1. Complete Cost Visibility**
- **Material Costs:** Track exact material consumption per product
- **Labor Costs:** Employee time and wages for production
- **Overhead Costs:** Factory overhead and administrative costs
- **Total Cost:** Complete manufacturing cost breakdown

### **2. Real-time Inventory Management**
- **Raw Material Stock:** Always know current material levels
- **Reorder Alerts:** Automatic notifications for low stock
- **Consumption Tracking:** Material usage per manufacturing order
- **Cost Valuation:** Real-time material value calculation

### **3. Manufacturing Analytics**
- **Product Profitability:** Material costs vs selling prices
- **Cost Trends:** Material cost changes over time
- **Efficiency Metrics:** Material usage efficiency
- **Supplier Performance:** Cost and delivery analysis

### **4. Financial Integration**
- **Expense Tracking:** All material costs recorded in expenses
- **Budget Management:** Track material expenses against budgets
- **Profit Analysis:** Complete profitability per product
- **Cost Control:** Identify cost reduction opportunities

## 🔧 Implementation Steps

### **Phase 1: Database Setup**
1. ✅ Create material stock movements table
2. ✅ Add material cost tracking to manufacturing orders
3. ✅ Link expenses to stock movements
4. ✅ Set up foreign key relationships

### **Phase 2: API Integration**
1. ✅ Implement material consumption functions
2. ✅ Create purchase order receiving functions
3. ✅ Build cost calculation functions
4. ✅ Add real-time inventory updates

### **Phase 3: UI Integration**
1. ✅ Add material selection to manufacturing orders
2. ✅ Display material costs in expenses
3. ✅ Show inventory levels in manufacturing
4. ✅ Create cost breakdown reports

### **Phase 4: Analytics & Reporting**
1. ✅ Material consumption reports
2. ✅ Cost trend analysis
3. ✅ Supplier performance metrics
4. ✅ Manufacturing profitability reports

## 📋 Example Workflow

### **Gypsum Board Manufacturing Example**

#### **Step 1: Purchase Materials**
```
Purchase Order: PO20240424001
- Gypsum Powder: 100kg @ ETB 15/kg = ETB 1,500
- Additives: 20kg @ ETB 5/kg = ETB 100
- Packaging: 50 bags @ ETB 2/bag = ETB 100
Total: ETB 1,700
```

#### **Step 2: Manufacturing Process**
```
Manufacturing Order: MFG20240424001
Product: Gypsum Board 8x4
Quantity: 50 units
Materials Consumed:
- Gypsum Powder: 25kg @ ETB 15/kg = ETB 375
- Additives: 5kg @ ETB 5/kg = ETB 25
- Packaging: 25 bags @ ETB 2/bag = ETB 50
Total Material Cost: ETB 450
```

#### **Step 3: Cost Allocation**
```
Manufacturing Costs:
- Materials: ETB 450
- Labor: ETB 500 (5 workers @ ETB 100/day)
- Overhead: ETB 125 (25% of labor)
Total Cost: ETB 1,075
Cost per Unit: ETB 21.50
Selling Price: ETB 35.00
Profit per Unit: ETB 13.50
Profit Margin: 38.6%
```

#### **Step 4: Inventory Updates**
```
Raw Material Inventory:
- Gypsum Powder: 100kg - 25kg = 75kg remaining
- Additives: 20kg - 5kg = 15kg remaining
- Packaging: 50 bags - 25 bags = 25 bags remaining

Finished Product Inventory:
- Gypsum Board 8x4: +50 units
- Total Value: 50 × ETB 35 = ETB 1,750
```

## 🎉 Integration Complete

The integrated system provides:

- **✅ Complete Material Tracking** from purchase to consumption
- **✅ Accurate Cost Allocation** for manufacturing profitability
- **✅ Real-time Inventory Management** for raw materials
- **✅ Comprehensive Expense Tracking** in manufacturing module
- **✅ Detailed Analytics** for business decision-making

**This integration creates a seamless flow from purchasing raw materials to manufacturing finished products, with complete cost visibility and inventory management at every step!** 🚀
