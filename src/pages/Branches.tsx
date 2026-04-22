import React, { useState, useEffect } from 'react';
import { alertFunction } from '../utils/alerts';
import { useAuth } from '../contexts/AuthContext-debug';
import { useSupabase } from '../contexts/SupabaseContext';
import { useConfirmation } from '../utils/confirmations';

interface Branch {
  id: string;
  name: string;
  location: string;
  contact_person: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BranchAnalytics {
  branchId: string;
  branchName: string;
  totalInventory: number;
  totalProducts: number;
  totalSales: number;
  todaySales: number;
  totalSalesAmount: number;
  lowStockItems: number;
  recentSales: number;
  topProducts: any[];
}

const Branches: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { showConfirmation } = useConfirmation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchAnalytics, setBranchAnalytics] = useState<BranchAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contact_person: '',
    phone: '',
    email: '',
    is_active: true
  });

  const fetchBranches = async () => {
    try {
      console.log('Fetching branches...');
      setLoading(true);
      
      const { data, error } = await supabase!
        .from('branches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Add limit to prevent large data issues

      if (error) {
        console.error('Fetch error:', error);
        setBranches([]);
        return;
      }

      console.log('Branches fetched:', data?.length || 0, 'items');
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      console.log('Fetching branch analytics...');
      
      // Get all branches first
      const { data: branchesData, error: branchError } = await supabase!
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .limit(50); // Add limit to prevent performance issues
      
      if (branchError) {
        console.error('Branch fetch error:', branchError);
        setBranchAnalytics([]);
        return;
      }
      
      if (!branchesData || branchesData.length === 0) {
        setBranchAnalytics([]);
        return;
      }
      
      const analytics: BranchAnalytics[] = [];
      
      // Get analytics for each branch
      for (const branch of branchesData) {
        try {
          // Calculate actual inventory count for this branch
          const { data: inventoryData, error: inventoryError } = await supabase!
            .from('inventory')
            .select('quantity')
            .eq('branch_id', branch.id);
          
          let totalInventory = 0;
          if (!inventoryError && inventoryData) {
            totalInventory = inventoryData.reduce((sum, item) => sum + (item.quantity || 0), 0);
          }
          
          // Count unique products in this branch
          const { data: productCount, error: productError } = await supabase!
            .from('inventory')
            .select('product_id, manufactured_product_id')
            .eq('branch_id', branch.id);
          
          let totalProducts = 0;
          if (!productError && productCount) {
            const uniqueProducts = new Set();
            productCount.forEach(item => {
              if (item.product_id) uniqueProducts.add(item.product_id);
              if (item.manufactured_product_id) uniqueProducts.add(item.manufactured_product_id);
            });
            totalProducts = uniqueProducts.size;
          }

          // Calculate sales metrics for this branch
          const { data: salesData, error: salesError } = await supabase!
            .from('sales')
            .select('quantity_sold, total_amount, sale_date')
            .eq('branch_id', branch.id);
          
          let totalSales = 0;
          let totalSalesAmount = 0;
          let todaySales = 0;
          
          if (!salesError && salesData) {
            const today = new Date().toISOString().split('T')[0];
            
            salesData.forEach(sale => {
              totalSales += sale.quantity_sold || 0;
              totalSalesAmount += sale.total_amount || 0;
              
              // Check if sale is from today
              const saleDate = new Date(sale.sale_date).toISOString().split('T')[0];
              if (saleDate === today) {
                todaySales += sale.quantity_sold || 0;
              }
            });
          }
          
          analytics.push({
            branchId: branch.id,
            branchName: branch.name,
            totalInventory: totalInventory,
            totalProducts: totalProducts,
            totalSales: totalSales,
            todaySales: todaySales,
            totalSalesAmount: totalSalesAmount,
            lowStockItems: 0,
            recentSales: 0,
            topProducts: []
          });
        } catch (error) {
          console.error(`Error fetching analytics for branch ${branch.name}:`, error);
          // Add default analytics for this branch
          analytics.push({
            branchId: branch.id,
            branchName: branch.name,
            totalInventory: 0,
            totalProducts: 0,
            totalSales: 0,
            todaySales: 0,
            totalSalesAmount: 0,
            lowStockItems: 0,
            recentSales: 0,
            topProducts: []
          });
        }
      }
      
      setBranchAnalytics(analytics);
      console.log('Branch analytics fetched:', analytics);
    } catch (error) {
      console.error('Error fetching branch analytics:', error);
      setBranchAnalytics([]);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await fetchBranches();
      await fetchBranchAnalytics();
    };
    initializeData();
  }, []);

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('Already submitting, ignoring...');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Adding branch:', formData);
      
      if (editingBranch) {
        // Update existing branch
        const { data, error } = await supabase!
          .from('branches')
          .update({
            name: formData.name,
            location: formData.location,
            contact_person: formData.contact_person,
            phone: formData.phone,
            email: formData.email,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBranch.id)
          .select()
          .single();

        if (error) throw error;
        console.log('Branch updated successfully:', data);
      } else {
        // Add new branch
        const { data, error } = await supabase!
          .from('branches')
          .insert({
            name: formData.name,
            location: formData.location,
            contact_person: formData.contact_person,
            phone: formData.phone,
            email: formData.email,
            is_active: formData.is_active
          })
          .select()
          .single();

        if (error) throw error;
        console.log('Branch added successfully:', data);
      }

      // Reset form and refresh data
      setFormData({
        name: '',
        location: '',
        contact_person: '',
        phone: '',
        email: '',
        is_active: true
      });
      setShowAddForm(false);
      setEditingBranch(null);
      
      // Refresh data immediately
      await fetchBranches();
      await fetchBranchAnalytics();
      
      console.log(editingBranch ? 'Branch updated successfully!' : 'Branch added successfully!');
    } catch (error) {
      console.error('Error saving branch:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error saving branch: ${errorMessage}`);
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

  const handleDelete = async (branchId: string) => {
    const performDelete = async () => {
      try {
        console.log('Deleting branch:', branchId);
        
        // Check for related records first
        const { data: inventoryData } = await supabase!
          .from('inventory')
          .select('id')
          .eq('branch_id', branchId)
          .limit(1);
        
        const { data: salesData } = await supabase!
          .from('sales')
          .select('id')
          .eq('branch_id', branchId)
          .limit(1);
        
        const { data: employeeData } = await supabase!
          .from('employees')
          .select('id')
          .eq('branch_id', branchId)
          .limit(1);
        
        const { data: orderData } = await supabase!
          .from('manufacturing_orders')
          .select('id')
          .eq('branch_id', branchId)
          .limit(1);

        console.log('Related records check:', {
          inventory: inventoryData?.length || 0,
          sales: salesData?.length || 0,
          employees: employeeData?.length || 0,
          orders: orderData?.length || 0
        });

        // If there are related records, warn user
        if ((inventoryData?.length || 0) > 0 || (salesData?.length || 0) > 0 || 
            (employeeData?.length || 0) > 0 || (orderData?.length || 0) > 0) {
          console.error('Cannot delete branch - has related records');
          console.error('Cannot delete branch: It has related records (inventory, sales, employees, or orders). Please delete or reassign these records first.');
          return;
        }

        // Delete the branch
        const { error } = await supabase!
          .from('branches')
          .delete()
          .eq('id', branchId);

        console.log('Delete result:', { error });

        if (error) {
          console.error('Delete error:', error);
          throw error;
        }

        console.log('Branch deleted successfully');
        console.log('Branch deleted successfully!');
        fetchBranches();
        fetchBranchAnalytics();
        
      } catch (error: any) {
        console.error('Error deleting branch:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`Error deleting branch: ${errorMessage}`);
      }
    };

    showConfirmation({
      title: 'Delete Branch',
      message: 'Are you sure you want to delete this branch? This action cannot be undone.',
      onConfirm: performDelete,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-gray-600">Manage your store locations and warehouses</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => fetchBranches()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
            title="Refresh branches"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => {
              setEditingBranch(null);
              setFormData({
                name: '',
                location: '',
                contact_person: '',
                phone: '',
                email: '',
                is_active: true
              });
              setShowAddForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Branch
          </button>
        </div>
      </div>

      {/* Branch Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🏢</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Total Branches</p>
              <p className="text-xl font-bold text-gray-900">{branches.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Active</p>
              <p className="text-xl font-bold text-green-600">
                {branches.filter(branch => branch.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
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
                <div key={analytics.branchId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
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
                  
                  {/* Performance Indicator */}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🏢</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
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
      )}
    </div>
  );
};

export default Branches;
