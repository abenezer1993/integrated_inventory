import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface DashboardStats {
  totalInventory: number;
  totalSales: number;
  lowStockItems: number;
  totalProducts: number;
  totalManufacturingOrders: number;
  todaySales: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}

interface RecentActivity {
  id: string;
  action: string;
  time: string;
  type: 'sale' | 'manufacturing' | 'inventory' | 'alert';
}

interface SalesData {
  name: string;
  sales: number;
  orders: number;
}

interface InventoryDistribution {
  name: string;
  value: number;
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
    weeklyGrowth: 0,
    monthlyGrowth: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [inventoryDistribution, setInventoryDistribution] = useState<InventoryDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimeRange, setActiveTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    fetchStats();
    fetchSalesChart();
    fetchInventoryDistribution();
  }, []);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-material':
        navigate('/app/products');
        break;
      case 'record-sale':
        navigate('/app/sales');
        break;
      case 'update-inventory':
        navigate('/app/inventory');
        break;
      case 'view-reports':
        navigate('/app/reports');
        break;
      default:
        break;
    }
  };

  const fetchSalesChart = async () => {
    try {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const chartData: SalesData[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const { data: daySales } = await supabase!
          .from('sales')
          .select('total_amount')
          .gte('created_at', dateStr)
          .lt('created_at', new Date(date.getTime() + 86400000).toISOString().split('T')[0]);

        chartData.push({
          name: days[date.getDay()],
          sales: daySales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0,
          orders: daySales?.length || 0,
        });
      }

      setSalesData(chartData);
    } catch (error) {
      console.error('Error fetching sales chart:', error);
    }
  };

  const fetchInventoryDistribution = async () => {
    try {
      const { data: inventory } = await supabase!
        .from('inventory')
        .select('quantity, products(name, category)');

      const categoryMap: Record<string, number> = {};
      
      inventory?.forEach((item: any) => {
        const category = item.products?.category || 'Uncategorized';
        categoryMap[category] = (categoryMap[category] || 0) + (item.quantity || 0);
      });

      const colors = ['#818CF8', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6'];
      const distribution = Object.entries(categoryMap).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }));

      setInventoryDistribution(distribution);
    } catch (error) {
      console.error('Error fetching inventory distribution:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: inventory } = await supabase!.from('inventory').select('quantity');
      const { data: sales } = await supabase!.from('sales').select('total_amount, created_at');
      const { data: lowStock } = await supabase!
        .from('inventory')
        .select('id')
        .lt('quantity', 10);
      
      const { data: products } = await supabase!.from('products').select('id');
      const { data: manufacturedProducts } = await supabase!.from('manufactured_products').select('id');
      const { data: manufacturingOrders } = await supabase!.from('manufacturing_orders').select('id');
      
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySalesData } = await supabase!
        .from('sales')
        .select('total_amount')
        .gte('created_at', today);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { data: thisWeekSales } = await supabase!
        .from('sales')
        .select('total_amount')
        .gte('created_at', weekAgo.toISOString());

      const { data: lastWeekSales } = await supabase!
        .from('sales')
        .select('total_amount')
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', weekAgo.toISOString());

      const thisWeekTotal = thisWeekSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      const lastWeekTotal = lastWeekSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 1;
      const weeklyGrowth = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;

      const totalProducts = (products?.length || 0) + (manufacturedProducts?.length || 0);
      const todaySalesAmount = todaySalesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

      setStats({
        totalInventory: inventory?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        totalSales: sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0,
        lowStockItems: lowStock?.length || 0,
        totalProducts,
        totalManufacturingOrders: manufacturingOrders?.length || 0,
        todaySales: todaySalesAmount,
        weeklyGrowth: Math.round(weeklyGrowth * 10) / 10,
        monthlyGrowth: 12.5,
      });

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
      
      const { data: recentSales } = await supabase!
        .from('sales')
        .select('created_at, total_amount')
        .order('created_at', { ascending: false })
        .limit(3);
      
      recentSales?.forEach(sale => {
        activities.push({
          id: `sale-${sale.created_at}`,
          action: `Sale completed - $${sale.total_amount?.toFixed(2)}`,
          time: formatTimeAgo(sale.created_at),
          type: 'sale',
        });
      });

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
          type: 'manufacturing',
        });
      });

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
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'manufacturing':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
      case 'inventory':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'sale':
        return 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30';
      case 'manufacturing':
        return 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30';
      case 'inventory':
        return 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-400 ring-1 ring-zinc-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#09090b]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-b-purple-500/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-zinc-100">Loading Dashboard</p>
            <p className="text-sm text-zinc-500 mt-1">Fetching your data...</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: `${stats.weeklyGrowth >= 0 ? '+' : ''}${stats.weeklyGrowth}%`,
      changeType: stats.weeklyGrowth >= 0 ? 'positive' : 'negative',
      subtitle: 'vs last week',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-indigo-500 to-purple-500',
      bgGlow: 'bg-indigo-500/10',
    },
    {
      title: "Today's Sales",
      value: `$${stats.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'Live',
      changeType: 'live',
      subtitle: 'Real-time tracking',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-teal-500',
      bgGlow: 'bg-emerald-500/10',
    },
    {
      title: 'Total Inventory',
      value: stats.totalInventory.toLocaleString(),
      change: `${stats.totalProducts} products`,
      changeType: 'neutral',
      subtitle: 'Units in stock',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      gradient: 'from-blue-500 to-cyan-500',
      bgGlow: 'bg-blue-500/10',
    },
    {
      title: 'Low Stock Alert',
      value: stats.lowStockItems.toString(),
      change: stats.lowStockItems > 0 ? 'Needs attention' : 'All good',
      changeType: stats.lowStockItems > 0 ? 'warning' : 'positive',
      subtitle: stats.lowStockItems > 0 ? 'Items below threshold' : 'Stock levels healthy',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      gradient: stats.lowStockItems > 0 ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-green-500',
      bgGlow: stats.lowStockItems > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
    },
  ];

  const quickActions = [
    { 
      id: 'add-material',
      name: 'Add Material', 
      description: 'Add new products',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      color: 'indigo',
    },
    { 
      id: 'record-sale',
      name: 'Record Sale', 
      description: 'New transaction',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'emerald',
    },
    { 
      id: 'update-inventory',
      name: 'Update Stock', 
      description: 'Modify levels',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      color: 'blue',
    },
    { 
      id: 'view-reports',
      name: 'View Reports', 
      description: 'Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'purple',
    },
  ];

  const getQuickActionColors = (color: string) => {
    const colors: Record<string, string> = {
      indigo: 'hover:bg-indigo-500/10 hover:border-indigo-500/30 group-hover:text-indigo-400 group-hover:bg-indigo-500/20',
      emerald: 'hover:bg-emerald-500/10 hover:border-emerald-500/30 group-hover:text-emerald-400 group-hover:bg-emerald-500/20',
      blue: 'hover:bg-blue-500/10 hover:border-blue-500/30 group-hover:text-blue-400 group-hover:bg-blue-500/20',
      purple: 'hover:bg-purple-500/10 hover:border-purple-500/30 group-hover:text-purple-400 group-hover:bg-purple-500/20',
    };
    return colors[color] || colors.indigo;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg px-4 py-3 shadow-xl">
          <p className="text-xs text-zinc-400 mb-1">{label}</p>
          <p className="text-sm font-semibold text-zinc-100">
            ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          {payload[1] && (
            <p className="text-xs text-zinc-400 mt-1">
              {payload[1].value} orders
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Dashboard</h1>
                <span className="px-2 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-full ring-1 ring-indigo-500/30">
                  Pro
                </span>
              </div>
              <p className="text-zinc-500 mt-1 text-sm">
                Welcome back. Here&apos;s your business at a glance.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/80 rounded-lg border border-zinc-800 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-sm text-zinc-300">System Online</span>
              </div>
              <div className="px-3 py-2 bg-zinc-900/80 rounded-lg border border-zinc-800 backdrop-blur-sm">
                <span className="text-sm text-zinc-400">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <div 
              key={index}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`relative group bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5 transition-all duration-300 hover:border-zinc-700/50 hover:bg-zinc-900/80 ${hoveredCard === index ? 'shadow-lg shadow-black/20' : ''}`}
            >
              {/* Gradient glow effect */}
              <div className={`absolute inset-0 rounded-xl ${stat.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl`} />
              
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.gradient} p-2.5 text-white shadow-lg`}>
                    {stat.icon}
                  </div>
                  <div className="flex items-center">
                    {stat.changeType === 'positive' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full ring-1 ring-emerald-500/20">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        {stat.change}
                      </span>
                    )}
                    {stat.changeType === 'negative' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-full ring-1 ring-red-500/20">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        {stat.change}
                      </span>
                    )}
                    {stat.changeType === 'warning' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full ring-1 ring-amber-500/20">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="4" />
                        </svg>
                        {stat.change}
                      </span>
                    )}
                    {stat.changeType === 'neutral' && (
                      <span className="text-xs font-medium text-zinc-500">{stat.change}</span>
                    )}
                    {stat.changeType === 'live' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full ring-1 ring-emerald-500/20">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                        </span>
                        {stat.change}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-zinc-100 tracking-tight">{stat.value}</p>
                  <p className="text-xs text-zinc-500 mt-1">{stat.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Sales Chart */}
          <div className="xl:col-span-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Sales Overview</h2>
                <p className="text-sm text-zinc-500">Revenue and order trends</p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-zinc-800/50 rounded-lg">
                {(['7d', '30d', '90d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setActiveTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      activeTimeRange === range
                        ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="#818CF8" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#818CF8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34D399" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#818CF8" 
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                    dot={false}
                    activeDot={{ r: 6, fill: '#818CF8', stroke: '#09090b', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inventory Distribution */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-100">Inventory Distribution</h2>
              <p className="text-sm text-zinc-500">Stock by category</p>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {inventoryDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid #27272a', 
                      borderRadius: '8px',
                      color: '#fafafa'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {inventoryDistribution.slice(0, 4).map((item, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="text-sm text-zinc-400">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-zinc-200">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Activities */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Recent Activity</h2>
                <p className="text-sm text-zinc-500">Latest transactions</p>
              </div>
              <button 
                onClick={() => navigate('/app/access-logs')}
                className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                View all
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-700/50"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{activity.action}</p>
                      <p className="text-xs text-zinc-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-xl bg-zinc-800/50 flex items-center justify-center mb-4 ring-1 ring-zinc-700/50">
                    <svg className="w-7 h-7 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-400 font-medium">No recent activities</p>
                  <p className="text-xs text-zinc-500 mt-1">Activities will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Quick Actions</h2>
                <p className="text-sm text-zinc-500">Common operations</p>
              </div>
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest bg-zinc-800 px-2 py-1 rounded">
                Shortcuts
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  className={`group flex flex-col items-center justify-center gap-3 p-5 rounded-xl bg-zinc-800/30 border border-zinc-700/30 transition-all duration-200 ${getQuickActionColors(action.color)}`}
                >
                  <div className={`w-11 h-11 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 transition-all duration-200 ring-1 ring-zinc-700/50 ${action.color === 'indigo' ? 'group-hover:bg-indigo-500/20 group-hover:text-indigo-400 group-hover:ring-indigo-500/30' : ''} ${action.color === 'emerald' ? 'group-hover:bg-emerald-500/20 group-hover:text-emerald-400 group-hover:ring-emerald-500/30' : ''} ${action.color === 'blue' ? 'group-hover:bg-blue-500/20 group-hover:text-blue-400 group-hover:ring-blue-500/30' : ''} ${action.color === 'purple' ? 'group-hover:bg-purple-500/20 group-hover:text-purple-400 group-hover:ring-purple-500/30' : ''}`}>
                    {action.icon}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-200">{action.name}</p>
                    <p className="text-xs text-zinc-500">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Performance Metrics</h2>
              <p className="text-sm text-zinc-500">Key business indicators</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-5 bg-zinc-800/30 rounded-xl border border-zinc-700/30 hover:border-zinc-700/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Weekly Growth</p>
                <p className="text-2xl font-bold text-zinc-100">+{stats.weeklyGrowth}%</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5 bg-zinc-800/30 rounded-xl border border-zinc-700/30 hover:border-zinc-700/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Efficiency Rate</p>
                <p className="text-2xl font-bold text-zinc-100">94.2%</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5 bg-zinc-800/30 rounded-xl border border-zinc-700/30 hover:border-zinc-700/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Manufacturing Orders</p>
                <p className="text-2xl font-bold text-zinc-100">{stats.totalManufacturingOrders}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
