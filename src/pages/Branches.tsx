import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

interface Branch {
  id: string;
  name: string;
  location: string;
  contact_person: string;
  phone: string;
  email: string;
  is_active: boolean;
}

interface BranchAnalytics {
  branchId: string;
  branchName: string;
  totalInventory: number;
  totalProducts: number;
  lowStockItems: number;
  totalSales: number;
  totalSalesAmount: number;
  todaySales: number;
  recentSales: number;
}

const Branches: React.FC = () => {
  const { supabase } = useSupabase();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchAnalytics, setBranchAnalytics] = useState<BranchAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showBranchDetail, setShowBranchDetail] = useState(false);
  const [showBranchInventory, setShowBranchInventory] = useState(false);
  const [showBranchSales, setShowBranchSales] = useState(false);
  const [showBranchEmployees, setShowBranchEmployees] = useState(false);
  const [branchInventory, setBranchInventory] = useState<any[]>([]);
  const [branchSales, setBranchSales] = useState<any[]>([]);
  const [branchEmployees, setBranchEmployees] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchAnalytics | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contact_person: '',
    phone: '',
    email: '',
    is_active: true
  });

  const handleBranchClick = (branchId: string, branchName: string) => {
    const branchData = branchAnalytics.find(b => b.branchId === branchId);
    if (branchData) {
      setSelectedBranch(branchData);
      setShowBranchDetail(true);
      setShowBranchInventory(false);
    }
  };

  const fetchBranchInventory = async (branchId: string) => {
    try {
      setInventoryLoading(true);
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const [
        { data: inventoryData, error: inventoryError },
        { data: manufacturingOrdersData, error: manufacturingOrdersError }
      ] = await Promise.all([
        supabase
          .from('inventory')
          .select(`
            *,
            products (id, name, sku, unit, cost_price, selling_price),
            branches (name)
          `)
          .eq('branch_id', branchId)
          .order('last_updated', { ascending: false }),
        supabase
          .from('manufacturing_orders')
          .select('*')
      ]);
      
      if (inventoryError) throw inventoryError;
      
      const processedData = inventoryData?.map(item => {
        let productName = '';
        let displaySku = '';
        let source = '';
        
        if (item.product_id && item.products) {
          source = 'purchased';
          productName = item.products.name || 'Unknown';
          displaySku = item.products.sku || 'N/A';
        } else if (item.manufactured_product_id && !item.product_id) {
          source = 'manufactured';
          
          const manufacturingOrder = manufacturingOrdersData?.find(order => 
            order.finished_product_id === item.manufactured_product_id && 
            order.status === 'completed'
          );
          
          if (manufacturingOrder) {
            productName = manufacturingOrder.product_name || 'Manufactured Product';
            displaySku = manufacturingOrder.order_number || 'MFG-' + item.manufactured_product_id?.slice(0, 8) || 'N/A';
          } else {
            productName = 'Manufactured Product';
            displaySku = 'MFG-' + item.manufactured_product_id?.slice(0, 8) || 'N/A';
          }
        } else {
          source = 'unknown';
          productName = 'Unknown Product';
          displaySku = 'N/A';
        }
        
        return {
          ...item,
          productName,
          displaySku,
          source,
          unit: item.products?.unit || 'piece'
        };
      }) || [];
      
      setBranchInventory(processedData);
    } catch (error) {
      console.error('Error fetching branch inventory:', error);
      setBranchInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchBranchSales = async (branchId: string) => {
    try {
      setSalesLoading(true);
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      // First try with joins, fallback to simple query if it fails
      let salesData, salesError;
      
      try {
        const result = await supabase
          .from('sales')
          .select(`
            *,
            products (name, sku),
            customers (name),
            branches (name)
          `)
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false })
          .limit(50);
        
        salesData = result.data;
        salesError = result.error;
        
        if (salesError) throw salesError;
      } catch (joinError) {
        console.log('Join query failed, trying simple query:', joinError);
        
        // Fallback: Get sales without joins, then fetch product info separately
        const result = await supabase
          .from('sales')
          .select('*')
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false })
          .limit(50);
        
        salesData = result.data;
        salesError = result.error;
        
        // If we have sales data, fetch product information separately
        if (salesData && salesData.length > 0) {
          const regularProductIds = Array.from(new Set(
            salesData.map(sale => sale.product_id).filter(Boolean)
          ));
          const manufacturedProductIds = Array.from(new Set(
            salesData.map(sale => sale.manufactured_product_id).filter(Boolean)
          ));
          
          // Fetch both regular and manufactured products
          let regularProductsData: any[] = [];
          let manufacturedProductsData: any[] = [];
          
          if (regularProductIds.length > 0 || manufacturedProductIds.length > 0) {
            const [regularResult, manufacturedResult] = await Promise.all([
              // Only fetch if we have regular product IDs
              regularProductIds.length > 0 ? supabase
                .from('products')
                .select('id, name, sku')
                .in('id', regularProductIds) : Promise.resolve({ data: [] }),
              
              // Only fetch if we have manufactured product IDs  
              manufacturedProductIds.length > 0 ? supabase
                .from('manufactured_products')
                .select('id, name, sku')
                .in('id', manufacturedProductIds) : Promise.resolve({ data: [] })
            ]);
            
            regularProductsData = regularResult.data || [];
            manufacturedProductsData = manufacturedResult.data || [];
          }
          
          // Add product info to sales data
          salesData = salesData.map(sale => {
            let productInfo = null;
            
            if (sale.product_id) {
              productInfo = regularProductsData.find((p: any) => p.id === sale.product_id) || null;
            } else if (sale.manufactured_product_id) {
              productInfo = manufacturedProductsData.find((p: any) => p.id === sale.manufactured_product_id) || null;
            }
            
            return {
              ...sale,
              products: productInfo
            };
          });
        }
      }
      
      console.log('Fetching sales for branch ID:', branchId);
      console.log('Branch sales data returned:', salesData?.length, 'items');
      console.log('Sample sale:', salesData?.[0]);
      console.log('All branch sales for branch', branchId, ':', salesData);
      
      if (salesError) throw salesError;
      
      setBranchSales(salesData || []);
    } catch (error) {
      console.error('Error fetching branch sales:', error);
      setBranchSales([]);
    } finally {
      setSalesLoading(false);
    }
  };

  const fetchBranchEmployees = async (branchId: string) => {
    try {
      setEmployeesLoading(true);
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(`
          *,
          branches (name)
        `)
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });
      
      if (employeesError) throw employeesError;
      
      setBranchEmployees(employeesData || []);
    } catch (error) {
      console.error('Error fetching branch employees:', error);
      setBranchEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      console.log('Fetching branches...');
      setLoading(true);
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log('Branches fetched:', data);
      console.log('Number of branches:', data?.length || 0);
      console.log('Active branches:', data?.filter(b => b.is_active).length || 0);
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchAnalytics = async () => {
    try {
      console.log('Fetching branch analytics...');
      setAnalyticsLoading(true);
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      // Test queries to see what data exists
      const { data: allInventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('branch_id, quantity')
        .limit(5);
      
      console.log('Sample inventory data:', allInventory, 'Error:', inventoryError);
      
      const { data: allSales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .limit(5);
      
      console.log('Sample sales data:', allSales, 'Error:', salesError);
      console.log('Sample sale columns:', allSales?.[0] ? Object.keys(allSales[0]) : 'No data');
      
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      
      if (branchesError) throw branchesError;
      
      if (!branchesData || branchesData.length === 0) {
        console.log('No branches found');
        setBranchAnalytics([]);
        return;
      }
      
      console.log('Processing analytics for branches:', branchesData);
      
      const analyticsPromises = branchesData.map(async (branch) => {
        try {
          if (!supabase) {
            throw new Error('Supabase client not available');
          }
          
          console.log(`Fetching analytics for branch ${branch.name} (ID: ${branch.id})`);
          
          const { data: inventoryData, error: inventoryError } = await supabase
            .from('inventory')
            .select(`
              quantity,
              product_id,
              manufactured_product_id,
              last_updated
            `)
            .eq('branch_id', branch.id);
          
          console.log(`Inventory data for ${branch.name}:`, inventoryData, 'Error:', inventoryError);
          
          if (inventoryError) throw inventoryError;
          
          const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select('*')
            .eq('branch_id', branch.id);
          
          console.log(`Sales data for ${branch.name}:`, salesData, 'Error:', salesError);
          console.log('Sample sale record:', salesData?.[0]);
          console.log('Available columns:', salesData?.[0] ? Object.keys(salesData[0]) : 'No data');
          
          if (salesError) throw salesError;
          
          const totalInventory = inventoryData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          const totalProducts = new Set(
            inventoryData?.map(item => item.product_id || item.manufactured_product_id).filter(Boolean)
          ).size;
          
          const totalSales = salesData?.reduce((sum, sale) => {
            // Try different possible column names for quantity
            const qty = sale.quantity || sale.quantity_sold || sale.units || 0;
            return sum + (qty || 0);
          }, 0) || 0;
          
          const totalSalesAmount = salesData?.reduce((sum, sale) => {
            // Try different possible column names for total amount
            const amount = sale.total_amount || sale.amount || sale.total || 0;
            return sum + (amount || 0);
          }, 0) || 0;
          
          const today = new Date().toISOString().split('T')[0];
          const todaySales = salesData?.filter(sale => sale.created_at?.startsWith(today))
            .reduce((sum, sale) => {
              const qty = sale.quantity || sale.quantity_sold || sale.units || 0;
              return sum + (qty || 0);
            }, 0) || 0;
          
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const recentSales = salesData?.filter(sale => 
            new Date(sale.created_at || '') >= sevenDaysAgo
          ).reduce((sum, sale) => {
            const qty = sale.quantity || sale.quantity_sold || sale.units || 0;
            return sum + (qty || 0);
          }, 0) || 0;
          
          const lowStockItems = inventoryData?.filter(item => (item.quantity || 0) < 10).length || 0;
          
          const result = {
            branchId: branch.id,
            branchName: branch.name,
            totalInventory,
            totalProducts,
            lowStockItems,
            totalSales,
            totalSalesAmount,
            todaySales,
            recentSales
          };
          
          console.log(`Analytics result for ${branch.name}:`, result);
          
          return result;
        } catch (error) {
          console.error(`Error fetching analytics for branch ${branch.name}:`, error);
          return {
            branchId: branch.id,
            branchName: branch.name,
            totalInventory: 0,
            totalProducts: 0,
            lowStockItems: 0,
            totalSales: 0,
            totalSalesAmount: 0,
            todaySales: 0,
            recentSales: 0
          };
        }
      });
      
      const analyticsResults = await Promise.all(analyticsPromises);
      console.log('Branch analytics results:', analyticsResults);
      console.log('Number of analytics results:', analyticsResults.length);
      setBranchAnalytics(analyticsResults);
      console.log('branchAnalytics state set');
    } catch (error) {
      console.error('Error fetching branch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchBranchAnalytics();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      if (editingBranch) {
        const { error } = await supabase
          .from('branches')
          .update(formData)
          .eq('id', editingBranch.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('branches')
          .insert(formData);
        
        if (error) throw error;
      }
      
      setShowAddForm(false);
      setEditingBranch(null);
      setFormData({
        name: '',
        location: '',
        contact_person: '',
        phone: '',
        email: '',
        is_active: true
      });
      fetchBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      location: branch.location,
      contact_person: branch.contact_person,
      phone: branch.phone,
      email: branch.email,
      is_active: branch.is_active
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this branch?')) {
      try {
        if (!supabase) {
          throw new Error('Supabase client not available');
        }
        
        const { error } = await supabase
          .from('branches')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        fetchBranches();
      } catch (error) {
        console.error('Error deleting branch:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-gray-600">Manage your store locations and warehouses</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Branch
          </button>
        </div>
      </div>

      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">📍</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Total Branches</p>
              <p className="text-xl font-bold text-gray-900">
                {branches.filter(branch => branch.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Active Branches</p>
              <p className="text-xl font-bold text-gray-900">
                {branches.filter(branch => branch.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-xl">⏸️</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Inactive</p>
              <p className="text-xl font-bold text-gray-600">
                {branches.filter(branch => !branch.is_active).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Analytics */}
      {analyticsLoading ? (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Branch Analytics</h3>
          </div>
          <div className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading branch analytics...</span>
            </div>
          </div>
        </div>
      ) : branchAnalytics.length > 0 ? (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Branch Analytics</h3>
            <p className="text-sm text-gray-600 mt-1">Performance metrics and inventory insights for each branch</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {branchAnalytics.map((analytics) => (
                <div 
                  key={analytics.branchId} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50"
                  onClick={() => handleBranchClick(analytics.branchId, analytics.branchName)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">{analytics.branchName}</h4>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm">📊</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Total Inventory</p>
                        <p className="text-lg font-bold text-gray-900">{analytics.totalInventory.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Products</p>
                        <p className="text-lg font-bold text-blue-600">{analytics.totalProducts}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Sales (Units)</p>
                        <p className="text-lg font-bold text-green-600">{analytics.totalSales.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Revenue</p>
                        <p className="text-lg font-bold text-green-600">${analytics.totalSalesAmount.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Today's Sales (Units)</p>
                        <p className="text-lg font-bold text-purple-600">{analytics.todaySales.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Low Stock Items</p>
                        <p className="text-lg font-bold text-orange-600">{analytics.lowStockItems}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Recent Sales (7d)</p>
                        <p className="text-lg font-bold text-cyan-600">{analytics.recentSales}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Performance</span>
                      <div className="flex items-center">
                        {analytics.todaySales > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            🟢 Active Today
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            ⚪ No Sales Today
                          </span>
                        )}
                        {analytics.lowStockItems > 0 && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            ⚠️ Low Stock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Branch Analytics</h3>
          </div>
          <div className="p-8 text-center">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data available</h3>
              <p className="mt-1 text-sm text-gray-500">
                Branch analytics will appear here once branches have inventory and sales data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Branches Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Branch Locations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{branch.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {branch.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {branch.contact_person}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {branch.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {branch.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      branch.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(branch)}
                      className="text-blue-600 hover:text-blue-900 font-medium mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(branch.id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Branch Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
                <div>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-xl">📍</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-2">
                    {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddBranch} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Branch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g., Main Store, Warehouse"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g., Downtown, Industrial Area"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Manager name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="555-0101"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="branch@store.com"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm font-medium text-gray-900">
                    🟢 Active Branch
                  </label>
                </div>

                <div className="flex space-x-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      isSubmitting
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {editingBranch ? 'Updating...' : 'Adding...'}
                      </span>
                    ) : (
                      <span>{editingBranch ? 'Update Branch' : 'Add Branch'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Branch Detail Modal */}
      {showBranchDetail && selectedBranch && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative min-h-screen flex items-center justify-center p-0">
            <div className="relative bg-white rounded-xl shadow-2xl w-full h-full max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Branch Details: {selectedBranch.branchName}</h3>
                <button
                  onClick={() => setShowBranchDetail(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-blue-900 mb-3">Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Inventory:</span>
                          <span className="font-bold text-blue-600">{selectedBranch.totalInventory.toLocaleString()} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Products:</span>
                          <span className="font-bold text-blue-600">{selectedBranch.totalProducts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Low Stock Items:</span>
                          <span className="font-bold text-orange-600">{selectedBranch.lowStockItems}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-green-900 mb-3">Sales Performance</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Sales:</span>
                          <span className="font-bold text-green-600">{selectedBranch.totalSales.toLocaleString()} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Revenue:</span>
                          <span className="font-bold text-green-600">${selectedBranch.totalSalesAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Today's Sales:</span>
                          <span className="font-bold text-green-600">{selectedBranch.todaySales.toLocaleString()} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Recent Sales (7d):</span>
                          <span className="font-bold text-cyan-600">{selectedBranch.recentSales}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-purple-900 mb-3">Quick Actions</h4>
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            if (!showBranchSales && selectedBranch) {
                              fetchBranchSales(selectedBranch.branchId);
                            }
                            setShowBranchSales(!showBranchSales);
                          }}
                          className="w-full bg-purple-600 text-white px-2 py-1.5 rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium"
                        >
                          📊 {showBranchSales ? 'Hide' : 'View'} Sales
                        </button>
                        <button
                          onClick={() => {
                            if (!showBranchInventory && selectedBranch) {
                              fetchBranchInventory(selectedBranch.branchId);
                            }
                            setShowBranchInventory(!showBranchInventory);
                          }}
                          className="w-full bg-indigo-600 text-white px-2 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium"
                        >
                          📦 {showBranchInventory ? 'Hide' : 'View'} Inventory
                        </button>
                        <button
                          onClick={() => {
                            if (!showBranchEmployees && selectedBranch) {
                              fetchBranchEmployees(selectedBranch.branchId);
                            }
                            setShowBranchEmployees(!showBranchEmployees);
                          }}
                          className="w-full bg-orange-600 text-white px-2 py-1.5 rounded-lg hover:bg-orange-700 transition-colors text-xs font-medium"
                        >
                          👥 {showBranchEmployees ? 'Hide' : 'View'} Employees
                        </button>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-yellow-900 mb-3">Status Indicators</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">Branch is Active</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">Has Low Stock Items</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">Sales Data Available</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Inventory View */}
              {showBranchInventory && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      📦 Inventory for {selectedBranch?.branchName}
                    </h4>
                    
                    {inventoryLoading ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500">Loading inventory...</div>
                      </div>
                    ) : branchInventory.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500">No inventory found for this branch</div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Product Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                SKU
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantity
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Unit
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Updated
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {branchInventory.map((item: any) => {
                              const isManufactured = item.source === 'manufactured';
                              
                              return (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {item.productName || 'Unknown Product'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.displaySku || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      isManufactured 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {isManufactured ? 'Manufactured' : 'Purchased'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.quantity}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.unit || 'piece'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(item.last_updated).toLocaleDateString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Sales View */}
              {showBranchSales && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      📊 Sales for {selectedBranch?.branchName}
                    </h4>
                    
                    {salesLoading ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500">Loading sales...</div>
                      </div>
                    ) : branchSales.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500">No sales found for this branch</div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Customer
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Product
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantity
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {branchSales.map((sale: any) => (
                              <tr key={sale.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(sale.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {sale.customers?.name || sale.customer_name || 'Walk-in Customer'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {sale.products?.name || sale.product_name || 'Unknown Product'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {sale.quantity_sold || sale.quantity || 0}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                  ${sale.total_amount?.toFixed(2) || '0.00'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Completed
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Employees View */}
              {showBranchEmployees && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      👥 Employees for {selectedBranch?.branchName}
                    </h4>
                    
                    {employeesLoading ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500">Loading employees...</div>
                      </div>
                    ) : branchEmployees.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500">No employees found for this branch</div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Position
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Phone
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status Badge
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {branchEmployees.map((employee: any) => (
                              <tr key={employee.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {employee.full_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {employee.position || 'Not Assigned'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {employee.phone}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {employee.status || 'Unknown'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    employee.status === 'active' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {employee.status || 'Unknown'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowBranchDetail(false)}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Branches;
