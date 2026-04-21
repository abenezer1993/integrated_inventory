import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';
import { alertFunction } from '../utils/alerts';

interface BranchAnalytics {
  branchId: string;
  branchName: string;
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  lowStockItems: number;
  topProducts: any[];
  monthlyRevenue: any[];
  inventoryValue: number;
  manufacturingOutput: number;
  employeesCount: number;
}

const BranchAnalytics: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [analytics, setAnalytics] = useState<BranchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days'>('30days');

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchBranchAnalytics();
    }
  }, [selectedBranch, dateRange]);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase!
        .from('branches')
        .select('id, name, location')
        .eq('is_active', true);
      
      if (error) throw error;
      setBranches(data || []);
      
      if (data && data.length > 0) {
        setSelectedBranch(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      alertFunction('Error fetching branches');
    }
  };

  const fetchBranchAnalytics = async () => {
    if (!selectedBranch) return;
    
    try {
      setLoading(true);
      
      // Calculate date range
      const now = new Date();
      const daysBack = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
      const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
      
      // Fetch all data in parallel
      const [
        inventoryData,
        salesData,
        manufacturingData,
        employeesData,
        productsData
      ] = await Promise.all([
        // Inventory data
        supabase!.from('inventory')
          .select('quantity, product_id, manufactured_product_id')
          .eq('branch_id', selectedBranch),
        
        // Sales data
        supabase!.from('sales')
          .select('total_amount, created_at, items(product_id, quantity, unit_price)')
          .eq('branch_id', selectedBranch)
          .gte('created_at', startDate.toISOString()),
        
        // Manufacturing data
        supabase!.from('manufacturing_orders')
          .select('quantity_produced, created_at, product_name')
          .eq('branch_id', selectedBranch)
          .gte('created_at', startDate.toISOString()),
        
        // Employees data
        supabase!.from('employees')
          .select('id')
          .eq('branch_id', selectedBranch)
          .eq('status', 'active'),
        
        // Products data for low stock
        supabase!.from('products')
          .select('id, name, low_stock_threshold, is_active')
          .eq('is_active', true)
      ]);

      // Process analytics data
      const analyticsData: BranchAnalytics = {
        branchId: selectedBranch,
        branchName: branches.find(b => b.id === selectedBranch)?.name || 'Unknown',
        totalRevenue: salesData.data?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0,
        totalOrders: salesData.data?.length || 0,
        totalProducts: inventoryData.data?.length || 0,
        lowStockItems: 0, // Calculate based on thresholds
        topProducts: [],
        monthlyRevenue: [],
        inventoryValue: 0,
        manufacturingOutput: manufacturingData.data?.reduce((sum, order) => sum + (order.quantity_produced || 0), 0) || 0,
        employeesCount: employeesData.data?.length || 0
      };

      // Calculate low stock items
      const lowStockCount = inventoryData.data?.filter(item => {
        const product = productsData.data?.find(p => p.id === item.product_id);
        return product && item.quantity < product.low_stock_threshold;
      }).length || 0;
      analyticsData.lowStockItems = lowStockCount;

      // Calculate monthly revenue trend
      const monthlyData = salesData.data?.reduce((acc: any, sale) => {
        const month = new Date(sale.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        acc[month] = (acc[month] || 0) + (sale.total_amount || 0);
        return acc;
      }, {}) || {};
      
      analyticsData.monthlyRevenue = Object.entries(monthlyData).map(([month, revenue]) => ({
        month,
        revenue
      }));

      // Get top products
      const productSales = salesData.data?.flatMap(sale => sale.items || []) || [];
      const productTotals = productSales.reduce((acc: any, item) => {
        acc[item.product_id] = (acc[item.product_id] || 0) + (item.quantity || 0);
        return acc;
      }, {});
      
      const topProductIds = Object.entries(productTotals)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([id]) => id);
      
      analyticsData.topProducts = topProductIds.map(id => ({
        id,
        name: `Product ${id}`,
        quantity: productTotals[id as string]
      }));

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      alertFunction('Error fetching analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch Analytics</h1>
          <p className="text-gray-600">Detailed performance analysis by branch</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Branch Selector */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} - {branch.location}
              </option>
            ))}
          </select>

          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
        </div>
      </div>

      {analytics && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.totalRevenue)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalOrders.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xl">📦</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Products in Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalProducts}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-xl">📊</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.lowStockItems}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <span className="text-4xl">📈</span>
                  <p className="text-gray-600 mt-2">Revenue chart visualization</p>
                  <p className="text-sm text-gray-500">Chart library integration needed</p>
                </div>
              </div>
            </div>

            {/* Manufacturing Output */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Manufacturing Output</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Units Produced</span>
                  <span className="text-2xl font-bold text-gray-900">{analytics.manufacturingOutput.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-green-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((analytics.manufacturingOutput / 1000) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500">Production efficiency indicator</p>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
              <div className="space-y-3">
                {analytics.topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                        {index + 1}
                      </span>
                      <span className="text-gray-900">{product.name}</span>
                    </div>
                    <span className="text-gray-600 font-medium">{product.quantity} units</span>
                  </div>
                ))}
                {analytics.topProducts.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No product data available</p>
                )}
              </div>
            </div>

            {/* Employee Count */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Staff</h3>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <span className="text-5xl">👥</span>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.employeesCount}</p>
                  <p className="text-gray-600">Active Employees</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Average Order Value</p>
                <p className="text-xl font-bold text-gray-900">
                  {analytics.totalOrders > 0 ? formatCurrency(analytics.totalRevenue / analytics.totalOrders) : '$0'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Products per Employee</p>
                <p className="text-xl font-bold text-gray-900">
                  {analytics.employeesCount > 0 ? (analytics.totalProducts / analytics.employeesCount).toFixed(1) : '0'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Revenue per Employee</p>
                <p className="text-xl font-bold text-gray-900">
                  {analytics.employeesCount > 0 ? formatCurrency(analytics.totalRevenue / analytics.employeesCount) : '$0'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BranchAnalytics;
