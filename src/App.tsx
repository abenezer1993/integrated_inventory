import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext-debug';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { ConfirmationProvider } from './utils/confirmations';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Notifications from './components/Notifications';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Materials from './pages/Materials';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Manufacturing from './pages/Manufacturing';
import Branches from './pages/Branches';
import UserManagement from './pages/UserManagement';
import Employees from './pages/Employees';
import Expenses from './pages/Expenses';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import BranchAnalytics from './pages/BranchAnalytics';
import Login from './pages/Login';

function App() {
  return (
    <ConfirmationProvider>
      <>
        <SupabaseProvider>
          <AuthProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  
                  {/* Admin Only Routes */}
                  <Route path="users" element={
                    <ProtectedRoute requiredPermission="manage_users">
                      <UserManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="branches" element={
                    <ProtectedRoute requiredPermission="manage_branches">
                      <Branches />
                    </ProtectedRoute>
                  } />
                  <Route path="employees" element={
                    <ProtectedRoute requiredPermission="manage_users">
                      <Employees />
                    </ProtectedRoute>
                  } />
                  <Route path="reports" element={
                    <ProtectedRoute requiredPermission="view_all_reports">
                      <Reports />
                    </ProtectedRoute>
                  } />
                  
                  {/* Branch Manager Routes */}
                  <Route path="branch-analytics" element={
                    <ProtectedRoute requiredRole="branch_manager">
                      <BranchAnalytics />
                    </ProtectedRoute>
                  } />
                  <Route path="expenses" element={
                    <ProtectedRoute requiredPermission="manage_branch_expenses">
                      <Expenses />
                    </ProtectedRoute>
                  } />
                  
                  {/* Product Management (Admin + Branch Manager) */}
                  <Route path="products" element={
                    <ProtectedRoute requiredPermission="manage_products">
                      <Products />
                    </ProtectedRoute>
                  } />
                  <Route path="materials" element={
                    <ProtectedRoute requiredPermission="manage_products">
                      <Materials />
                    </ProtectedRoute>
                  } />
                  
                  {/* Inventory Management (Admin + Branch Manager + Warehouse Staff) */}
                  <Route path="inventory" element={
                    <ProtectedRoute requiredPermission="manage_inventory">
                      <Inventory />
                    </ProtectedRoute>
                  } />
                  <Route path="manufacturing" element={
                    <ProtectedRoute requiredPermission="manage_manufacturing">
                      <Manufacturing />
                    </ProtectedRoute>
                  } />
                  <Route path="purchases" element={
                    <ProtectedRoute requiredPermission="manage_purchases">
                      <Purchases />
                    </ProtectedRoute>
                  } />
                  
                  {/* Sales Routes (All roles can view, but Sales Staff can manage) */}
                  <Route path="sales" element={
                    <ProtectedRoute requiredPermission="manage_sales">
                      <Sales />
                    </ProtectedRoute>
                  } />
                  <Route path="customers" element={
                    <ProtectedRoute requiredPermission="manage_customers">
                      <Customers />
                    </ProtectedRoute>
                  } />
                </Route>
              </Routes>
            </Router>
          </AuthProvider>
        </SupabaseProvider>
        <Notifications />
      </>
    </ConfirmationProvider>
  );
}

export default App;
