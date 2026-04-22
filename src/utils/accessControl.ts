import { UserRole } from '../types';

// Simplified access control without complex property references
export const ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: [
    'manage_users', 'manage_branches', 'manage_products', 'manage_inventory',
    'manage_sales', 'manage_purchases', 'manage_manufacturing', 'manage_expenses',
    'view_all_reports', 'access_all_branches', 'manage_system_settings', 'create_sales'
  ],
  [UserRole.BRANCH_MANAGER]: [
    'manage_branch_users', 'view_branch_reports', 'manage_branch_sales',
    'manage_branch_inventory', 'manage_branch_expenses', 'access_own_branch', 'create_sales'
  ],
  [UserRole.SALES_STAFF]: [
    'create_sales', 'view_customers', 'manage_customers', 'view_products'
  ],
  [UserRole.WAREHOUSE_STAFF]: [
    'manage_inventory', 'receive_purchases', 'manage_manufacturing', 'view_products'
  ]
};

export const hasPermission = (userRole: UserRole, permission: string): boolean => {
  if (!userRole) return false;
  
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
};

export const canAccessPage = (userRole: UserRole, pagePermission: string): boolean => {
  const pagePermissions = {
    'view_dashboard': ['admin', 'branch_manager', 'sales_staff', 'warehouse_staff'],
    'manage_users': ['admin'],
    'view_users': ['admin'],
    'manage_branches': ['admin'],
    'view_branches': ['admin', 'branch_manager'],
    'manage_branch_users': ['admin', 'branch_manager'],
    'view_branch_users': ['admin', 'branch_manager'],
    'manage_products': ['admin'],
    'view_products': ['admin', 'branch_manager', 'sales_staff', 'warehouse_staff'],
    'manage_inventory': ['admin', 'branch_manager', 'warehouse_staff'],
    'adjust_stock_levels': ['admin', 'branch_manager', 'warehouse_staff'],
    'view_inventory_movements': ['admin', 'branch_manager', 'warehouse_staff'],
    'create_sales': ['admin', 'sales_staff', 'branch_manager'],
    'manage_sales': ['admin', 'sales_staff'],
    'view_sales': ['admin', 'branch_manager', 'sales_staff'],
    'manage_sales_orders': ['admin', 'sales_staff'],
    'view_sales_history': ['admin', 'sales_staff'],
    'view_customers': ['admin', 'sales_staff'],
    'manage_customers': ['admin', 'sales_staff'],
    'create_customers': ['admin', 'sales_staff'],
    'receive_purchases': ['admin', 'warehouse_staff'],
    'manage_manufacturing': ['admin', 'warehouse_staff'],
    'view_all_reports': ['admin'],
    'view_branch_reports': ['admin', 'branch_manager'],
    'manage_branch_expenses': ['admin', 'branch_manager'],
    'access_own_branch': ['admin', 'branch_manager'],
    'manage_system_settings': ['admin']
  };
  
  const allowedRoles = (pagePermissions as any)[pagePermission] || [];
  return allowedRoles.includes(userRole);
};

export const getRoleDescription = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN:
      return 'Full system access - can manage all aspects of the inventory system';
    case UserRole.BRANCH_MANAGER:
      return 'Branch-level access - can manage operations for assigned branch only';
    case UserRole.SALES_STAFF:
      return 'Sales access - can handle sales orders and customer management';
    case UserRole.WAREHOUSE_STAFF:
      return 'Warehouse access - can manage inventory and manufacturing operations';
    default:
      return 'Limited access - contact administrator for permissions';
  }
};
