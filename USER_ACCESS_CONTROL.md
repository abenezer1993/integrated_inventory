# User Access Control Matrix

## User Roles and Permissions

### 1. ADMIN (admin)
**Full system access - can manage everything**
- ✅ **User Management:** Create, read, update, delete users
- ✅ **Branch Management:** Create, read, update, delete branches
- ✅ **Product Management:** Create, read, update, delete products
- ✅ **Inventory Management:** Read, update, adjust inventory across all branches
- ✅ **Sales Management:** Create, read, update, delete sales orders
- ✅ **Purchase Management:** Create, read, update, delete purchase orders
- ✅ **Manufacturing:** Create, read, update, delete manufacturing orders
- ✅ **Expense Management:** Create, read, update, delete expenses
- ✅ **Reports:** View all system reports (company-wide)
- ✅ **All Branches:** Can access data from any branch

### 2. BRANCH MANAGER (branch_manager)
**Branch-level access - can manage their assigned branch only**
- ✅ **User Management:** Create, read, update users in their branch
- ✅ **Branch Operations:** Update their assigned branch details
- ✅ **Branch Inventory:** Read, update, adjust inventory in their branch
- ✅ **Branch Sales:** Create, read, update, delete sales in their branch
- ✅ **Branch Expenses:** Create, read, update, delete expenses in their branch
- ✅ **Branch Reports:** View reports for their branch only
- ❌ **Other Branches:** Cannot access data from other branches
- ❌ **Company-wide:** Cannot access company-wide reports
- ❌ **Product Management:** Cannot create/update products (company-wide)

### 3. SALES STAFF (sales_staff)
**Sales-focused access - can handle sales and customer operations**
- ✅ **Sales Orders:** Create, read, update sales orders
- ✅ **Customer Management:** Read, update customer information
- ✅ **Product View:** Can view products (for sales)
- ✅ **Inventory View:** Can view inventory levels (for sales)
- ❌ **Inventory Management:** Cannot adjust inventory
- ❌ **User Management:** Cannot manage users
- ❌ **Purchase Management:** Cannot manage purchases
- ❌ **Manufacturing:** Cannot manage manufacturing
- ❌ **Reports:** Cannot view detailed reports

### 4. WAREHOUSE STAFF (warehouse_staff)
**Warehouse-focused access - can handle inventory and receiving**
- ✅ **Inventory Management:** Read, update, adjust inventory
- ✅ **Purchase Receiving:** Receive and process purchase orders
- ✅ **Manufacturing Support:** Can assist with manufacturing operations
- ✅ **Product View:** Can view products (for inventory)
- ❌ **Sales Management:** Cannot create sales orders
- ❌ **Customer Management:** Cannot manage customers
- ❌ **User Management:** Cannot manage users
- ❌ **Expense Management:** Cannot manage expenses

---

## Page Access Matrix

| Page/Feature | ADMIN | BRANCH MANAGER | SALES STAFF | WAREHOUSE STAFF |
|-------------|--------|----------------|-------------|------------------|
| **Dashboard** | ✅ Full Access | ✅ Branch View | ✅ Sales View | ✅ Inventory View |
| **User Management** | ✅ Full Control | ✅ Branch Users | ❌ No Access | ❌ No Access |
| **Branch Management** | ✅ All Branches | ✅ Own Branch | ❌ No Access | ❌ No Access |
| **Products** | ✅ Full Control | ❌ No Access | ✅ View Only | ✅ View Only |
| **Inventory** | ✅ All Branches | ✅ Own Branch | ✅ View Only | ✅ Full Control |
| **Sales Orders** | ✅ Full Control | ✅ Own Branch | ✅ Full Control | ❌ No Access |
| **Customers** | ✅ Full Control | ✅ Own Branch | ✅ Full Control | ❌ No Access |
| **Purchase Orders** | ✅ Full Control | ❌ No Access | ❌ No Access | ✅ Receive Only |
| **Manufacturing** | ✅ Full Control | ❌ No Access | ❌ No Access | ✅ Support Role |
| **Expenses** | ✅ Full Control | ✅ Own Branch | ❌ No Access | ❌ No Access |
| **Reports** | ✅ Company-wide | ✅ Branch Only | ❌ No Access | ❌ No Access |

---

## Implementation Notes

### Current Permission Checks:
```typescript
const hasPermission = (permission: string): boolean => {
  const permissions = {
    [UserRole.ADMIN]: [
      'manage_users', 'manage_branches', 'manage_products', 'manage_inventory', 'view_all_reports',
      'manage_sales', 'manage_purchases', 'manage_manufacturing', 'manage_expenses'
    ],
    [UserRole.BRANCH_MANAGER]: [
      'manage_branch_users', 'view_branch_reports', 'manage_branch_sales',
      'manage_branch_inventory', 'manage_branch_expenses'
    ],
    [UserRole.SALES_STAFF]: [
      'create_sales', 'view_customers', 'manage_customers', 'view_products'
    ],
    [UserRole.WAREHOUSE_STAFF]: [
      'manage_inventory', 'receive_purchases', 'manage_manufacturing', 'view_products'
    ]
  };
  
  const userPermissions = permissions[user.role] || [];
  return userPermissions.includes(permission) || false;
};
```

### Page Access Implementation:
```typescript
// Example: Check access before rendering page
if (!hasPermission('manage_users')) {
  return <AccessDenied message="You don't have permission to access User Management" />;
}
```

### Security Notes:
1. **Role-based access:** All access is determined by user role in database
2. **Branch filtering:** Branch managers only see their assigned branch data
3. **Permission inheritance:** Higher roles include lower role permissions
4. **Database security:** RLS policies enforce role-based data access
5. **Audit trail:** All user actions are logged for accountability
