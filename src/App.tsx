import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext-debug';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { ConfirmationProvider } from './utils/confirmations';
import Layout from './components/Layout';
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
import Expenses from './pages/Expenses';
import Analytics from './pages/Analytics';
import Customers from './pages/Customers';
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
                  <Route path="materials" element={<Materials />} />
                  <Route path="products" element={<Products />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="sales" element={<Sales />} />
                  <Route path="purchases" element={<Purchases />} />
                  <Route path="manufacturing" element={<Manufacturing />} />
                  <Route path="branches" element={<Branches />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="customers" element={<Customers />} />
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
