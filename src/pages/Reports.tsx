import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';

interface ReportData {
  totalProducts: number;
  totalInventory: number;
  totalSales: number;
  totalPurchases: number;
  totalManufacturing: number;
  totalEmployees: number;
  lowStockItems: number;
}

const Reports: React.FC = () => {
  const { supabase } = useSupabase();
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData>({
    totalProducts: 0,
    totalInventory: 0,
    totalSales: 0,
    totalPurchases: 0,
    totalManufacturing: 0,
    totalEmployees: 0,
    lowStockItems: 0
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    if (!hasPermission('view_all_reports')) {
      setError('You do not have permission to view analytics');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch all data in parallel
      const [
        productsResult,
        inventoryResult,
        salesResult,
        purchasesResult,
        manufacturingResult,
        employeesResult
      ] = await Promise.all([
        supabase!.from('products').select('count', { count: 'exact' }),
        supabase!.from('inventory').select('count', { count: 'exact' }),
        supabase!.from('sales_orders').select('count', { count: 'exact' }),
        supabase!.from('purchase_orders').select('count', { count: 'exact' }),
        supabase!.from('manufacturing_orders').select('count', { count: 'exact' }),
        supabase!.from('employees').select('count', { count: 'exact' })
      ]);

      // Fetch low stock items
      const { data: lowStockData } = await supabase!
        .from('inventory')
        .select('id')
        .lt('quantity', 10); // Low stock threshold

      setReportData({
        totalProducts: productsResult.count || 0,
        totalInventory: inventoryResult.count || 0,
        totalSales: salesResult.count || 0,
        totalPurchases: purchasesResult.count || 0,
        totalManufacturing: manufacturingResult.count || 0,
        totalEmployees: employeesResult.count || 0,
        lowStockItems: lowStockData?.length || 0
      });
    } catch (error: any) {
      console.error('Error fetching report data:', error);
      setError(error?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p>Please log in to access analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error}</p>
          <button
            onClick={fetchReportData}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">Business intelligence and analytics</p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
              <div className="text-2xl">📦</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
              <div className="text-2xl">�</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Inventory</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalInventory}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
              <div className="text-2xl">💰</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
              <div className="text-2xl">🛒</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalPurchases}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-indigo-100 rounded-lg p-3">
              <div className="text-2xl">🏭</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Manufacturing</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalManufacturing}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-pink-100 rounded-lg p-3">
              <div className="text-2xl">👤</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 rounded-lg p-3">
              <div className="text-2xl">⚠️</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">{reportData.lowStockItems}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={fetchReportData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            🔄 Refresh Data
          </button>
          
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            📊 Generate Detailed Report
          </button>
          
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            📈 Export Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;
