import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';
import { useConfirmation } from '../utils/confirmations';
import { Link } from 'react-router-dom';
import EditOrderModal from '../components/EditOrderModal';
import ViewOrderModal from '../components/ViewOrderModal';
import { Product, ManufacturingOrder, ManufacturingExpense } from '../types';

const Manufacturing: React.FC = () => {
  const { supabase } = useSupabase();
  const { user, hasPermission } = useAuth();
  const { showConfirmation } = useConfirmation();
  const [manufacturingOrders, setManufacturingOrders] = useState<ManufacturingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productName, setProductName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [manufacturedInventory, setManufacturedInventory] = useState<any[]>([]);
  const [selectedInventoryCategory, setSelectedInventoryCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'history' | 'employee_performance'>('overview');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [materialsUsed, setMaterialsUsed] = useState<{ [key: string]: number }>({});
  const [measurementType, setMeasurementType] = useState<string>('piece');
  const [unitPrice, setUnitPrice] = useState<string>('');
  
  // Modal states
  const [viewOrderModal, setViewOrderModal] = useState<{ isOpen: boolean; order: any }>({ isOpen: false, order: null });
  const [editOrderModal, setEditOrderModal] = useState<{ isOpen: boolean; order: any }>({ isOpen: false, order: null });

    
  // Check if user is loaded
  useEffect(() => {
    // Set authLoading to false immediately since we have the user context
    setAuthLoading(false);
  }, []);
  
  
  const fetchManufacturedInventory = async () => {
    try {
      const { data, error } = await supabase!
        .from('inventory')
        .select('*')
        .not('manufactured_product_id', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setManufacturedInventory(data || []);
    } catch (error: any) {
      console.error('Error fetching manufactured inventory:', error);
    }
  };

  // Helper functions for category filtering
  const getUniqueCategories = () => {
    const categorySet = new Set(manufacturedInventory.map(item => item.category).filter(Boolean));
    return Array.from(categorySet);
  };

  const getFilteredInventory = () => {
    if (selectedInventoryCategory === 'all') {
      return manufacturedInventory;
    }
    return manufacturedInventory.filter(item => item.category === selectedInventoryCategory);
  };

  const getCategoryCount = (category: string) => {
    if (category === 'all') {
      return manufacturedInventory.length;
    }
    return manufacturedInventory.filter(item => item.category === category).length;
  };

  // Payment calculation functions
  const calculateEmployeePayments = (employeeId: string) => {
    const employeeOrders = manufacturingOrders.filter(order => order.employee_id === employeeId);

    // Calculate total payments from manufacturing records
    const totalPayments = employeeOrders.reduce((sum, order) => {
      // Extract payment info from order notes or calculate from quantity and unit price
      const quantity = order.quantity_produced || 0;
      // For now, assume unit price is stored in notes or calculate default
      const unitPrice = 500; // Default fallback - should be stored with order
      return sum + (quantity * unitPrice);
    }, 0);

    // Group by measurement type
    const paymentsByType = {
      piece: 0,
      m2: 0,
      day: 0
    };

    employeeOrders.forEach(order => {
      const quantity = order.quantity_produced || 0;
      const unitPrice = 500; // Default fallback
      const measurementType = 'piece'; // Default - should be stored with order
      paymentsByType[measurementType as keyof typeof paymentsByType] += quantity * unitPrice;
    });

    // Recent payments (last 10)
    const recentPayments = employeeOrders
      .slice(0, 10)
      .map(order => ({
        date: new Date(order.created_at).toLocaleDateString(),
        product: order.product_name || 'Unknown',
        quantity: order.quantity_produced || 0,
        measurement: 'piece', // Should be stored with order
        unitPrice: 500, // Should be stored with order
        totalPayment: (order.quantity_produced || 0) * 500
      }));

    return {
      totalPayments,
      paymentsByType,
      recentPayments,
      totalOrders: employeeOrders.length
    };
  };

  // Salary calculation functions
  const calculateWeeklySalary = (employeeId: string) => {
    const employeeOrders = manufacturingOrders.filter(order => order.employee_id === employeeId);
    const totalProducts = employeeOrders.reduce((sum, order) => sum + order.quantity_produced, 0);
    const daysWorked = 7; // Weekly period
    const dailyAverage = totalProducts / daysWorked;

    // Base salary calculation (customize rates as needed)
    const gypsumRate = 50; // ETB per gypsum product
    const woodRate = 75; // ETB per wood product

    const totalEarnings = employeeOrders.reduce((sum, order) => {
      if (order.product_category === 'gypsum') {
        return sum + (order.quantity_produced * gypsumRate);
      } else if (order.product_category === 'wood') {
        return sum + (order.quantity_produced * woodRate);
      }
      return sum;
    }, 0);
    
    return {
      totalProducts,
      dailyAverage,
      weeklySalary: totalEarnings,
      dailySalary: totalEarnings / daysWorked
    };
  };

  const getMaterialCosts = (order: any) => {
    // Material costs per unit (customize as needed)
    const gypsumMaterials = {
      'gypsum_powder': 15, // ETB per packet
      'additives': 5, // ETB per unit
      'packaging': 2 // ETB per unit
    };
    
    const woodMaterials = {
      'wood_planks': 120, // ETB per plank
      'screws': 3, // ETB per kg
      'finishing': 10 // ETB per unit
    };
    
    if (order.category === 'gypsum') {
      return {
        gypsum_powder: order.quantity_produced * gypsumMaterials.gypsum_powder,
        additives: order.quantity_produced * gypsumMaterials.additives,
        packaging: order.quantity_produced * gypsumMaterials.packaging,
        total: order.quantity_produced * (gypsumMaterials.gypsum_powder + gypsumMaterials.additives + gypsumMaterials.packaging)
      };
    } else if (order.category === 'wood') {
      return {
        wood_planks: order.quantity_produced * woodMaterials.wood_planks,
        screws: order.quantity_produced * woodMaterials.screws,
        finishing: order.quantity_produced * woodMaterials.finishing,
        total: order.quantity_produced * (woodMaterials.wood_planks + woodMaterials.screws + woodMaterials.finishing)
      };
    }
    
    return { total: 0 };
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase!
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .order('full_name');
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
    }
  };

  
  useEffect(() => {
    if (!authLoading) {
      fetchManufacturingOrders();
      fetchBranches();
      fetchManufacturedInventory();
      fetchEmployees();
    }
  }, [authLoading]);

  const fetchBranches = async () => {
    try {
      const { data } = await supabase!
        .from('branches')
        .select('id, name, location')
        .eq('is_active', true);
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchManufacturingOrders = async () => {
    try {
      console.log('fetchManufacturingOrders called - refreshing data...');
      setLoading(true);
      
      // Simple query without complex joins
      const { data, error } = await supabase!
        .from('manufacturing_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('Raw orders data:', data);
      
      if (error) {
        console.error('Query Error:', error);
        setManufacturingOrders([]);
        return;
      }
      
      // Get employee and branch information separately (optimized)
      const ordersWithDetails = await Promise.all(
        (data || []).map(async (order: any) => {
          const [employeeResult, branchResult] = await Promise.all([
            order.employee_id ? supabase!
              .from('employees')
              .select('id, full_name, position')
              .eq('id', order.employee_id)
              .single() : Promise.resolve({ data: null, error: null }),
            order.branch_id ? supabase!
              .from('branches')
              .select('id, name, location')
              .eq('id', order.branch_id)
              .single() : Promise.resolve({ data: null, error: null })
          ]);
          
          return {
            ...order,
            employee: employeeResult.data,
            branches: branchResult.data
          };
        })
      );
      
      console.log('Orders with details:', ordersWithDetails);
      console.log('Setting manufacturing orders state with', ordersWithDetails.length, 'items');
      setManufacturingOrders(ordersWithDetails);
    } catch (error) {
      console.error('Error fetching manufacturing orders:', error);
      setManufacturingOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory || !productName || !quantity || !selectedBranch) {
      console.error('Please fill in all required fields: category, product name, quantity, and branch');
      return;
    }

    try {
      // Generate order number
      const orderNumber = `MFG${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      const materialCosts = getMaterialCosts({
        category: selectedCategory,
        quantity_produced: parseInt(quantity)
      });
      
      
      // Create manufacturing order using RPC to bypass RLS
      const { data: orderData, error: orderError } = await supabase!
        .rpc('create_manufacturing_order_with_branch', {
          order_number_param: orderNumber,
          branch_id_param: selectedBranch,
          product_name_param: productName,
          quantity_produced_param: parseInt(quantity),
          status_param: 'completed',
          completed_at_param: new Date().toISOString(),
          notes_param: notes,
          product_category_param: selectedCategory
        });


      if (orderError) throw orderError;
      

      // Update the order with employee information
      const orderId = orderData?.[0]?.id; // RPC returns array, get first item's id
      
      if (selectedEmployee && orderId) {
        const { error: updateError, data: updateData } = await supabase!
          .from('manufacturing_orders')
          .update({ employee_id: selectedEmployee })
          .eq('id', orderId)
          .select()
          .single();
          
          
        if (updateError) {
          console.error('Error updating order with employee:', updateError);
        } else {
        }
      } else {
      }

      // Create manufactured product record using RPC to bypass RLS
      const { data: productData, error: productError } = await supabase!
        .rpc('create_manufactured_product_with_branch', {
          product_name: productName,
          product_quantity: parseInt(quantity),
          branch_id: selectedBranch
        });
      
      if (productError) throw productError;
      
      // Manufactured product is created successfully
      const productId = productData?.[0]?.id; // RPC returns array
      
      // Create inventory record for manufactured product
      const { data: inventoryData, error: inventoryError } = await supabase!
        .from('inventory')
        .insert({
          manufactured_product_id: productId,
          quantity: parseInt(quantity),
          last_updated: new Date().toISOString()
        })
        .select()
        .single();
      
      if (inventoryError) throw inventoryError;
      
      // Record stock movement
      const { data: stockMovement, error: stockMovementError } = await supabase!
        .from('stock_movements')
        .insert({
          movement_number: `MV${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          type: 'manufacturing',
          manufactured_product_id: productId,
          quantity: parseInt(quantity),
          reference_id: orderData.id,
          reference_type: 'manufacturing_order',
          notes: `Production: ${notes || 'Manufactured product created'}`
        })
        .select()
        .single();
      
      if (stockMovementError) throw stockMovementError;

      // Reset form and refresh data
      setSelectedProduct('');
      setQuantity('');
      setNotes('');
      setSelectedCategory('');
      setProductName('');
      setSelectedBranch('');
      setSelectedEmployee('');
      setMeasurementType('piece');
      setUnitPrice('');
      setShowAddForm(false);
      fetchManufacturingOrders();
      
    } catch (error: any) {
      console.error('Error recording production:', error);
      
      // Show detailed error information
      let errorMessage = 'Error recording production. Please try again.';
      
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
      
      console.error('Error:', errorMessage);
    }
  };

  const handleViewOrder = (order: any) => {
    console.log('handleViewOrder called with order:', order);
    setViewOrderModal({ isOpen: true, order });
  };

  
  const handleEditOrder = (order: any) => {
    console.log('handleEditOrder called with order:', order);
    setEditOrderModal({ isOpen: true, order });
  };

  const handleSaveOrder = (orderId: string, quantity: number, notes: string) => {
    updateManufacturingOrder(orderId, quantity, notes);
  };

  const updateManufacturingOrder = async (orderId: string, newQuantity: number, newNotes: string) => {
    try {
      console.log('Updating manufacturing order:', { orderId, newQuantity, newNotes });
      
      const { error } = await supabase!
        .from('manufacturing_orders')
        .update({
          quantity_produced: newQuantity,
          notes: newNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      
      console.log('Order updated successfully');
      console.log(`Order updated successfully!\n\nNew Quantity: ${newQuantity} units\nNotes: ${newNotes || 'None'}`);
      fetchManufacturingOrders();
    } catch (error: any) {
      console.error('Error updating order:', error);
    }
  };

  const handleDeleteOrder = (order: any) => {
    console.log('handleDeleteOrder called with order:', order);
    console.log('Order ID:', order.id);
    console.log('showConfirmation function:', showConfirmation);
    
    showConfirmation({
      title: 'Delete Manufacturing Order',
      message: `Are you sure you want to delete order ${order.order_number}? This action cannot be undone.`,
      onConfirm: () => {
        console.log('Delete confirmed for order ID:', order.id);
        deleteManufacturingOrder(order.id);
      },
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
  };

  const handleTransferToInventory = (order: any) => {
    showConfirmation({
      title: 'Transfer to Inventory',
      message: `Transfer ${order.quantity_produced} units of "${order.product_name}" to inventory?\n\nThis will add the product to your inventory stock.`,
      onConfirm: () => performTransfer(order),
      type: 'info',
      confirmText: 'Transfer',
      cancelText: 'Cancel'
    });
  };

  const performTransfer = async (order: any) => {
    try {
      console.log('Transferring to inventory:', order);
      
      // First find the manufactured product by name
      const { data: productData, error: productError } = await supabase!
        .from('manufactured_products')
        .select('id')
        .eq('name', order.product_name)
        .single();
      
      console.log('Product lookup result:', { data: productData, error: productError });
      
      let productId = productData?.id;
      if (!productId) {
        // Create the manufactured product if it doesn't exist
        const { data: newProduct, error: createError } = await supabase!
          .from('manufactured_products')
          .insert({
            name: order.product_name,
            category: order.product_category || 'uncategorized'
          })
          .select()
          .single();
        
        if (createError) throw createError;
        productId = newProduct.id;
      }
      
      // Create inventory record
      const { data: inventoryData, error: inventoryError } = await supabase!
        .from('inventory')
        .insert({
          manufactured_product_id: productId,
          quantity: order.quantity_produced,
          last_updated: new Date().toISOString()
        })
        .select()
        .single();
      
      console.log('Inventory creation result:', { data: inventoryData, error: inventoryError });
      
      if (inventoryError) throw inventoryError;
      
      console.log(`Successfully transferred ${order.quantity_produced} units of "${order.product_name}" to inventory!`);
      fetchManufacturingOrders();
    } catch (error: any) {
      console.error('Error in performTransfer:', error);
      console.error(`Error transferring to inventory: ${error.message || 'Unknown error'}. Please try again.`);
    }
  };

  const deleteManufacturingOrder = async (orderId: string) => {
    try {
      console.log('deleteManufacturingOrder called with orderId:', orderId);
      
      // First, let's try the simple direct delete again but with detailed error checking
      console.log('Testing direct delete with detailed error checking...');
      const { error: directError } = await supabase!
        .from('manufacturing_orders')
        .delete()
        .eq('id', orderId);

      console.log('Direct delete error details:', {
        error: directError,
        message: directError?.message,
        details: directError?.details,
        hint: directError?.hint,
        code: directError?.code
      });

      if (!directError) {
        console.log('Direct delete succeeded, but record still exists - this is very unusual!');
      }

      // Now try RPC function as backup
      console.log('Trying RPC function as backup...');
      const { data, error } = await supabase!
        .rpc('delete_manufacturing_order_with_related', {
          order_id_param: orderId
        });

      console.log('RPC delete result:', { data, error });

      if (error) {
        console.error('RPC delete error:', error);
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          console.log('RPC function not created yet - you need to run the SQL file first!');
        }
      }

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          console.log('Order deleted successfully via RPC:', result.message);
          // Refresh data
          fetchManufacturingOrders();
        } else {
          console.error('RPC delete failed:', result.message);
        }
      } else {
        console.error('RPC delete returned no data');
      }
      
    } catch (error: any) {
      console.error('Error deleting order:', error);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p>Please log in to access the manufacturing module.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Management</h1>
          <p className="text-gray-600">Record production of company-manufactured products</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Record New Production
          </button>
          <Link
            to="/app/expenses"
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg inline-block"
          >
            Track Expenses
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '0' },
            { id: 'inventory', label: 'Manufactured Inventory', icon: '0' },
            { id: 'history', label: 'Production History', icon: '0' },
            { id: 'employee_performance', label: 'Employee Performance', icon: '👤' }
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
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">0</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today's Production</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {manufacturingOrders
                      .filter(order => new Date(order.created_at).toDateString() === new Date().toDateString())
                      .reduce((sum, order) => sum + order.quantity_produced, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">0</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Production Records</p>
                  <p className="text-2xl font-bold text-gray-900">{manufacturingOrders.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">0</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {manufacturingOrders
                      .filter(order => new Date(order.created_at).getMonth() === new Date().getMonth())
                      .reduce((sum, order) => sum + order.quantity_produced, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Manufactured Products Inventory */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Manufactured Products Inventory</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Total Items:</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
              {manufacturedInventory.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {manufacturedInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <span className="text-3xl mb-2">0</span>
                      <span>No manufactured products in inventory</span>
                      <span className="text-sm text-gray-400 mt-1">Products will appear here after production is recorded</span>
                    </div>
                  </td>
                </tr>
              ) : (
                manufacturedInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500">{item.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.quantity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ETB {item.unit_cost?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ETB {((item.quantity || 0) * (item.unit_cost || 0)).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.branch_name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.quantity > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Production History */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Production History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 border-l border-gray-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {manufacturingOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-3xl mb-2"></span>
                      <span className="text-lg font-medium text-gray-900">No production history found</span>
                      <span className="text-sm text-gray-500 mt-1">
                        Start manufacturing products to see them appear here
                      </span>
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                      >
                        Record Production
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                manufacturingOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <p className="font-medium">{order.product_name || 'Unknown Product'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Manufactured
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {order.product_category === 'gypsum' ? 'Gypsum Work' : order.product_category === 'wood' ? 'Wood Work' : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.branches?.name || 'Unknown Branch'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.employee?.full_name || order.employee_name || 'Not Assigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.quantity_produced} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : order.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 sticky right-0 bg-white border-l border-gray-200">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            console.log('View button clicked for order:', order);
                            handleViewOrder(order);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                          title="View Order"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            console.log('Edit button clicked for order:', order);
                            handleEditOrder(order);
                          }}
                          className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded"
                          title="Edit Order"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleTransferToInventory(order)}
                          className="text-orange-600 hover:text-orange-900 p-1 hover:bg-orange-50 rounded"
                          title="Transfer to Inventory"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order)}
                          className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                          title="Delete Order"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      )}

      {/* Employee Performance Tab */}
      {activeTab === 'employee_performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Employee Payment Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Payment Summary</h3>
              <div className="space-y-4">
                {employees.map((employee) => {
                  const payments = calculateEmployeePayments(employee.id);
                  return (
                    <div key={employee.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{employee.full_name}</h4>
                          <p className="text-sm text-gray-500">{employee.position}</p>
                        </div>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          {payments.totalOrders} Orders
                        </span>
                      </div>
                      
                      {/* Total Earnings */}
                      <div className="bg-green-50 p-3 rounded-lg mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total Earnings:</span>
                          <span className="text-lg font-bold text-green-600">ETB {payments.totalPayments.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      {/* Payment Breakdown */}
                      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <p className="text-gray-600">Piece Work</p>
                          <p className="font-bold text-blue-600">ETB {payments.paymentsByType.piece.toFixed(0)}</p>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <p className="text-gray-600">m² Work</p>
                          <p className="font-bold text-purple-600">ETB {payments.paymentsByType.m2.toFixed(0)}</p>
                        </div>
                        <div className="text-center p-2 bg-orange-50 rounded">
                          <p className="text-gray-600">Daily Work</p>
                          <p className="font-bold text-orange-600">ETB {payments.paymentsByType.day.toFixed(0)}</p>
                        </div>
                      </div>
                      
                      {/* Recent Payments */}
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">Recent Payments:</p>
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {payments.recentPayments.slice(0, 3).map((payment, index) => (
                            <div key={index} className="flex justify-between text-xs bg-gray-50 p-1 rounded">
                              <span>{payment.date} - {payment.product}</span>
                              <span className="font-medium">ETB {payment.totalPayment.toFixed(0)}</span>
                            </div>
                          ))}
                          {payments.recentPayments.length === 0 && (
                            <p className="text-xs text-gray-500 italic">No payments yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Material Usage Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Usage Summary</h3>
              <div className="space-y-4">
                {['gypsum', 'wood'].map((category) => {
                  const categoryOrders = manufacturingOrders.filter(order => order.product_category === category);
                  const totalProducts = categoryOrders.reduce((sum, order) => sum + order.quantity_produced, 0);
                  const totalMaterialCosts = categoryOrders.reduce((sum, order) => {
                    const costs = getMaterialCosts(order);
                    return sum + (costs.total || 0);
                  }, 0);
                  
                  return (
                    <div key={category} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 capitalize mb-3">{category} Work</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Products:</span>
                          <span className="font-bold">{totalProducts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Material Costs:</span>
                          <span className="font-bold text-red-600">ETB {totalMaterialCosts.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cost per Product:</span>
                          <span className="font-bold">
                            ETB {totalProducts > 0 ? (totalMaterialCosts / totalProducts).toFixed(0) : '0'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed Performance Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Production Records</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Material Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Earnings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {manufacturingOrders
                    .filter(order => order.employee_id)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 20)
                    .map((order) => {
                      const employee = employees.find(emp => emp.id === order.employee_id);
                      const materialCosts = getMaterialCosts(order);
                      const gypsumRate = 50;
                      const woodRate = 75;
                      const earnings = order.product_category === 'gypsum' 
                        ? order.quantity_produced * gypsumRate 
                        : order.product_category === 'wood' 
                        ? order.quantity_produced * woodRate 
                        : 0;
                      
                      return (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {employee?.full_name || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.product_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {order.product_category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.quantity_produced}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            ETB {(materialCosts.total || 0).toFixed(0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            ETB {earnings.toFixed(0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Production Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-2">Record New Production</h3>
            <p className="text-sm text-gray-600 mb-4">Record production of company-manufactured products</p>
            <form onSubmit={handleAddProduction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select category</option>
                  <option value="gypsum">Gypsum Work</option>
                  <option value="wood">Wood Work</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select branch</option>
                  {branches.map((branch: any) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select employee</option>
                  {employees.map((employee: any) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name} - {employee.position}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Produced
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter quantity"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Measurement Type
                </label>
                <select
                  value={measurementType || 'piece'}
                  onChange={(e) => setMeasurementType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="piece">Piece</option>
                  <option value="m2">Square Meter (m²)</option>
                  <option value="day">Day</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price (ETB)
                </label>
                <input
                  type="number"
                  value={unitPrice || ''}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter price per unit"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Payment Calculation Display */}
              {quantity && unitPrice && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">Employee Payment Calculation</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <span className="ml-2 font-medium">{quantity} {measurementType || 'piece'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Unit Price:</span>
                      <span className="ml-2 font-medium">ETB {parseFloat(unitPrice).toFixed(2)}</span>
                    </div>
                    <div className="col-span-2 border-t pt-1 mt-1">
                      <span className="text-gray-600 font-semibold">Total Payment:</span>
                      <span className="ml-2 font-bold text-green-600">
                        ETB {(parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Production notes..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Record Production
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Professional Modals */}
      <ViewOrderModal
        isOpen={viewOrderModal.isOpen}
        order={viewOrderModal.order}
        onClose={() => setViewOrderModal({ isOpen: false, order: null })}
      />
      
      <EditOrderModal
        isOpen={editOrderModal.isOpen}
        order={editOrderModal.order}
        onClose={() => setEditOrderModal({ isOpen: false, order: null })}
        onSave={handleSaveOrder}
      />
    </div>
  );
};

export default Manufacturing;
