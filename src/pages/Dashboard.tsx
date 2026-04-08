import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

interface DashboardStats {
  totalInventory: number;
  totalSales: number;
  lowStockItems: number;
}

const Dashboard: React.FC = () => {
  const { supabase } = useSupabase();
  const [stats, setStats] = useState<DashboardStats>({
    totalInventory: 0,
    totalSales: 0,
    lowStockItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: inventory } = await supabase!.from('inventory').select('quantity');
      const { data: sales } = await supabase!.from('sales').select('total_amount');
      const { data: lowStock } = await supabase!
        .from('inventory')
        .select('id')
        .lt('quantity', 10);

      setStats({
        totalInventory: inventory?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        totalSales: sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0,
        lowStockItems: lowStock?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Inventory',
      value: stats.totalInventory,
      icon: '📊',
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Total Sales',
      value: `$${stats.totalSales.toFixed(2)}`,
      icon: '💰',
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: '⚠️',
      gradient: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
  ];

  const quickActions = [
    { name: 'Add Material', icon: '➕', color: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'Record Sale', icon: '💳', color: 'bg-green-600 hover:bg-green-700' },
    { name: 'Update Inventory', icon: '🔄', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { name: 'View Reports', icon: '📈', color: 'bg-purple-600 hover:bg-purple-700' },
  ];

  const recentActivities = [
    { action: 'New material added', time: '2 hours ago', icon: '📦', color: 'text-blue-500' },
    { action: 'Sale completed', time: '5 hours ago', icon: '✅', color: 'text-green-500' },
    { action: 'Inventory updated', time: '1 day ago', icon: '🔄', color: 'text-yellow-500' },
    { action: 'Low stock alert', time: '2 days ago', icon: '⚠️', color: 'text-red-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Welcome to Inventory Pro</h1>
        <p className="text-blue-100 text-lg">Manage your inventory with ease and efficiency</p>
        <div className="mt-6 flex items-center space-x-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <span className="text-sm">Today</span>
            <p className="font-semibold">{new Date().toLocaleDateString()}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <span className="text-sm">System Status</span>
            <p className="font-semibold">🟢 Online</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${stat.gradient}`}></div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center`}>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Activities</h2>
            <span className="text-sm text-gray-500">View all →</span>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 ${activity.color} bg-opacity-10 rounded-full flex items-center justify-center`}>
                  <span className={activity.color}>{activity.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
            <span className="text-sm text-gray-500">Shortcuts</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className={`${action.color} text-white p-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-2xl">{action.icon}</span>
                  <span className="font-medium">{action.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white">📈</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Monthly Growth</h3>
            <p className="text-2xl font-bold text-blue-600">+12.5%</p>
            <p className="text-sm text-gray-600 mt-1">Compared to last month</p>
          </div>
          <div className="text-center p-6 bg-green-50 rounded-lg">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white">🎯</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Efficiency Rate</h3>
            <p className="text-2xl font-bold text-green-600">94.2%</p>
            <p className="text-sm text-gray-600 mt-1">Inventory accuracy</p>
          </div>
          <div className="text-center p-6 bg-purple-50 rounded-lg">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white">⚡</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Processing Time</h3>
            <p className="text-2xl font-bold text-purple-600">1.2s</p>
            <p className="text-sm text-gray-600 mt-1">Average response time</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
