# User Management System

## 🎯 Overview
Complete user management system where `abenitak9@gmail.com` is the main admin who can create and manage permissions for other users.

## 👑 Admin User
- **Email**: `abenitak9@gmail.com`
- **Role**: Admin
- **Permissions**: Full system access including user management

## 🔐 User Roles & Permissions

### 🟣 **Admin** (abenitak9@gmail.com)
- **Full System Access**
- `manage_users` - Create, edit, delete users
- `manage_branches` - Manage all branches
- `manage_products` - Product management
- `view_all_reports` - All reports access
- `manage_sales` - Sales management
- `manage_purchases` - Purchase management
- `manage_manufacturing` - Manufacturing access
- `manage_expenses` - Expense tracking

### 🔵 **Branch Manager**
- **Branch-Level Access**
- `manage_branch_users` - Manage branch users
- `view_branch_reports` - Branch reports
- `manage_branch_sales` - Branch sales
- `manage_branch_inventory` - Branch inventory
- `manage_branch_expenses` - Branch expenses

### 🟢 **Sales Staff**
- **Sales & Customer Access**
- `create_sales` - Create sales orders
- `view_customers` - Customer management
- `manage_customers` - Customer operations
- `view_products` - View products

### 🟠 **Warehouse Staff**
- **Inventory & Manufacturing Access**
- `manage_inventory` - Inventory management
- `receive_purchases` - Receive purchases
- `manage_manufacturing` - Manufacturing access
- `view_products` - View products

## 🚀 Setup Instructions

### **Step 1: Run SQL Script**
```bash
# Run the admin setup script
psql -d your_database -f setup-admin-user.sql
```

### **Step 2: Create Admin User**
1. **Via Supabase Dashboard**:
   - Go to Authentication → Users
   - Create user with email: `abenitak9@gmail.com`
   - Set password
   - Confirm email

2. **Or Via App**:
   - Register new user with `abenitak9@gmail.com`
   - SQL script will automatically assign admin role

### **Step 3: Login & Manage Users**
1. Login as `abenitak9@gmail.com`
2. Go to **Users** page in navigation
3. Create/manage other users

## 📱 User Management Features

### **👥 User List**
- View all users with roles and branches
- Color-coded role badges
- Edit/delete permissions
- Cannot delete own account

### **➕ Add New User**
- Email, name, role selection
- Branch assignment (non-admin roles)
- Password setting
- Automatic profile creation

### **✏️ Edit User**
- Update user details
- Change roles and permissions
- Reassign branches
- Preserve user history

### **🗑️ Delete User**
- Remove user accounts
- Clean up auth and profile
- Cannot delete self
- Confirmation required

## 🔄 Workflow

### **For Admin (abenitak9@gmail.com)**:
1. **Login** with admin credentials
2. **Navigate** → Users page
3. **Add Users** → Create staff accounts
4. **Assign Roles** → Set appropriate permissions
5. **Manage Access** → Edit/delete as needed

### **For Other Users**:
1. **Login** with assigned credentials
2. **Access** → Pages based on role
3. **Limited Features** → Only allowed functions

## 🛡️ Security Features

### **Row Level Security (RLS)**:
- Users see only their data
- Branch managers see branch data
- Admins see all data

### **Permission Checks**:
- Frontend permission validation
- Backend policy enforcement
- Role-based access control

### **Safe Operations**:
- Cannot delete own account
- Admin-only user management
- Branch isolation for non-admins

## 🎯 Business Benefits

### **✅ Complete Control**:
- Admin manages all user access
- Role-based permissions
- Branch-level management

### **✅ Security**:
- Proper authentication
- Permission validation
- Data isolation

### **✅ Scalability**:
- Easy to add new users
- Flexible role assignment
- Multi-branch support

## 📞 Support

For user management issues:
1. Check admin access
2. Verify SQL script execution
3. Review user permissions
4. Check browser console for errors

**The system provides complete user management with proper role-based access control! 🚀**
