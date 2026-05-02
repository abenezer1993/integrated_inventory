import React, { useState, useEffect } from 'react';
import { alertFunction } from '../utils/alerts';
import { useAuth } from '../contexts/AuthContext-debug';
import { useSupabase } from '../contexts/SupabaseContext';
import { useConfirmation } from '../utils/confirmations';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Expense {
  id?: string;
  expense_type: string;
  description: string;
  amount: number;
  quantity?: number;
  unit?: string;
  unit_cost?: number;
  manufacturing_order_id?: string;
  created_at?: string;
  manufacturing_orders?: {
    id: string;
    order_number: string;
    product_name: string;
  };
}

interface MultipleExpense {
  type: 'raw_materials' | 'transport' | 'labour' | 'equipment' | 'overhead' | 'other';
  description: string;
  amount: string;
  quantity: string;
  unit: string;
  manufacturing_order_id?: string | null;
}

interface ExpenseSummary {
  totalExpenses: number;
  totalRevenue: number;
  profitMargin: number;
  profitPercentage: number;
  orderCount: number;
  expensesByType: Record<string, number>;
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
  const { showConfirmation } = useConfirmation();
    const [activeTab, setActiveTab] = useState<'expenses' | 'health' | 'gypsum' | 'wood' | 'analytics'>('expenses');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [multipleExpenses, setMultipleExpenses] = useState<MultipleExpense[]>([]);
  const [gypsumData, setGypsumData] = useState<ExpenseSummary | null>(null);
  const [woodData, setWoodData] = useState<ExpenseSummary | null>(null);
  const [manufacturingOrders, setManufacturingOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'grouped'>('grouped');

  // Form states
  const [expenseType, setExpenseType] = useState<'raw_materials' | 'transport' | 'labour' | 'equipment' | 'overhead' | 'other'>('raw_materials');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Calculate total amount when unit cost or quantity changes
  const calculateTotalAmount = () => {
    const unitCostValue = parseFloat(unitCost) || 0;
    const quantityValue = parseFloat(quantity) || 0;
    const total = unitCostValue * quantityValue;
    return total.toFixed(2);
  };

  // Update amount when unit cost or quantity changes
  useEffect(() => {
    const total = calculateTotalAmount();
    setAmount(total);
  }, [unitCost, quantity]);

  // Ensure unit cost is properly formatted when it changes
  useEffect(() => {
    if (unitCost && unitCost !== '0.00') {
      const formattedCost = Number(unitCost).toFixed(2);
      if (formattedCost !== unitCost) {
        setUnitCost(formattedCost);
      }
    }
  }, [unitCost]);

  // Handle product selection
  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      setDescription(product.product_name);
      // Ensure unit price is properly converted to string with 2 decimal places
      const unitPrice = product.unit_price ? Number(product.unit_price).toFixed(2) : '0.00';
      setUnitCost(unitPrice);
    } else {
      // Reset if no product selected
      setUnitCost('0.00');
    }
  };

  // Fetch employees for multiple selection
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase!
          .from('employees')
          .select('id, full_name, position')
          .eq('is_active', true)
          .order('full_name');

        if (error) throw error;
        setEmployees(data || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchEmployees();
  }, []);

  // Fetch products from purchase orders
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase!
          .from('purchase_orders')
          .select('id, product_name, supplier_name, unit_price')
          .order('product_name');
        
        if (error) throw error;
        
        // Get unique products with latest unit price
        const uniqueProducts = data?.reduce((acc: any, item: any) => {
          const existing = acc.find((p: any) => p.product_name === item.product_name);
          if (!existing) {
            acc.push({
              id: item.id,
              product_name: item.product_name,
              supplier_name: item.supplier_name,
              unit_price: item.unit_price
            });
          }
          return acc;
        }, []) || [];
        
        setProducts(uniqueProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, []);

  const formatCurrency = (amount: number) => {
    return `ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper functions for real profitability data
  const getProfitabilityData = () => {
    const gypsumRevenue = gypsumData?.totalRevenue || 0;
    const gypsumExpenses = gypsumData?.totalExpenses || 0;
    const gypsumProfit = gypsumRevenue - gypsumExpenses;
    
    const woodRevenue = woodData?.totalRevenue || 0;
    const woodExpenses = woodData?.totalExpenses || 0;
    const woodProfit = woodRevenue - woodExpenses;
    
    return [
      { 
        name: 'Gypsum Work', 
        revenue: gypsumRevenue, 
        expenses: gypsumExpenses, 
        profit: gypsumProfit,
        isProfitable: gypsumProfit >= 0
      },
      { 
        name: 'Wood Work', 
        revenue: woodRevenue, 
        expenses: woodExpenses, 
        profit: woodProfit,
        isProfitable: woodProfit >= 0
      }
    ];
  };

  const getPieChartData = () => {
    const data = getProfitabilityData();
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    
    if (totalRevenue === 0) {
      return [
        { name: 'No Revenue Data', value: 1, color: '#e5e7eb' }
      ];
    }
    
    return data.map(item => ({
      name: item.name,
      value: item.revenue,
      color: item.name === 'Gypsum Work' ? '#f97316' : '#eab308'
    }));
  };

  const getExpensePieChartData = () => {
    const data = getProfitabilityData();
    const totalExpenses = data.reduce((sum, item) => sum + item.expenses, 0);
    
    if (totalExpenses === 0) {
      return [
        { name: 'No Expense Data', value: 1, color: '#e5e7eb' }
      ];
    }
    
    return data.map(item => ({
      name: `${item.name} Expenses`,
      value: item.expenses,
      color: item.name === 'Gypsum Work' ? '#ef4444' : '#f59e0b'
    }));
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchExpenses(),
        fetchManufacturingOrders(),
        fetchOptimizedCategoryData()
      ]);
      setLoading(false);
    };
    initializeData();
  }, []);

  const fetchManufacturingOrders = async () => {
    try {
      const { data, error } = await supabase!
        .from('manufacturing_orders')
        .select('id, order_number, product_name, quantity_produced')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setManufacturingOrders(data || []);
    } catch (error) {
      console.error('Error fetching manufacturing orders:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      // First fetch expenses
      const { data: expenses, error: expensesError } = await supabase!
        .from('manufacturing_expenses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (expensesError) throw expensesError;
      
      // Then fetch manufacturing orders
      const { data: orders, error: ordersError } = await supabase!
        .from('manufacturing_orders')
        .select('id, order_number, product_name');
      
      if (ordersError) throw ordersError;
      
      // Manually join the data
      const expensesWithOrders = expenses?.map(expense => ({
        ...expense,
        manufacturing_orders: expense.manufacturing_order_id 
          ? orders.find(order => order.id === expense.manufacturing_order_id)
          : null
      })) || [];
      
      setExpenses(expensesWithOrders);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchOptimizedCategoryData = async () => {
    try {
      // Fetch ALL orders and expenses at once - NO redundant queries!
      const [
        { data: allOrders },
        { data: allExpenses }
      ] = await Promise.all([
        supabase!
          .from('manufacturing_orders')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase!
          .from('manufacturing_expenses')
          .select('manufacturing_order_id, expense_type, amount')
      ]);

      // Helper function to calculate category data
      const calculateCategoryData = (category: 'gypsum' | 'wood') => {
        const orders = allOrders?.filter(order => order.product_category === category) || [];
        const orderIds = orders.map(order => order.id);
        
        const expenses = allExpenses?.filter(expense => 
          orderIds.includes(expense.manufacturing_order_id)
        ) || [];

        // Calculate expenses by type
        const expensesByType = expenses.reduce((acc, expense) => {
          acc[expense.expense_type] = (acc[expense.expense_type] || 0) + expense.amount;
          return acc;
        }, {} as Record<string, number>);

        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total_revenue || 0), 0);
        const profitMargin = totalRevenue - totalExpenses;
        const profitPercentage = totalRevenue > 0 ? (profitMargin / totalRevenue) * 100 : 0;

        return {
          totalExpenses,
          totalRevenue,
          profitMargin,
          profitPercentage,
          orderCount: orders.length,
          expensesByType,
          orders: orders.map(order => ({
            id: order.id,
            order_number: order.order_number,
            product_name: order.product_name,
            quantity_produced: order.quantity_produced,
            total_revenue: order.total_revenue,
            total_expenses: order.total_expenses,
            profit_margin: order.profit_margin,
            profit_percentage: order.profit_percentage,
            created_at: order.created_at
          }))
        };
      };

      // Set both categories data at once
      setGypsumData(calculateCategoryData('gypsum'));
      setWoodData(calculateCategoryData('wood'));
      
    } catch (error) {
      console.error('Error fetching category data:', error);
    }
  };

  const addExpenseToMultiple = () => {
    if (!description || !amount) {
      alertFunction('Please fill in at least Description and Amount before adding to list');
      return;
    }

    const newExpense = {
      type: expenseType || 'other',
      description,
      amount: amount,
      quantity: quantity,
      unit: unit,
      manufacturing_order_id: selectedOrder || null
    };

    setMultipleExpenses([...multipleExpenses, newExpense]);
    
    // Clear form for next expense
    setDescription('');
    setAmount('');
    setQuantity('');
    setUnit('');
  };

  const removeFromMultiple = (index: number) => {
    setMultipleExpenses(multipleExpenses.filter((_, i) => i !== index));
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (multipleExpenses.length > 0) {
      // Save all expenses from list
      try {
        const { error } = await supabase!
          .from('manufacturing_expenses')
          .insert(multipleExpenses.filter(expense => expense && expense.type).map(expense => ({
            expense_type: expense.type,
            description: expense.description,
            amount: parseFloat(expense.amount || '0'),
            quantity: expense.quantity ? parseFloat(expense.quantity) : null,
            unit: expense.unit,
            manufacturing_order_id: expense.manufacturing_order_id,
            created_by: user?.id
          })));

        if (error) throw error;
        
        alertFunction(`Successfully added ${multipleExpenses.length} expenses!`);
        setMultipleExpenses([]);
        setSelectedOrder('');
        setShowAddModal(false);
        fetchExpenses();
        fetchOptimizedCategoryData();
      } catch (error) {
        console.error('Error adding multiple expenses:', error);
        alertFunction('Error adding expenses. Please try again.');
      }
    } else {
      // Save single expense
      try {
        const { error } = await supabase!
          .from('manufacturing_expenses')
          .insert({
            expense_type: expenseType,
            description,
            amount: parseFloat(amount),
            quantity: quantity ? parseFloat(quantity) : null,
            unit,
            manufacturing_order_id: selectedOrder || null,
            created_by: user?.id
          });

        if (error) throw error;
        
        alertFunction('Expense added successfully!');
        setSelectedOrder('');
        setDescription('');
        setAmount('');
        setQuantity('');
        setUnit('');
        setShowAddModal(false);
        fetchExpenses();
        fetchOptimizedCategoryData();
      } catch (error) {
        console.error('Error adding expense:', error);
        alertFunction('Error adding expense. Please try again.');
      }
    }
  };

  const deleteExpense = async (id: string) => {
    console.log('Delete function called for expense:', id);
    
    const performDelete = async () => {
      console.log('Delete confirmed for expense:', id);
      try {
        // Check current user and their role
        const { data: { user } } = await supabase!.auth.getUser();
        console.log('Current user:', user);
        console.log('User role:', user?.user_metadata?.role || user?.app_metadata?.role);
        
        // Try direct deletion without all the complex checking
        console.log('Attempting direct deletion...');
        const { error, data } = await supabase!
          .from('manufacturing_expenses')
          .delete()
          .eq('id', id)
          .select();
        
        console.log('Delete result:', { error, data, dataCount: data?.length });
        
        if (error) {
          console.error('Delete error:', error);
          alertFunction(`Error: ${error.message}`);
          return;
        }
        
        if (!data || data.length === 0) {
          console.warn('No records deleted - checking RLS policies');
          
          // Try using service role key approach (bypass RLS)
          console.log('Trying service role approach...');
          alertFunction('Delete operation failed due to permissions. Please contact admin to update RLS policies.');
          return;
        }
        
        console.log('Successfully deleted expense:', data);
        alertFunction('Expense deleted successfully!');
        
        // Refresh the list
        await fetchExpenses();
        
      } catch (error: any) {
        console.error('Delete exception:', error);
        alertFunction(`Delete failed: ${error.message}`);
      }
    };

    console.log('Showing confirmation dialog...');
    showConfirmation({
      title: 'Delete Expense', 
      message: 'Are you sure you want to delete this expense?', 
      onConfirm: performDelete, 
      type: 'danger', 
      confirmText: 'Delete', 
      cancelText: 'Cancel'
    });
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
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600">Track expenses and business insights</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Expense
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'expenses', label: 'Expenses', icon: 'receipt' },
            { id: 'health', label: 'Business Health', icon: 'analytics' },
            { id: 'gypsum', label: 'Gypsum Work', icon: 'construction' },
            { id: 'wood', label: 'Wood Work', icon: 'carpenter' },
            { id: 'analytics', label: 'Analytics', icon: 'trending_up' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={'py-2 px-1 border-b-2 font-medium text-sm ' + (
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('all')}
                  className={'px-3 py-1 rounded-lg text-sm font-medium ' + (
                    viewMode === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  )}
                >
                  All Expenses
                </button>
                <button
                  onClick={() => setViewMode('grouped')}
                  className={'px-3 py-1 rounded-lg text-sm font-medium ' + (
                    viewMode === 'grouped'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  )}
                >
                  Grouped by Order
                </button>
              </div>
            </div>
            
            {viewMode === 'all' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.filter(expense => expense && expense.expense_type).map((expense) => (
                      <tr key={expense.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {expense.expense_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {expense.manufacturing_orders ? (
                            <div>
                              <div className="font-medium text-gray-900">{expense.manufacturing_orders.order_number}</div>
                              <div className="text-xs text-gray-500">{expense.manufacturing_orders.product_name}</div>
                            </div>
                          ) : (
                            'Unassigned'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(expense.created_at || '').toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              console.log('Expense object:', expense);
                              console.log('Expense ID:', expense.id);
                              deleteExpense(expense.id!);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {expenses.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No expenses found. Click "Add Expense" to get started.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const groupedExpenses = expenses.reduce((groups, expense) => {
                    if (!expense || !expense.expense_type) return groups;
                    const orderId = expense.manufacturing_order_id || 'unassigned';
                    if (!groups[orderId]) {
                      groups[orderId] = [];
                    }
                    groups[orderId].push(expense);
                    return groups;
                  }, {} as Record<string, Expense[]>);

                  return Object.entries(groupedExpenses).map(([orderId, orderExpenses]) => (
                    <div key={orderId} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-900">
                          {orderId === 'unassigned' ? 'Unassigned Expenses' : (
                            <div>
                              <div>{orderExpenses[0]?.manufacturing_orders?.order_number || `Order #${orderId}`}</div>
                              <div className="text-sm text-gray-500">{orderExpenses[0]?.manufacturing_orders?.product_name}</div>
                            </div>
                          )}
                        </h4>
                        <div className="text-sm text-gray-600">
                          {orderExpenses.length} expense{orderExpenses.length === 1 ? '' : 's'} • 
                          Total: {formatCurrency(orderExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {orderExpenses.filter(expense => expense && expense.expense_type).map((expense) => (
                              <tr key={expense.id}>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                    {expense.expense_type.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{expense.description}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(expense.amount)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(expense.created_at || '').toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => {
                                      console.log('Expense object (grouped):', expense);
                                      console.log('Expense ID (grouped):', expense.id);
                                      deleteExpense(expense.id!);
                                    }}
                                    className="text-red-600 hover:text-red-900"
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
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Business Health Tab */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency((gypsumData?.totalRevenue || 0) + (woodData?.totalRevenue || 0))}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {gypsumData?.orderCount || 0} gypsum + {woodData?.orderCount || 0} wood orders
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💸</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency((gypsumData?.totalExpenses || 0) + (woodData?.totalExpenses || 0))}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {Object.keys((gypsumData?.expensesByType || {})).length + Object.keys((woodData?.expensesByType || {})).length} expense categories
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📈</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Net Profit</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency((gypsumData?.profitMargin || 0) + (woodData?.profitMargin || 0))}
                  </p>
                  <p className={'text-xs mt-1 ' + (((gypsumData?.profitMargin || 0) + (woodData?.profitMargin || 0)) >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {((gypsumData?.profitMargin || 0) + (woodData?.profitMargin || 0)) >= 0 ? 'Profitable' : 'Loss'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((gypsumData?.totalRevenue || 0) + (woodData?.totalRevenue || 0)) > 0 
                      ? `${(((gypsumData?.profitMargin || 0) + (woodData?.profitMargin || 0)) / ((gypsumData?.totalRevenue || 0) + (woodData?.totalRevenue || 0)) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Industry average: 15-25%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gypsum Work Tab */}
      {activeTab === 'gypsum' && gypsumData && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                🏗️
              </span>
              Gypsum Work Dashboard
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Orders Completed</p>
                <p className="text-2xl font-bold text-orange-600">{gypsumData.orderCount}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(gypsumData.totalRevenue)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(gypsumData.totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wood Work Tab */}
      {activeTab === 'wood' && woodData && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                🪵
              </span>
              Wood Work Dashboard
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Orders Completed</p>
                <p className="text-2xl font-bold text-amber-600">{woodData.orderCount}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(woodData.totalRevenue)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(woodData.totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  0
                </span>
                Manufacturing Product Profitability Analysis
              </h3>
            </div>
            
            {/* Profitability Overview */}
            <div className="mb-8">
              <h4 className="font-medium text-gray-900 mb-4">Manufacturing Product Profitability</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {getProfitabilityData().map((product) => (
                  <div key={product.name} className={`p-6 rounded-lg border-2 ${product.isProfitable ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-lg font-semibold text-gray-900">{product.name}</h5>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${product.isProfitable ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                        {product.isProfitable ? 'Profitable' : 'Not Profitable'}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Revenue:</span>
                        <span className="text-sm font-bold text-green-600">{formatCurrency(product.revenue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Expenses:</span>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(product.expenses)}</span>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-900">Net Profit:</span>
                          <span className={`text-lg font-bold ${product.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(product.profit)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-gray-600">Profit Margin:</span>
                          <span className={`text-sm font-medium ${product.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.revenue > 0 ? `${((product.profit / product.revenue) * 100).toFixed(1)}%` : '0%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue and Expense Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4 text-center">Revenue Distribution</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={getPieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4 text-center">Expense Distribution</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={getExpensePieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getExpensePieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Comparison */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Performance Comparison</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Gypsum Profit Margin</p>
                  <p className={'text-2xl font-bold ' + ((gypsumData?.profitMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {gypsumData?.profitPercentage.toFixed(1) || '0'}%
                  </p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-gray-600">Wood Profit Margin</p>
                  <p className={'text-2xl font-bold ' + ((woodData?.profitMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {woodData?.profitPercentage.toFixed(1) || '0'}%
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Combined Margin</p>
                  <p className={'text-2xl font-bold ' + (((gypsumData?.profitMargin || 0) + (woodData?.profitMargin || 0)) >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {((gypsumData?.totalRevenue || 0) + (woodData?.totalRevenue || 0)) > 0 
                      ? `${(((gypsumData?.profitMargin || 0) + (woodData?.profitMargin || 0)) / ((gypsumData?.totalRevenue || 0) + (woodData?.totalRevenue || 0)) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Expense</h3>
            
            <form onSubmit={handleAddExpense}>
              {/* Manufacturing Order Selection */}
              <div className="border rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">Select Manufacturing Order</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturing Order (Optional)</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                    value={selectedOrder}
                    onChange={(e) => setSelectedOrder(e.target.value)}
                  >
                    <option value="">Select a manufacturing order...</option>
                    {manufacturingOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.order_number} - {order.product_name} ({order.quantity_produced} units)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expense Form */}
              <div className="border rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">Add Expense</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
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

                  {/* Product Selection - Only show for raw materials */}
                  {expenseType === 'raw_materials' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Material</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                        value={selectedProduct}
                        onChange={(e) => handleProductChange(e.target.value)}
                      >
                        <option value="">Select a material...</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.product_name} ({product.supplier_name}) - {formatCurrency(product.unit_price || 0)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (ETB)</label>
                    {expenseType === 'raw_materials' && selectedProduct ? (
                      <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 font-medium">
                        {Number(unitCost || 0).toFixed(2)}
                      </div>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                        placeholder="0.00"
                      />
                    )}
                  </div>

                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g., 50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g., kg, bags, liters"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (ETB)</label>
                    <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                      <span className="font-medium text-gray-900">
                        {unitCost && quantity 
                          ? `${parseFloat(unitCost) || 0} × ${parseFloat(quantity) || 0} = ${formatCurrency(parseFloat(calculateTotalAmount()))}`
                          : 'Enter unit cost and quantity'
                        }
                      </span>
                    </div>
                    <input
                      type="hidden"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
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
                            <span className="text-gray-600">
                              {expense.quantity && expense.unit ? (
                                <span>{expense.quantity} {expense.unit} = {formatCurrency(parseFloat(expense.amount))}</span>
                              ) : (
                                <span className="font-medium">{formatCurrency(parseFloat(expense.amount))}</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromMultiple(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
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
                    setShowAddModal(false);
                    setMultipleExpenses([]);
                    setSelectedOrder('');
                    setDescription('');
                    setAmount('');
                    setQuantity('');
                    setUnit('');
                    setSelectedProduct('');
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
}

export default Expenses;
