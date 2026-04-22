import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext-debug';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = () => {
    if (!user) return { color: 'bg-gray-600', text: 'Guest' };
    
    switch (user.role) {
      case 'admin':
        return { color: 'bg-purple-600', text: 'Admin' };
      case 'branch_manager':
        return { color: 'bg-blue-600', text: 'Manager' };
      case 'sales_staff':
        return { color: 'bg-green-600', text: 'Sales' };
      case 'warehouse_staff':
        return { color: 'bg-orange-600', text: 'Warehouse' };
      default:
        return { color: 'bg-gray-600', text: 'Staff' };
    }
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
          {/* Dashboard - Common for all users */}
          <a
            href="/"
            className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
              location.pathname === '/' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span className="text-xl min-w-[24px] text-center">📊</span>
            {sidebarOpen && <span className="font-medium ml-3">Dashboard</span>}
          </a>

          {/* Role-based menu items */}
          {user?.role === 'admin' && (
            <>
              <a
                href="/products"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/products' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📦</span>
                {sidebarOpen && <span className="font-medium ml-3">Products</span>}
              </a>
              <a
                href="/inventory"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/inventory' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📋</span>
                {sidebarOpen && <span className="font-medium ml-3">Inventory</span>}
              </a>
              <a
                href="/sales"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/sales' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">💰</span>
                {sidebarOpen && <span className="font-medium ml-3">Sales</span>}
              </a>
              <a
                href="/purchases"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/purchases' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">🛒</span>
                {sidebarOpen && <span className="font-medium ml-3">Purchases</span>}
              </a>
              <a
                href="/manufacturing"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/manufacturing' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">🏭</span>
                {sidebarOpen && <span className="font-medium ml-3">Manufacturing</span>}
              </a>
              <a
                href="/branches"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/branches' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">🏪</span>
                {sidebarOpen && <span className="font-medium ml-3">Branches</span>}
              </a>
              <a
                href="/user-management"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/user-management' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">&#x1F465;</span>
                {sidebarOpen && <span className="font-medium ml-3">Users</span>}
              </a>
              <a
                href="/employees"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/employees' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">&#x1F475;</span>
                {sidebarOpen && <span className="font-medium ml-3">Employees</span>}
              </a>
              <a
                href="/reports"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/reports' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">&#x1F4C8;</span>
                {sidebarOpen && <span className="font-medium ml-3">Reports</span>}
              </a>
              <a
                href="/expenses"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/expenses' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">💸</span>
                {sidebarOpen && <span className="font-medium ml-3">Expenses</span>}
              </a>
            </>
          )}

          {user?.role === 'branch_manager' && (
            <>
              <a
                href="/products"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/products' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📦</span>
                {sidebarOpen && <span className="font-medium ml-3">Products</span>}
              </a>
              <a
                href="/inventory"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/inventory' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📋</span>
                {sidebarOpen && <span className="font-medium ml-3">Inventory</span>}
              </a>
              <a
                href="/sales"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/sales' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">💰</span>
                {sidebarOpen && <span className="font-medium ml-3">Sales</span>}
              </a>
              <a
                href="/customers"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/customers' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">&#x1F464;</span>
                {sidebarOpen && <span className="font-medium ml-3">Customers</span>}
              </a>
              <a
                href="/employees"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/employees' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">&#x1F475;</span>
                {sidebarOpen && <span className="font-medium ml-3">Employees</span>}
              </a>
              <a
                href="/branch-analytics"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/branch-analytics' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">&#x1F3E2;</span>
                {sidebarOpen && <span className="font-medium ml-3">Branch Analytics</span>}
              </a>
              <a
                href="/expenses"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/expenses' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">💸</span>
                {sidebarOpen && <span className="font-medium ml-3">Expenses</span>}
              </a>
            </>
          )}

          {user?.role === 'sales_staff' && (
            <>
              <a
                href="/products"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/products' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📦</span>
                {sidebarOpen && <span className="font-medium ml-3">Products</span>}
              </a>
              <a
                href="/sales"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/sales' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">💰</span>
                {sidebarOpen && <span className="font-medium ml-3">Sales</span>}
              </a>
              <a
                href="/customers"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/customers' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">👤</span>
                {sidebarOpen && <span className="font-medium ml-3">Customers</span>}
              </a>
            </>
          )}

          {user?.role === 'warehouse_staff' && (
            <>
              <a
                href="/products"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/products' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📦</span>
                {sidebarOpen && <span className="font-medium ml-3">Products</span>}
              </a>
              <a
                href="/inventory"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/inventory' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📋</span>
                {sidebarOpen && <span className="font-medium ml-3">Inventory</span>}
              </a>
              <a
                href="/purchases"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/purchases' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">🛒</span>
                {sidebarOpen && <span className="font-medium ml-3">Receive Stock</span>}
              </a>
              <a
                href="/manufacturing"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/manufacturing' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">🏭</span>
                {sidebarOpen && <span className="font-medium ml-3">Manufacturing</span>}
              </a>
            </>
          )}
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
                  {location.pathname === '/' && 'Dashboard' ||
                   location.pathname === '/products' && 'Products' ||
                   location.pathname === '/sales' && 'Sales' ||
                   location.pathname === '/customers' && 'Customers' ||
                   'Dashboard'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {user?.branch_id ? 'Branch Operations' : 'System Administration'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name}
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleBadge.color.replace('bg-', 'bg-').replace('600', '100')} ${roleBadge.color.replace('bg-', 'text-').replace('600', '800')}`}>
                        {roleBadge.text}
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
