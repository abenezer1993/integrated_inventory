import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext-debug';
import { alertFunction } from '../utils/alerts';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';

interface DashboardStats {
  totalInventory: number;
  totalSales: number;
  lowStockItems: number;
  totalProducts: number;
  totalManufacturingOrders: number;
  todaySales: number;
}

interface RecentActivity {
  id: string;
  action: string;
  time: string;
  icon: string;
  color: string;
}

const Dashboard: React.FC = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalInventory: 0,
    totalSales: 0,
    lowStockItems: 0,
    totalProducts: 0,
    totalManufacturingOrders: 0,
    todaySales: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'Add Material':
        navigate('/app/products');
        break;
      case 'Record Sale':
        navigate('/app/sales');
        break;
      case 'Update Inventory':
        navigate('/app/inventory');
        break;
      case 'View Reports':
        // Navigate to reports or show reports modal
        navigate('/app/reports');
        break;
      default:
        break;
    }
  };

  const handleViewAllActivities = () => {
    // Navigate to a detailed activities page or show modal
    alertFunction('Detailed activities view coming soon!');
  };

  const fetchStats = async () => {
    try {
      // Fetch basic stats
      const { data: inventory } = await supabase!.from('inventory').select('quantity');
      const { data: sales } = await supabase!.from('sales').select('total_amount, created_at');
      const { data: lowStock } = await supabase!
        .from('inventory')
        .select('id')
        .lt('quantity', 10);
      
      // Fetch products count
      const { data: products } = await supabase!.from('products').select('id');
      const { data: manufacturedProducts } = await supabase!.from('manufactured_products').select('id');
      
      // Fetch manufacturing orders count
      const { data: manufacturingOrders } = await supabase!.from('manufacturing_orders').select('id');
      
      // Calculate today's sales
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySalesData } = await supabase!
        .from('sales')
        .select('total_amount')
        .gte('created_at', today);

      const totalProducts = (products?.length || 0) + (manufacturedProducts?.length || 0);
      const todaySalesAmount = todaySalesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

      setStats({
        totalInventory: inventory?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        totalSales: sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0,
        lowStockItems: lowStock?.length || 0,
        totalProducts,
        totalManufacturingOrders: manufacturingOrders?.length || 0,
        todaySales: todaySalesAmount,
      });

      // Fetch recent activities
      await fetchRecentActivities();

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const activities: RecentActivity[] = [];
      
      // Get recent sales
      const { data: recentSales } = await supabase!
        .from('sales')
        .select('created_at, total_amount')
        .order('created_at', { ascending: false })
        .limit(3);
      
      recentSales?.forEach(sale => {
        activities.push({
          id: `sale-${sale.created_at}`,
          action: `Sale completed - $${sale.total_amount}`,
          time: formatTimeAgo(sale.created_at),
          icon: '✅',
          color: 'text-green-500',
        });
      });

      // Get recent manufacturing orders
      const { data: recentOrders } = await supabase!
        .from('manufacturing_orders')
        .select('created_at, product_name, quantity_produced')
        .order('created_at', { ascending: false })
        .limit(3);
      
      recentOrders?.forEach(order => {
        activities.push({
          id: `order-${order.created_at}`,
          action: `Manufactured ${order.quantity_produced} units of ${order.product_name}`,
          time: formatTimeAgo(order.created_at),
          icon: '🏭',
          color: 'text-blue-500',
        });
      });

      // Sort by time and take latest 5
      setRecentActivities(activities.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
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
      value: stats.totalInventory.toLocaleString(),
      icon: '📦',
      gradient: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
    },
    {
      title: 'Total Sales',
      value: `$${stats.totalSales.toFixed(2)}`,
      icon: '💰',
      gradient: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-50',
      textColor: 'text-violet-700',
      borderColor: 'border-violet-200',
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: '⚠️',
      gradient: 'from-red-500 to-rose-600',
      bgColor: 'bg-red-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
    },
    {
      title: 'Total Products',
      value: stats.totalProducts.toLocaleString(),
      icon: '📋',
      gradient: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Manufacturing Orders',
      value: stats.totalManufacturingOrders,
      icon: '🏭',
      gradient: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
    },
    {
      title: 'Today\'s Sales',
      value: `$${stats.todaySales.toFixed(2)}`,
      icon: '📈',
      gradient: 'from-cyan-500 to-sky-600',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-700',
      borderColor: 'border-cyan-200',
    },
  ];

  const quickActions = [
    { name: 'Add Material', icon: '➕', color: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'Record Sale', icon: '💳', color: 'bg-green-600 hover:bg-green-700' },
    { name: 'Update Inventory', icon: '🔄', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { name: 'View Reports', icon: '📈', color: 'bg-purple-600 hover:bg-purple-700' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-8 text-white shadow-2xl backdrop-blur-sm border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 tracking-tight">Inventory Dashboard</h1>
              <p className="text-indigo-100 text-lg font-medium">Real-time inventory management system</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30">
                <div className="text-center">
                  <p className="text-sm font-medium text-indigo-100">Today</p>
                  <p className="text-xl font-bold">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30">
                <div className="text-center">
                  <p className="text-sm font-medium text-indigo-100">System</p>
                  <p className="text-xl font-bold flex items-center justify-center">
                    <span className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                    Online
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {statCards.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200">
          <div className={`h-2 bg-gradient-to-r ${stat.gradient}`}></div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center shadow-lg`}>
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
          <button 
            onClick={handleViewAllActivities}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all →
          </button>
        </div>
        <div className="space-y-4">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 ${activity.color} bg-opacity-10 rounded-full flex items-center justify-center`}>
                  <span className={activity.color}>{activity.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recent activities</p>
            </div>
          )}
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
              onClick={() => handleQuickAction(action.name)}
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
</div>
);
};

export default Dashboard;
