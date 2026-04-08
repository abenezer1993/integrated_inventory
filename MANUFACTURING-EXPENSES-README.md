# Manufacturing Expenses & Profitability System

## 🎯 Overview
This system links manufacturing with expenses to provide complete profitability tracking for gypsum work and wood work products.

## 📊 Features Added

### 1. **Expense Categories**
- **Raw Materials** - Gypsum powder, wood planks, cement, etc.
- **Transport** - Fuel, delivery costs, vehicle expenses
- **Labour Cost** - Worker wages, contractor fees
- **Equipment** - Tools, machinery rental/purchase
- **Overhead** - Electricity, rent, administrative costs
- **Other** - Miscellaneous expenses

### 2. **Profitability Calculations**
- **Total Revenue** = Product Selling Price × Quantity Produced
- **Total Expenses** = Sum of all expense amounts
- **Profit Margin** = Total Revenue - Total Expenses
- **Profit Percentage** = (Profit Margin / Total Revenue) × 100
- **Is Profitable** = Profit Margin > 0

### 3. **Enhanced Manufacturing Page**
- **Add Expense Button** - Orange button next to Record Production
- **Expense Form Modal** - Comprehensive expense tracking
- **Profitability Dashboard** - Real-time profit calculations
- **Enhanced Table** - Shows revenue, expenses, profit, margin %

## 🗄 Database Schema

### manufacturing_expenses Table
```sql
CREATE TABLE manufacturing_expenses (
    id UUID PRIMARY KEY,
    manufacturing_order_id UUID REFERENCES manufacturing_orders(id),
    expense_type VARCHAR(20) CHECK (expense_type IN (
        'raw_materials', 'transport', 'labour', 'equipment', 'overhead', 'other'
    )),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    quantity DECIMAL(12,3),
    unit VARCHAR(20),
    unit_cost DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
```

### manufacturing_categories Table
```sql
CREATE TABLE manufacturing_categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎨 User Interface

### Header Section
```
Manufacturing
Record finished goods production

[Record Production] [Add Expense]
```

### Expense Form
```
Add Manufacturing Expense

Manufacturing Order:*
[Select Order dropdown]

Expense Type:*
[Raw Materials | Transport | Labour Cost | Equipment | Overhead | Other]

Description:*
[Gypsum powder, Wood planks, Fuel cost]

Amount (ETB):*
[0.00]

Quantity (optional):
[50]

Unit (optional):
[kg, bags, hours]

Unit Cost (ETB):
[0.00]

[Add Expense] [Cancel]
```

### Enhanced Production Table
```
Order | Product | Quantity | Status | Date | Revenue | Expenses | Profit | Margin % | Notes
MFG001 | Gypsum Block | 100 | Completed | 2024-04-07 | 15,000 | 12,000 | 3,000 | 20% | Client order
MFG002 | Wood Door | 25 | In Progress | 2024-04-07 | 7,500 | 8,000 | -500 | -6.7% | Custom design
```

## 🚀 How It Works

### 1. **Record Production**
1. Click "Record Production"
2. Select product (Gypsum Work or Wood Work)
3. Enter quantity produced
4. Add notes
5. System creates manufacturing order
6. Updates inventory automatically

### 2. **Add Expenses**
1. Click "Add Expense"
2. Select manufacturing order from dropdown
3. Choose expense type (6 categories)
4. Enter description and amount
5. Optionally add quantity, unit, unit cost
6. System links expense to order

### 3. **View Profitability**
1. Production table shows real-time calculations
2. Green text = profitable orders
3. Red text = unprofitable orders
4. Margin % shows profit percentage
5. Revenue, expenses, profit clearly displayed

## 📈 Business Benefits

### For Gypsum Work
- **Raw Material Tracking** - Gypsum powder, additives, packaging
- **Transport Costs** - Delivery to construction sites
- **Labour Costs** - Skilled worker wages
- **Equipment Costs** - Mixing machines, molds
- **Profit Analysis** - Per batch profitability

### For Wood Work
- **Material Tracking** - Wood planks, hardware, finishes
- **Transport Costs** - Lumber delivery, site transport
- **Labour Costs** - Carpenter wages, specialist fees
- **Tool Costs** - Power tools, workshop equipment
- **Margin Analysis** - Project vs material costs

## 💰 Financial Insights

### Real-time Profitability
- **Per Order Analysis** - See profit on each manufacturing batch
- **Category Breakdown** - Understand cost drivers
- **Trend Analysis** - Track profitability over time
- **Decision Support** - Focus on profitable products

### Cost Management
- **Expense Tracking** - Never lose track of costs
- **Budget Control** - Compare actual vs estimated costs
- **Supplier Management** - Track material supplier costs
- **Resource Planning** - Optimize material usage

## 🔧 Technical Implementation

### Frontend Changes
- **New Types Added** - ManufacturingExpense, ManufacturingOrderWithProfit
- **State Management** - Expense form state handling
- **API Integration** - Supabase expense operations
- **UI Components** - Expense modal, enhanced table

### Backend Changes
- **Database Tables** - manufacturing_expenses, manufacturing_categories
- **RLS Policies** - Secure expense access control
- **Data Relationships** - Expenses linked to orders
- **Calculation Logic** - Automatic profit computations

### Data Flow
1. **Manufacturing Order Created** → Base record
2. **Expenses Added** → Linked to order
3. **Profit Calculated** → Revenue - Expenses
4. **Updated in Real-time** → Live profitability display

## 🎯 Usage Examples

### Gypsum Block Production
```
Production: 100 blocks @ ETB 150 each = ETB 15,000 revenue
Expenses:
- Raw Materials: ETB 8,000 (gypsum powder, additives)
- Transport: ETB 2,000 (delivery to site)
- Labour: ETB 1,500 (mixing, molding)
- Equipment: ETB 500 (mold rental, tools)
Total Expenses: ETB 12,000
Profit: ETB 3,000 (20% margin)
Status: ✅ Profitable
```

### Wood Door Manufacturing
```
Production: 25 doors @ ETB 300 each = ETB 7,500 revenue
Expenses:
- Raw Materials: ETB 4,000 (wood planks, hardware)
- Labour: ETB 3,000 (carpentry work)
- Transport: ETB 1,000 (delivery)
Total Expenses: ETB 8,000
Profit: ETB -500 (-6.7% margin)
Status: ❌ Unprofitable
```

## 📊 Reports & Analytics

### Profitability Reports
- **Per Product Analysis** - Most profitable items
- **Per Category Analysis** - Raw materials vs labour vs transport
- **Time-based Trends** - Monthly profitability changes
- **Expense Breakdown** - Cost category analysis

### Decision Making
- **Product Focus** - Double down on profitable products
- **Cost Optimization** - Reduce high expense categories
- **Pricing Strategy** - Adjust prices for unprofitable items
- **Process Improvement** - Streamline expensive operations

## 🚀 Next Steps

### Advanced Features
- **Expense Budgeting** - Set expense limits per order
- **Supplier Integration** - Link expenses to suppliers
- **Cost Forecasting** - Predict expenses for future orders
- **Profit Alerts** - Notifications for low margins

### Integration Points
- **Accounting System** - Export expense data
- **Inventory System** - Material usage tracking
- **Sales System** - Revenue vs cost analysis
- **Reporting Dashboard** - Executive profitability views

---

**Result: Complete manufacturing expense tracking with real-time profitability analysis for gypsum work and wood work products! 🎉**
