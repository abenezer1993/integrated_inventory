import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext-debug';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { ConfirmationProvider } from './utils/confirmations';
import DialogRenderer from './components/DialogRenderer';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import UserManagement from './pages/UserManagement';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Manufacturing from './pages/Manufacturing';
import Branches from './pages/Branches';
import Reports from './pages/Reports';
import BranchAnalytics from './pages/BranchAnalytics';
import Expenses from './pages/Expenses';
import Employees from './pages/Employees';
import Login from './pages/Login';

function App() {
  return (
    <ConfirmationProvider>
      <SupabaseProvider>
        <AuthProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="sales" element={<Sales />} />
                <Route path="customers" element={<Customers />} />
                <Route path="user-management" element={<UserManagement />} />
                
                {/* Branch Manager Routes */}
                <Route path="inventory" element={<Inventory />} />
                <Route path="branch-analytics" element={<BranchAnalytics />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="employees" element={<Employees />} />
                
                {/* Warehouse Staff Routes */}
                <Route path="purchases" element={<Purchases />} />
                <Route path="manufacturing" element={<Manufacturing />} />
                
                {/* Admin Only Routes */}
                <Route path="branches" element={<Branches />} />
                <Route path="reports" element={<Reports />} />
              </Route>
            </Routes>
          </Router>
          <DialogRenderer />
        </AuthProvider>
      </SupabaseProvider>
    </ConfirmationProvider>
  );
}

export default App;
