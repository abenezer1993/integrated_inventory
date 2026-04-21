import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext-debug';

const Layout: React.FC = () => {
  const { user, logout, hasPermission, isAdmin, isBranchManager, isSalesStaff, isWarehouseStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Role-based menu items
  const getMenuItems = () => {
    const baseItems = [
      { path: '/', name: 'Dashboard', icon: '📊', permission: null as string | null },
    ];

    const adminItems = [
      { path: '/products', name: 'Products', icon: '📦', permission: 'manage_products' as string | null },
      { path: '/inventory', name: 'Inventory', icon: '📋', permission: 'manage_inventory' as string | null },
      { path: '/sales', name: 'Sales', icon: '💰', permission: 'manage_sales' as string | null },
      { path: '/purchases', name: 'Purchases', icon: '🛒', permission: 'manage_purchases' as string | null },
      { path: '/manufacturing', name: 'Manufacturing', icon: '🏭', permission: 'manage_manufacturing' as string | null },
      { path: '/branches', name: 'Branches', icon: '🏪', permission: 'manage_branches' as string | null },
      { path: '/users', name: 'Users', icon: '👥', permission: 'manage_users' as string | null },
      { path: '/employees', name: 'Employees', icon: '👤', permission: 'manage_employees' as string | null },
      { path: '/reports', name: 'Analytics', icon: '📈', permission: 'view_all_reports' as string | null },
      { path: '/branch-analytics', name: 'Branch Analytics', icon: '🏢', permission: 'view_all_reports' as string | null },
      { path: '/expenses', name: 'Expenses', icon: '💸', permission: 'manage_expenses' as string | null },
    ];

    const branchManagerItems = [
      { path: '/products', name: 'Products', icon: '📦', permission: 'view_products' as string | null },
      { path: '/inventory', name: 'Inventory', icon: '📋', permission: 'manage_branch_inventory' as string | null },
      { path: '/sales', name: 'Sales', icon: '💰', permission: 'manage_branch_sales' as string | null },
      { path: '/customers', name: 'Customers', icon: '👤', permission: 'manage_customers' as string | null },
      { path: '/reports', name: 'Analytics', icon: '📈', permission: 'view_branch_reports' as string | null },
      { path: '/branch-analytics', name: 'Branch Analytics', icon: '🏢', permission: 'view_branch_reports' as string | null },
      { path: '/expenses', name: 'Expenses', icon: '💸', permission: 'manage_branch_expenses' as string | null },
    ];

    const salesStaffItems = [
      { path: '/products', name: 'Products', icon: '📦', permission: 'view_products' as string | null },
      { path: '/sales', name: 'POS', icon: '💰', permission: 'create_sales' as string | null },
      { path: '/customers', name: 'Customers', icon: '👤', permission: 'manage_customers' as string | null },
    ];

    const warehouseStaffItems = [
      { path: '/products', name: 'Products', icon: '📦', permission: 'view_products' as string | null },
      { path: '/inventory', name: 'Inventory', icon: '📋', permission: 'manage_inventory' as string | null },
      { path: '/purchases', name: 'Receive Stock', icon: '🛒', permission: 'receive_purchases' as string | null },
      { path: '/manufacturing', name: 'Manufacturing', icon: '🏭', permission: 'manage_manufacturing' as string | null },
    ];

    let menuItems = baseItems;
    
    // If no user or user has no role, show all items for testing
    if (!user || !user.role) {
      return [...baseItems, ...adminItems];
    }
    
    if (isAdmin()) {
      menuItems = [...menuItems, ...adminItems];
    } else if (isBranchManager()) {
      menuItems = [...menuItems, ...branchManagerItems];
    } else if (isSalesStaff()) {
      menuItems = [...menuItems, ...salesStaffItems];
    } else if (isWarehouseStaff()) {
      menuItems = [...menuItems, ...warehouseStaffItems];
    }

    return menuItems; // Temporarily remove permission filter
  };

  const menuItems = getMenuItems();
  
  // Debug: Log user and menu state
  console.log('Layout - User:', user);
  console.log('Layout - User role:', user?.role);
  console.log('Layout - Menu items:', menuItems);

  const getRoleBadge = () => {
    if (isAdmin()) return { color: 'bg-purple-600', text: 'Admin' };
    if (isBranchManager()) return { color: 'bg-blue-600', text: 'Manager' };
    if (isSalesStaff()) return { color: 'bg-green-600', text: 'Sales' };
    if (isWarehouseStaff()) return { color: 'bg-orange-600', text: 'Warehouse' };
    return { color: 'bg-gray-600', text: 'Staff' };
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Fixed Position */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ease-in-out shadow-2xl fixed left-0 top-0 h-screen z-40 flex flex-col`}>
        <div className="p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className={`${!sidebarOpen ? 'hidden' : ''}`}>
              <h1 className="font-bold text-xl text-white">
                Fikir & Leul
              </h1>
              <p className="text-xs text-gray-300 mt-1">
                Inventory System
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-300 hover:text-white transition-colors"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">{item.icon}</span>
                {sidebarOpen && <span className="font-medium ml-3">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section - Fixed at bottom */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0">
          <div className={`flex items-center ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className={`${roleBadge.color} text-xs px-2 py-1 rounded-full text-white`}>
                    {roleBadge.text}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - With margin to account for sidebar */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {menuItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {user?.branch_id ? 'Branch Operations' : 'System Administration'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name}
                    <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                        ADMIN
                      </span>
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
