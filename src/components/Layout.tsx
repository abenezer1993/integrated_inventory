import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext-debug';
import { useSupabase } from '../contexts/SupabaseContext';
import { alertFunction } from '../utils/alerts';
import { useAccessLogService } from '../services/accessLogService';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Update user profile in database
      const { error: profileError } = await supabase!
        .from('users')
        .update({ name: profileForm.name })
        .eq('id', user?.id);
      
      if (profileError) throw profileError;
      
      // Update email if changed
      if (profileForm.email !== user?.email) {
        const { error: emailError } = await supabase!.auth.updateUser({
          email: profileForm.email
        });
        
        if (emailError) throw emailError;
      }
      
      // Change password if new password provided
      if (profileForm.newPassword) {
        if (profileForm.newPassword !== profileForm.confirmPassword) {
          alertFunction('New passwords do not match');
          return;
        }
        
        const { error: passwordError } = await supabase!.auth.updateUser({
          password: profileForm.newPassword
        });
        
        if (passwordError) throw passwordError;
      }
      
      // Log profile update
      if (accessLogService) {
        accessLogService.logProfileUpdate();
      }
      
      alertFunction('Profile updated successfully!');
      setShowProfileModal(false);
      
      // Reset form
      setProfileForm({
        name: profileForm.name,
        email: profileForm.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (error: any) {
      console.error('Profile update error:', error);
      alertFunction('Error updating profile: ' + error.message);
    }
  };

  const accessLogService = useAccessLogService();

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
    <div className="min-h-screen bg-zinc-950 flex">
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
          <Link
            to="/app/"
            className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
              location.pathname === '/app/' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span className="text-xl min-w-[24px] text-center">📊</span>
            {sidebarOpen && <span className="font-medium ml-3">Dashboard</span>}
          </Link>

          {/* Role-based menu items */}
          {user?.role === 'admin' && (
            <>
              <Link
                to="/app/products"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/products' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📦</span>
                {sidebarOpen && <span className="font-medium ml-3">Products</span>}
              </Link>
              <Link
                to="/app/inventory"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/inventory' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📋</span>
                {sidebarOpen && <span className="font-medium ml-3">Inventory</span>}
              </Link>
              <Link
                to="/app/sales"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/sales' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">💰</span>
                {sidebarOpen && <span className="font-medium ml-3">Sales</span>}
              </Link>
              <Link
                to="/app/purchases"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/purchases' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">🛒</span>
                {sidebarOpen && <span className="font-medium ml-3">Purchases</span>}
              </Link>
              <Link
                to="/app/manufacturing"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/manufacturing' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">🏭</span>
                {sidebarOpen && <span className="font-medium ml-3">Manufacturing</span>}
              </Link>
              <Link
                to="/app/branches"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/branches' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">🏪</span>
                {sidebarOpen && <span className="font-medium ml-3">Branches</span>}
              </Link>
              <Link
                to="/app/user-management"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/user-management' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">&#x1F465;</span>
                {sidebarOpen && <span className="font-medium ml-3">Users</span>}
              </Link>
              <Link
                to="/app/employees"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/employees' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">&#x1F475;</span>
                {sidebarOpen && <span className="font-medium ml-3">Employees</span>}
              </Link>
              <Link
                to="/app/reports"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/reports' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">&#x1F4C8;</span>
                {sidebarOpen && <span className="font-medium ml-3">Reports</span>}
              </Link>
              <Link
                to="/app/access-logs"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/access-logs' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">🔍</span>
                {sidebarOpen && <span className="font-medium ml-3">Access Logs</span>}
              </Link>
              <Link
                to="/app/expenses"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/expenses' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">💸</span>
                {sidebarOpen && <span className="font-medium ml-3">Expenses</span>}
              </Link>
            </>
          )}

          {user?.role === 'branch_manager' && (
            <>
              <Link
                to="/app/products"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/products' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📦</span>
                {sidebarOpen && <span className="font-medium ml-3">Products</span>}
              </Link>
              <Link
                to="/app/inventory"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/inventory' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📋</span>
                {sidebarOpen && <span className="font-medium ml-3">Inventory</span>}
              </Link>
              <Link
                to="/app/sales"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/sales' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">💰</span>
                {sidebarOpen && <span className="font-medium ml-3">Sales</span>}
              </Link>
              <Link
                to="/app/customers"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/customers' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">&#x1F464;</span>
                {sidebarOpen && <span className="font-medium ml-3">Customers</span>}
              </Link>
              <Link
                to="/app/employees"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/employees' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">&#x1F475;</span>
                {sidebarOpen && <span className="font-medium ml-3">Employees</span>}
              </Link>
              <Link
                to="/app/branch-analytics"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/branch-analytics' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">&#x1F3E2;</span>
                {sidebarOpen && <span className="font-medium ml-3">Branch Analytics</span>}
              </Link>
              <Link
                to="/app/expenses"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/expenses' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">💸</span>
                {sidebarOpen && <span className="font-medium ml-3">Expenses</span>}
              </Link>
            </>
          )}

          {user?.role === 'sales_staff' && (
            <>
              <Link
                to="/app/products"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/products' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📦</span>
                {sidebarOpen && <span className="font-medium ml-3">Products</span>}
              </Link>
              <Link
                to="/app/sales"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/sales' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">💰</span>
                {sidebarOpen && <span className="font-medium ml-3">Sales</span>}
              </Link>
              <Link
                to="/app/customers"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/customers' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">👤</span>
                {sidebarOpen && <span className="font-medium ml-3">Customers</span>}
              </Link>
            </>
          )}

          {user?.role === 'warehouse_staff' && (
            <>
              <Link
                to="/app/products"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/products' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📦</span>
                {sidebarOpen && <span className="font-medium ml-3">Products</span>}
              </Link>
              <Link
                to="/app/inventory"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/inventory' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">📋</span>
                {sidebarOpen && <span className="font-medium ml-3">Inventory</span>}
              </Link>
              <Link
                to="/app/purchases"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/purchases' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">🛒</span>
                {sidebarOpen && <span className="font-medium ml-3">Receive Stock</span>}
              </Link>
              <Link
                to="/app/manufacturing"
                className={`flex items-center px-3 py-2 mb-1 rounded-lg transition-all duration-200 ${
                  location.pathname === '/app/manufacturing' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xl min-w-[24px] text-center">🏭</span>
                {sidebarOpen && <span className="font-medium ml-3">Manufacturing</span>}
              </Link>
            </>
          )}
        </nav>

        {/* User Profile Section - Fixed at bottom */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0">
          <div 
            className={`flex items-center ${!sidebarOpen && 'justify-center'} cursor-pointer hover:bg-slate-700 rounded-lg p-2 transition-colors`}
            onClick={() => setShowProfileModal(true)}
          >
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogout();
                    }}
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

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Edit Profile</h3>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Change Password</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password (optional)
                    </label>
                    <input
                      type="password"
                      value={profileForm.newPassword}
                      onChange={(e) => setProfileForm({...profileForm, newPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Leave blank to keep current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={profileForm.confirmPassword}
                      onChange={(e) => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Update Profile
                </button>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
