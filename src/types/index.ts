// User Roles
export enum UserRole {
  ADMIN = 'admin',
  BRANCH_MANAGER = 'branch_manager',
  SALES_STAFF = 'sales_staff',
  WAREHOUSE_STAFF = 'warehouse_staff'
}

// User Profile
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branch_id?: string;
  created_at: string;
}

// Branch/Shop
export interface Branch {
  id: string;
  name: string;
  location: string;
  phone: string;
  manager_id?: string;
  is_active: boolean;
  created_at: string;
}

// Product Categories
export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

// Products/Materials
export interface Product {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  description?: string;
  unit: string; // kg, piece, ton, bag, etc.
  cost_price: number;
  selling_price: number;
  is_manufactured: boolean; // true for manufactured, false for purchased
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

// Inventory per Branch
export interface Inventory {
  id: string;
  product_id: string;
  branch_id: string;
  quantity: number;
  reserved_quantity: number; // for pending orders
  last_updated: string;
  batch_number?: string;
  expiry_date?: string;
}

// Suppliers
export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
}

// Customers
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  credit_limit?: number;
  current_balance: number;
  created_at: string;
}

// Sales Orders
export interface SalesOrder {
  id: string;
  order_number: string;
  branch_id: string;
  customer_id?: string;
  staff_id: string;
  items: SalesOrderItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_type: 'cash' | 'credit' | 'mixed';
  payment_status: 'paid' | 'partial' | 'pending';
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// Purchase Orders
export interface PurchaseOrder {
  id: string;
  order_number: string;
  branch_id: string;
  supplier_id: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'pending' | 'received' | 'cancelled';
  received_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

// Manufacturing Orders
export interface ManufacturingOrder {
  id: string;
  order_number: string;
  branch_id: string;
  finished_product_id?: string;
  product_name?: string;
  quantity_produced: number;
  raw_materials: ManufacturingMaterial[];
  status: 'pending' | 'in_progress' | 'completed';
  completed_at?: string;
  notes?: string;
  product_category?: string;
  product_type?: string;
  created_at: string;
  updated_at: string;
  branches?: {
    id: string;
    name: string;
    location: string;
  };
}

export interface ManufacturingMaterial {
  id: string;
  product_id: string;
  quantity_required: number;
  quantity_used: number;
}

// Manufacturing Expenses
export interface ManufacturingExpense {
  id: string;
  manufacturing_order_id: string;
  expense_type: 'raw_materials' | 'transport' | 'labour' | 'equipment' | 'overhead' | 'other';
  description: string;
  amount: number;
  quantity?: number;
  unit?: string;
  unit_cost?: number;
  created_at: string;
  created_by: string;
}

// Manufacturing Categories (for gypsum work and wood work)
export interface ManufacturingCategory {
  id: string;
  name: string; // e.g., "Gypsum Work", "Wood Work"
  description?: string;
  created_at: string;
}

// Enhanced Manufacturing Order with profitability
export interface ManufacturingOrderWithProfit extends ManufacturingOrder {
  total_expenses: number;
  total_revenue: number;
  profit_margin: number;
  profit_percentage: number;
  is_profitable: boolean;
  expenses: ManufacturingExpense[];
  products?: {
    name: string;
    sku: string;
    unit: string;
    selling_price: number;
  };
}

// Stock Movements/Transfers
export interface StockMovement {
  id: string;
  movement_number: string;
  type: 'transfer' | 'sale' | 'purchase' | 'manufacturing' | 'adjustment';
  from_branch_id?: string;
  to_branch_id?: string;
  product_id: string;
  quantity: number;
  reference_id?: string; // sales_order_id, purchase_order_id, etc.
  notes?: string;
  created_at: string;
  created_by: string;
}

// Expenses
export interface Expense {
  id: string;
  branch_id: string;
  category: string;
  description: string;
  amount: number;
  receipt_number?: string;
  approved_by?: string;
  created_at: string;
  created_by: string;
}

// Reports
export interface SalesReport {
  date: string;
  branch_id: string;
  total_sales: number;
  total_orders: number;
  total_customers: number;
  top_products: ProductSales[];
}

export interface ProductSales {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  revenue: number;
}

// Dashboard Stats
export interface DashboardStats {
  total_products: number;
  total_inventory_value: number;
  today_sales: number;
  month_sales: number;
  low_stock_count: number;
  pending_orders: number;
  total_branches: number;
  active_staff: number;
}
