import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { notificationService } from '../utils/notifications';
import { alert } from '../utils/alerts';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    growthRate: number;
    manufacturedProductsRevenue: number;
    purchasedProductsRevenue: number;
    manufacturingExpenses: number;
    actualManufacturedProfit: number;
    manufacturedProfitMargin: number;
    woodWorksRevenue: number;
    woodWorksProfit: number;
    woodWorksExpenses: number;
    woodWorksProfitMargin: number;
    gypsumWorkRevenue: number;
    gypsumWorkProfit: number;
    gypsumWorkExpenses: number;
    gypsumWorkProfitMargin: number;
  };
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ETB';
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return '📈';
    if (growth < 0) return '📉';
    return '➡️';
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const fetchAnalyticsData = async () => {
    try {
      const { data: sales } = await supabase.from('sales').select('*');
      const { data: expenses } = await supabase.from('expenses').select('*');
      const { data: orders } = await supabase.from('manufacturing_orders').select('*');
      const { data: products } = await supabase.from('products').select('*');
      const { data: customers } = await supabase.from('customers').select('*');
      const { data: branches } = await supabase.from('branches').select('*');
      const { data: manufacturedProductsList } = await supabase.from('manufactured_products').select('*');
      const { data: manufacturingExpenses } = await supabase.from('manufacturing_expenses').select('*');

      if (!sales || !expenses || !orders || !products || !customers || !branches || !manufacturedProductsList || !manufacturingExpenses) {
        setData(null);
        setLoading(false);
        return;
      }

      const totalRevenue = sales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
      const totalExpenses = expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      const manufacturedProductIds = new Set(manufacturedProductsList.map((p: any) => p.product_id));
      const manufacturedSales = sales.filter((sale: any) => manufacturedProductIds.has(sale.product_id));
      const manufacturedRevenue = manufacturedSales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
      const purchasedRevenue = totalRevenue - manufacturedRevenue;

      const woodWorksProducts = manufacturedProductsList.filter((product: any) => 
        product.category?.toLowerCase().includes('wood') || 
        product.name?.toLowerCase().includes('wood')
      );
      
      const gypsumWorkProducts = manufacturedProductsList.filter((product: any) => 
        product.category?.toLowerCase().includes('gypsum') || 
        product.name?.toLowerCase().includes('gypsum')
      );
      
      const woodWorksProductIds = new Set(woodWorksProducts.map((p: any) => p.id));
      const gypsumWorkProductIds = new Set(gypsumWorkProducts.map((p: any) => p.id));
      
      const woodWorksSales = manufacturedSales.filter((sale: any) => woodWorksProductIds.has(sale.product_id));
      const gypsumWorkSales = manufacturedSales.filter((sale: any) => gypsumWorkProductIds.has(sale.product_id));
      
      const woodWorksRevenue = woodWorksSales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
      const gypsumWorkRevenue = gypsumWorkSales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);

      // Calculate actual expenses for Wood Works and Gypsum Work
      const woodWorksOrderIds = new Set(woodWorksSales.map((sale: any) => sale.manufacturing_order_id));
      const gypsumWorkOrderIds = new Set(gypsumWorkSales.map((sale: any) => sale.manufacturing_order_id));
      
      const woodWorksExpenses = manufacturingExpenses
        .filter((expense: any) => woodWorksOrderIds.has(expense.manufacturing_order_id))
        .reduce((sum: number, expense: any) => sum + expense.amount, 0);
      
      const gypsumWorkExpenses = manufacturingExpenses
        .filter((expense: any) => gypsumWorkOrderIds.has(expense.manufacturing_order_id))
        .reduce((sum: number, expense: any) => sum + expense.amount, 0);
      
      const woodWorksProfit = woodWorksRevenue - woodWorksExpenses;
      const gypsumWorkProfit = gypsumWorkRevenue - gypsumWorkExpenses;
      const woodWorksProfitMargin = woodWorksRevenue > 0 ? (woodWorksProfit / woodWorksRevenue) * 100 : 0;
      const gypsumWorkProfitMargin = gypsumWorkRevenue > 0 ? (gypsumWorkProfit / gypsumWorkRevenue) * 100 : 0;

      setData({
        overview: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin,
          totalOrders: sales.length + orders.length,
          totalProducts: products.length,
          totalCustomers: customers.length,
          growthRate: 0,
          manufacturedProductsRevenue: manufacturedRevenue,
          purchasedProductsRevenue: purchasedRevenue,
          manufacturingExpenses: 0,
          actualManufacturedProfit: 0,
          manufacturedProfitMargin: 0,
          woodWorksRevenue: woodWorksRevenue,
          woodWorksProfit: woodWorksProfit,
          woodWorksExpenses: woodWorksExpenses,
          woodWorksProfitMargin: woodWorksProfitMargin,
          gypsumWorkRevenue: gypsumWorkRevenue,
          gypsumWorkProfit: gypsumWorkProfit,
          gypsumWorkExpenses: gypsumWorkExpenses,
          gypsumWorkProfitMargin: gypsumWorkProfitMargin
        }
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      notificationService.error('Analytics Error', 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 text-sm font-medium">Real-time business intelligence and insights</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Last updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="mb-8 flex justify-end">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-2 right-2 w-16 h-16 bg-blue-400 rounded-full opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Revenue</p>
                  <p className="text-lg font-bold">{formatCurrency(data.overview.totalRevenue)}</p>
                </div>
                <div className="text-blue-100 text-xs">
                  {getGrowthIcon(data.overview.growthRate)} {formatPercentage(data.overview.growthRate)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-5 text-white relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-2 right-2 w-16 h-16 bg-amber-400 rounded-full opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-amber-100 text-xs font-medium uppercase tracking-wider">Wood Works</p>
                  <p className="text-lg font-bold">{formatCurrency(data.overview.woodWorksRevenue)}</p>
                </div>
                <div className="text-right text-amber-100 text-xs">
                  <div>{formatCurrency(data.overview.woodWorksProfit)}</div>
                  <div className="text-xs opacity-75">{formatPercentage(data.overview.woodWorksProfitMargin)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg p-5 text-white relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-2 right-2 w-16 h-16 bg-gray-400 rounded-full opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-gray-100 text-xs font-medium uppercase tracking-wider">Gypsum Work</p>
                  <p className="text-lg font-bold">{formatCurrency(data.overview.gypsumWorkRevenue)}</p>
                </div>
                <div className="text-right text-gray-100 text-xs">
                  <div>{formatCurrency(data.overview.gypsumWorkProfit)}</div>
                  <div className="text-xs opacity-75">{formatPercentage(data.overview.gypsumWorkProfitMargin)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-5 text-white relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-2 right-2 w-16 h-16 bg-purple-400 rounded-full opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-purple-100 text-xs font-medium uppercase tracking-wider">Purchased</p>
                  <p className="text-lg font-bold">{formatCurrency(data.overview.purchasedProductsRevenue)}</p>
                </div>
                <div className="text-right text-purple-100 text-xs">
                  <div>{formatPercentage((data.overview.purchasedProductsRevenue / data.overview.totalRevenue) * 100)}%</div>
                  <div className="text-xs opacity-75">share</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-5 text-white relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-2 right-2 w-16 h-16 bg-orange-400 rounded-full opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-orange-100 text-xs font-medium uppercase tracking-wider">Net Profit</p>
                  <p className="text-lg font-bold">{formatCurrency(data.overview.netProfit)}</p>
                </div>
                <div className="text-right text-orange-100 text-xs">
                  <div>{formatPercentage(data.overview.profitMargin)}%</div>
                  <div className="text-xs opacity-75">margin</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-5 text-white relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-2 right-2 w-16 h-16 bg-red-400 rounded-full opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-red-100 text-xs font-medium uppercase tracking-wider">Total Orders</p>
                  <p className="text-lg font-bold">{formatNumber(data.overview.totalOrders)}</p>
                </div>
                <div className="text-right text-red-100 text-xs">
                  <div>5</div>
                  <div className="text-xs opacity-75">branches</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full mr-3"></div>
              <h2 className="text-xl font-bold text-gray-900">Revenue Breakdown</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-amber-500 rounded-full mr-3"></div>
                  <span className="text-gray-800 font-medium">Wood Works</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900 text-lg">{formatCurrency(data.overview.woodWorksRevenue)}</div>
                  <div className="text-sm text-gray-600 font-medium">{formatPercentage((data.overview.woodWorksRevenue / data.overview.totalRevenue) * 100)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-500 rounded-full mr-3"></div>
                  <span className="text-gray-800 font-medium">Gypsum Work</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900 text-lg">{formatCurrency(data.overview.gypsumWorkRevenue)}</div>
                  <div className="text-sm text-gray-600 font-medium">{formatPercentage((data.overview.gypsumWorkRevenue / data.overview.totalRevenue) * 100)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-gray-800 font-medium">Purchased Products</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900 text-lg">{formatCurrency(data.overview.purchasedProductsRevenue)}</div>
                  <div className="text-sm text-gray-600 font-medium">{formatPercentage((data.overview.purchasedProductsRevenue / data.overview.totalRevenue) * 100)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-3"></div>
              <h2 className="text-xl font-bold text-gray-900">Profit Analysis</h2>
            </div>
            <div className="space-y-4">
              <div className="border-b pb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Total Revenue</span>
                  <span className="font-semibold">{formatCurrency(data.overview.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Total Expenses</span>
                  <span className="font-semibold text-red-600">{formatCurrency(data.overview.totalExpenses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-medium">Net Profit</span>
                  <span className={`font-bold ${data.overview.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.overview.netProfit)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Profit Margin</span>
                <span className={`font-semibold ${data.overview.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(data.overview.profitMargin)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Manufacturing Performance */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full mr-3"></div>
            <h2 className="text-xl font-bold text-gray-900">Manufacturing Performance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Wood Works</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue</span>
                  <span className="font-medium">{formatCurrency(data.overview.woodWorksRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expenses</span>
                  <span className="font-medium text-red-600">{formatCurrency(data.overview.woodWorksExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit</span>
                  <span className={`font-medium ${data.overview.woodWorksProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.overview.woodWorksProfit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Margin</span>
                  <span className={`font-medium ${data.overview.woodWorksProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(data.overview.woodWorksProfitMargin)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Gypsum Work</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue</span>
                  <span className="font-medium">{formatCurrency(data.overview.gypsumWorkRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expenses</span>
                  <span className="font-medium text-red-600">{formatCurrency(data.overview.gypsumWorkExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit</span>
                  <span className={`font-medium ${data.overview.gypsumWorkProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.overview.gypsumWorkProfit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Margin</span>
                  <span className={`font-medium ${data.overview.gypsumWorkProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(data.overview.gypsumWorkProfitMargin)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full mr-3"></div>
              <h3 className="text-lg font-bold text-gray-900">Business Metrics</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Products</span>
                <span className="font-medium">{formatNumber(data.overview.totalProducts)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Customers</span>
                <span className="font-medium">{formatNumber(data.overview.totalCustomers)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Orders</span>
                <span className="font-medium">{formatNumber(data.overview.totalOrders)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full mr-3"></div>
              <h3 className="text-lg font-bold text-gray-900">Revenue Sources</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Manufactured</span>
                <span className="font-medium">{formatCurrency(data.overview.manufacturedProductsRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Purchased</span>
                <span className="font-medium">{formatCurrency(data.overview.purchasedProductsRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-semibold">{formatCurrency(data.overview.totalRevenue)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-3"></div>
              <h3 className="text-lg font-bold text-gray-900">Performance</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Growth Rate</span>
                <span className={`font-medium ${getGrowthColor(data.overview.growthRate)}`}>
                  {formatPercentage(data.overview.growthRate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Profit Margin</span>
                <span className={`font-medium ${data.overview.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(data.overview.profitMargin)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Net Profit</span>
                <span className={`font-semibold ${data.overview.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(data.overview.netProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
