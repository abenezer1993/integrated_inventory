import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';
import { ManufacturingExpense, ManufacturingOrder } from '../types';

interface ExpenseSummary {
  totalExpenses: number;
  totalRevenue: number;
  profitMargin: number;
  profitPercentage: number;
  orderCount: number;
  expensesByType: Record<string, number>;
  monthlyTrend: Array<{ month: string; expenses: number; revenue: number; profit: number }>;
  orders: Array<{
    id: string;
    order_number: string;
    product_name: string;
    quantity_produced: number;
    total_revenue: number;
    total_expenses: number;
    profit_margin: number;
    profit_percentage: number;
    created_at: string;
  }>;
}

const Expenses: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'gypsum' | 'wood' | 'analytics'>('overview');
  const [loading, setLoading] = useState(true);
  const [gypsumData, setGypsumData] = useState<ExpenseSummary | null>(null);
  const [woodData, setWoodData] = useState<ExpenseSummary | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'gypsum' | 'wood'>('gypsum');
  const [selectedOrder, setSelectedOrder] = useState<string>('');

  // Expense form state
  const [expenseType, setExpenseType] = useState<'raw_materials' | 'transport' | 'labour' | 'equipment' | 'overhead' | 'other'>('raw_materials');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [unitCost, setUnitCost] = useState('');

  // Multiple expenses state
  const [multipleExpenses, setMultipleExpenses] = useState<Array<{
    type: 'raw_materials' | 'transport' | 'labour' | 'equipment' | 'overhead' | 'other';
    description: string;
    amount: string;
    quantity: string;
    unit: string;
  }>>([]);

  useEffect(() => {
    fetchExpenseData();
  }, []);

  const fetchExpenseData = async () => {
    try {
      setLoading(true);
      
      // Get all manufacturing orders with product details
      const { data: orders, error: ordersError } = await supabase!
        .from('manufacturing_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Get all expenses
      const { data: expenses, error: expensesError } = await supabase!
        .from('manufacturing_expenses')
        .select('*');

      if (expensesError) throw expensesError;

      // Categorize orders by product_category
      const gypsumOrders = orders?.filter(order => 
        order.product_category === 'gypsum'
      ) || [];

      const woodOrders = orders?.filter(order => 
        order.product_category === 'wood'
      ) || [];

      // Calculate summaries
      const gypsumSummary = calculateExpenseSummary(gypsumOrders, expenses || []);
      const woodSummary = calculateExpenseSummary(woodOrders, expenses || []);

      setGypsumData(gypsumSummary);
      setWoodData(woodSummary);
    } catch (error) {
      console.error('Error fetching expense data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateExpenseSummary = (orders: any[], expenses: ManufacturingExpense[]): ExpenseSummary => {
    const orderIds = orders.map(order => order.id);
    const relatedExpenses = expenses.filter(expense => 
      orderIds.includes(expense.manufacturing_order_id)
    );

    const totalExpenses = relatedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    // For now, we'll estimate revenue based on quantity (you can adjust this later)
    const totalRevenue = orders.reduce((sum, order) => 
      sum + (order.quantity_produced * 100), 0 // Assuming $100 per unit as default
    );
    const profitMargin = totalRevenue - totalExpenses;
    const profitPercentage = totalRevenue > 0 ? (profitMargin / totalRevenue) * 100 : 0;

    // Group expenses by type
    const expensesByType = relatedExpenses.reduce((acc, expense) => {
      acc[expense.expense_type] = (acc[expense.expense_type] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Calculate monthly trend (simplified)
    const monthlyTrend = calculateMonthlyTrend(orders, relatedExpenses);

    // Calculate order-level profitability
    const ordersWithProfit = orders.map(order => {
      const orderExpenses = relatedExpenses.filter(expense => 
        expense.manufacturing_order_id === order.id
      );
      const orderTotalExpenses = orderExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const orderRevenue = order.quantity_produced * 100; // Assuming $100 per unit as default
      const orderProfit = orderRevenue - orderTotalExpenses;
      const orderProfitPercentage = orderRevenue > 0 ? (orderProfit / orderRevenue) * 100 : 0;

      return {
        id: order.id,
        order_number: order.order_number,
        product_name: order.product_name || 'Unknown Product',
        quantity_produced: order.quantity_produced,
        total_revenue: orderRevenue,
        total_expenses: orderTotalExpenses,
        profit_margin: orderProfit,
        profit_percentage: orderProfitPercentage,
        created_at: order.created_at
      };
    });

    return {
      totalExpenses,
      totalRevenue,
      profitMargin,
      profitPercentage,
      orderCount: orders.length,
      expensesByType,
      monthlyTrend,
      orders: ordersWithProfit
    };
  };

  const calculateMonthlyTrend = (orders: any[], expenses: ManufacturingExpense[]) => {
    // Simplified monthly trend calculation
    const last6Months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === month.getMonth() && 
               orderDate.getFullYear() === month.getFullYear();
      });
      
      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.created_at);
        return expenseDate.getMonth() === month.getMonth() && 
               expenseDate.getFullYear() === month.getFullYear();
      });
      
      const monthRevenue = monthOrders.reduce((sum, order) => 
        sum + (order.quantity_produced * 100), 0 // Assuming $100 per unit as default
      );
      
      const monthExpenseTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      last6Months.push({
        month: monthName,
        expenses: monthExpenseTotal,
        revenue: monthRevenue,
        profit: monthRevenue - monthExpenseTotal
      });
    }
    
    return last6Months;
  };

  const addExpenseToMultiple = () => {
    if (description && amount) {
      setMultipleExpenses([...multipleExpenses, {
        type: expenseType,
        description: description,
        amount: amount,
        quantity: quantity,
        unit: unit
      }]);
      
      // Clear form for next expense
      setDescription('');
      setAmount('');
      setQuantity('');
      setUnit('');
    }
  };

  const removeExpenseFromMultiple = (index: number) => {
    setMultipleExpenses(multipleExpenses.filter((_, i) => i !== index));
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If there are multiple expenses, add current one to the list first
    if (description && amount && multipleExpenses.length === 0) {
      addExpenseToMultiple();
    }
    
    if (multipleExpenses.length === 0) {
      alert('Please add at least one expense');
      return;
    }

    console.log('Adding multiple expenses:', multipleExpenses);

    try {
      // Insert all expenses
      const expensesToInsert = multipleExpenses.map(expense => ({
        manufacturing_order_id: selectedOrder,
        expense_type: expense.type,
        description: expense.description,
        amount: parseFloat(expense.amount),
        quantity: expense.quantity ? parseFloat(expense.quantity) : null,
        unit: expense.unit || null,
        unit_cost: expense.quantity && expense.amount ? (parseFloat(expense.amount) / parseFloat(expense.quantity)).toFixed(2) : null
      }));

      console.log('Expenses to insert:', expensesToInsert);

      const { data, error } = await supabase!
        .from('manufacturing_expenses')
        .insert(expensesToInsert);

      console.log('Multiple expenses insertion result:', { data, error });

      if (error) throw error;

      // Reset form
      setSelectedOrder('');
      setExpenseType('raw_materials');
      setDescription('');
      setAmount('');
      setQuantity('');
      setUnit('');
      setUnitCost('');
      setMultipleExpenses([]);
      setShowExpenseForm(false);
      
      // Refresh data
      fetchExpenseData();
      
      alert(`${multipleExpenses.length} expense(s) added successfully!`);
    } catch (error: any) {
      console.error('Error adding expenses:', error);
      
      // Show detailed error information
      let errorMessage = 'Error adding expenses. Please try again.';
      
      if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      if (error?.details) {
        errorMessage += `\nDetails: ${error.details}`;
      }
      
      if (error?.hint) {
        errorMessage += `\nHint: ${error.hint}`;
      }
      
      console.error('Full error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      
      alert(errorMessage);
    }
  };

  const formatCurrency = (amount: number) => {
    return `ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
          <h1 className="text-2xl font-bold text-gray-900">Business Health Tracker</h1>
          <p className="text-gray-600">Track expenses, profitability, and business insights</p>
        </div>
        <button
          onClick={() => setShowExpenseForm(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
        >
          Add Expense
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: 'dashboard' },
            { id: 'gypsum', label: 'Gypsum Work', icon: 'construction' },
            { id: 'wood', label: 'Wood Work', icon: 'carpenter' },
            { id: 'analytics', label: 'Analytics', icon: 'analytics' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">total</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency((gypsumData?.totalRevenue || 0) + (woodData?.totalRevenue || 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">cost</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency((gypsumData?.totalExpenses || 0) + (woodData?.totalExpenses || 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">profit</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Profit</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency((gypsumData?.profitMargin || 0) + (woodData?.profitMargin || 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">%</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overall Margin</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((gypsumData?.totalRevenue || 0) + (woodData?.totalRevenue || 0)) > 0 
                      ? `${(((gypsumData?.profitMargin || 0) + (woodData?.profitMargin || 0)) / ((gypsumData?.totalRevenue || 0) + (woodData?.totalRevenue || 0)) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Gypsum Work Performance</h3>
              {gypsumData ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue</span>
                    <span className="font-medium">{formatCurrency(gypsumData.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expenses</span>
                    <span className="font-medium">{formatCurrency(gypsumData.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit</span>
                    <span className={`font-medium ${gypsumData.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(gypsumData.profitMargin)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Margin</span>
                    <span className={`font-medium ${gypsumData.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {gypsumData.profitPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No gypsum work data available</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Wood Work Performance</h3>
              {woodData ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue</span>
                    <span className="font-medium">{formatCurrency(woodData.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expenses</span>
                    <span className="font-medium">{formatCurrency(woodData.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit</span>
                    <span className={`font-medium ${woodData.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(woodData.profitMargin)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Margin</span>
                    <span className={`font-medium ${woodData.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {woodData.profitPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No wood work data available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gypsum Work Tab */}
      {activeTab === 'gypsum' && gypsumData && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gypsum Work Dashboard</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{gypsumData.orderCount}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Profit Margin</p>
                <p className="text-2xl font-bold text-green-600">{gypsumData.profitPercentage.toFixed(1)}%</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-orange-600">
                  {gypsumData.orderCount > 0 ? formatCurrency(gypsumData.totalRevenue / gypsumData.orderCount) : 'ETB 0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(gypsumData.expensesByType).map(([type, amount]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="capitalize text-gray-700">{type.replace('_', ' ')}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Profitability</h3>
            <div className="space-y-3">
              {gypsumData.orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{order.order_number}</p>
                      <p className="text-sm text-gray-600">{order.product_name}</p>
                      <p className="text-sm text-gray-500">{order.quantity_produced} units</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${order.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(order.profit_margin)}
                      </p>
                      <p className={`text-sm ${order.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {order.profit_percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Revenue: </span>
                      <span className="font-medium">{formatCurrency(order.total_revenue)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Expenses: </span>
                      <span className="font-medium">{formatCurrency(order.total_expenses)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Date: </span>
                      <span className="font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Wood Work Tab */}
      {activeTab === 'wood' && woodData && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Wood Work Dashboard</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{woodData.orderCount}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Profit Margin</p>
                <p className="text-2xl font-bold text-green-600">{woodData.profitPercentage.toFixed(1)}%</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-orange-600">
                  {woodData.orderCount > 0 ? formatCurrency(woodData.totalRevenue / woodData.orderCount) : 'ETB 0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(woodData.expensesByType).map(([type, amount]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="capitalize text-gray-700">{type.replace('_', ' ')}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Profitability</h3>
            <div className="space-y-3">
              {woodData.orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{order.order_number}</p>
                      <p className="text-sm text-gray-600">{order.product_name}</p>
                      <p className="text-sm text-gray-500">{order.quantity_produced} units</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${order.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(order.profit_margin)}
                      </p>
                      <p className={`text-sm ${order.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {order.profit_percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Revenue: </span>
                      <span className="font-medium">{formatCurrency(order.total_revenue)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Expenses: </span>
                      <span className="font-medium">{formatCurrency(order.total_expenses)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Date: </span>
                      <span className="font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">6-Month Trend Analysis</h3>
            <div className="space-y-4">
              {gypsumData?.monthlyTrend.map((month, index) => (
                <div key={index} className="border-b pb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{month.month}</span>
                    <span className={`font-bold ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(month.profit)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Revenue: </span>
                      <span className="font-medium">{formatCurrency(month.revenue)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Expenses: </span>
                      <span className="font-medium">{formatCurrency(month.expenses)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Margin: </span>
                      <span className={`font-medium ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {month.revenue > 0 ? `${((month.profit / month.revenue) * 100).toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Insights</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Revenue Analysis</h4>
                <p className="text-blue-700">
                  {gypsumData && woodData && gypsumData.totalRevenue > woodData.totalRevenue 
                    ? `Gypsum work generates ${((gypsumData.totalRevenue / woodData.totalRevenue) * 100).toFixed(1)}% more revenue than wood work`
                    : woodData && gypsumData && woodData.totalRevenue > gypsumData.totalRevenue
                    ? `Wood work generates ${((woodData.totalRevenue / gypsumData.totalRevenue) * 100).toFixed(1)}% more revenue than gypsum work`
                    : 'Both product categories generate similar revenue'
                  }
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Profitability Analysis</h4>
                <p className="text-green-700">
                  {gypsumData && woodData && gypsumData.profitPercentage > woodData.profitPercentage
                    ? `Gypsum work has higher profit margins (${gypsumData.profitPercentage.toFixed(1)}% vs ${woodData.profitPercentage.toFixed(1)}%)`
                    : woodData && gypsumData && woodData.profitPercentage > gypsumData.profitPercentage
                    ? `Wood work has higher profit margins (${woodData.profitPercentage.toFixed(1)}% vs ${gypsumData.profitPercentage.toFixed(1)}%)`
                    : 'Both product categories have similar profit margins'
                  }
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Cost Optimization</h4>
                <p className="text-orange-700">
                  {gypsumData && woodData && gypsumData.totalExpenses > woodData.totalExpenses
                    ? `Gypsum work has higher operational costs. Review expense categories for optimization opportunities.`
                    : woodData && gypsumData && woodData.totalExpenses > gypsumData.totalExpenses
                    ? `Wood work has higher operational costs. Review expense categories for optimization opportunities.`
                    : 'Both product categories have similar cost structures'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Add Business Expenses</h3>
            <form onSubmit={handleAddExpense}>
            {/* Order Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as 'gypsum' | 'wood')}
              >
                <option value="gypsum">Gypsum Work</option>
                <option value="wood">Wood Work</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturing Order *</label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={selectedOrder}
                onChange={(e) => setSelectedOrder(e.target.value)}
              >
                <option value="">Select Order</option>
                {(selectedCategory === 'gypsum' ? gypsumData?.orders : woodData?.orders)?.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.order_number} - {order.product_name} ({order.quantity_produced} units)
                  </option>
                ))}
              </select>
            </div>

            {/* Expense Form */}
            <div className="border rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Add Expense</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value as any)}
                  >
                    <option value="raw_materials">Raw Materials</option>
                    <option value="transport">Transport</option>
                    <option value="labour">Labour Cost</option>
                    <option value="equipment">Equipment</option>
                    <option value="overhead">Overhead</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Gypsum powder, Wood planks"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g., 50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g., kg, bags, liters"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addExpenseToMultiple}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                + Add to List
              </button>
            </div>

            {/* Expenses List */}
            {multipleExpenses.length > 0 && (
              <div className="border rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">Expenses to Add ({multipleExpenses.length})</h4>
                <div className="space-y-2">
                  {multipleExpenses.map((expense, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                            {expense.type.replace('_', ' ')}
                          </span>
                          <span className="font-medium">{expense.description}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {expense.quantity && expense.unit && (
                            <span>{expense.quantity} {expense.unit} × </span>
                          )}
                          <span className="font-medium">{formatCurrency(parseFloat(expense.amount))}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExpenseFromMultiple(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Amount:</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(multipleExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
              >
                {multipleExpenses.length > 0 
                  ? `Save ${multipleExpenses.length} Expense(s)` 
                  : 'Add Expense'
                }
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExpenseForm(false);
                  setMultipleExpenses([]);
                  setDescription('');
                  setAmount('');
                  setQuantity('');
                  setUnit('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
