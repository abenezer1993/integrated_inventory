import React, { useState, useEffect } from 'react';
import { alertFunction } from '../utils/alerts';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';
import { useConfirmation } from '../utils/confirmations';
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

  console.log('🏭 Manufacturing component rendering');
  console.log('🏭 User in Manufacturing:', user);
  console.log('🏭 hasPermission function:', hasPermission);
  
  // Check if user is loaded
  useEffect(() => {
    // Set authLoading to false immediately since we have the user context
    setAuthLoading(false);
  }, []);
  
  // Test permission check
  console.log('Testing manage_manufacturing permission:', hasPermission('manage_manufacturing'));

  const fetchManufacturedInventory = async () => {
    try {
      const { data, error } = await supabase!
        .from('inventory')
        .select('*')
        .eq('product_type', 'manufactured')
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
      console.log('=== FETCHING MANUFACTURING ORDERS ===');
      const { data, error } = await supabase!
        .rpc('get_manufacturing_orders_with_branches');

      console.log('RPC call result:', { data, error });
      
      if (error) {
        console.error('RPC Error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Fetched data:', data);
      console.log('Data length:', data?.length || 0);
      console.log('Setting manufacturing orders state...');
      
      // Transform the flat RPC result back to nested structure
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        order_number: item.order_number,
        branch_id: item.branch_id,
        product_name: item.product_name,
        quantity_produced: item.quantity_produced,
        status: item.status,
        completed_at: item.completed_at,
        notes: item.notes,
        product_category: item.product_category,
        created_at: item.created_at,
        updated_at: item.updated_at,
        branches: {
          id: item.branches_id,
          name: item.branches_name,
          location: item.branches_location
        }
      }));
      
      console.log('Transformed data:', transformedData);
      
      setManufacturingOrders(transformedData);
      console.log('State updated with new data');
      console.log('Current manufacturing orders state length:', transformedData?.length || 0);
    } catch (error) {
      console.error('Error fetching manufacturing orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory || !productName || !quantity || !selectedBranch || !selectedEmployee) {
      alertFunction('Please fill in all required fields: category, product name, quantity, branch, and employee');
      return;
    }

    try {
      // Generate order number
      const orderNumber = `MFG${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      const materialCosts = getMaterialCosts({
        category: selectedCategory,
        quantity_produced: parseInt(quantity)
      });
      
      console.log('Creating manufacturing order:', {
        orderNumber,
        branch_id: selectedBranch,
        product_name: productName,
        quantity_produced: parseInt(quantity),
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes,
        product_category: selectedCategory,
        employee_id: selectedEmployee,
        materials_used: materialCosts
      });
      
      // Create manufacturing order using RPC to bypass RLS
      console.log('Creating manufacturing order...');
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

      console.log('Order creation result:', { data: orderData, error: orderError });

      if (orderError) throw orderError;
      
      console.log('Manufacturing order created successfully:', orderData);
      console.log('Order data type:', typeof orderData);
      console.log('Order data length:', orderData?.length);

      // Create manufactured product record using RPC to bypass RLS
      console.log('Creating manufactured product record for:', productName);
      const { data: productData, error: productError } = await supabase!
        .rpc('create_manufactured_product_with_branch', {
          product_name: productName,
          product_quantity: parseInt(quantity),
          branch_id: selectedBranch
        });
      
      console.log('Manufactured product creation result:', { data: productData, error: productError });
      if (productError) throw productError;
      
      // Manufactured product is created successfully
      console.log('Manufactured product created successfully:', productData);
      const productId = productData[0]?.id; // RPC returns array
      
      // Create inventory record for manufactured product
      console.log('Creating inventory record for manufactured product');
      const { data: inventoryData, error: inventoryError } = await supabase!
        .from('inventory')
        .insert({
          manufactured_product_id: productId,
          quantity: parseInt(quantity),
          last_updated: new Date().toISOString()
        })
        .select()
        .single();
      
      console.log('Inventory record creation result:', { data: inventoryData, error: inventoryError });
      if (inventoryError) throw inventoryError;
      
      // Record stock movement
      console.log('Recording stock movement');
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
      
      console.log('Stock movement recorded:', { data: stockMovement, error: stockMovementError });
      if (stockMovementError) throw stockMovementError;

      // Reset form and refresh data
      setSelectedProduct('');
      setQuantity('');
      setNotes('');
      setSelectedCategory('');
      setProductName('');
      setSelectedBranch('');
      setShowAddForm(false);
      fetchManufacturingOrders();
      
      alertFunction('Production recorded successfully!');
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
      
      alertFunction(errorMessage);
    }
  };

  const handleViewOrder = (order: any) => {
    alertFunction(`View Order: ${order.order_number}\n\nProduct: ${order.product_name}\nQuantity: ${order.quantity_produced}\nStatus: ${order.status}\nNotes: ${order.notes || 'No notes'}`);
  };

  
  const handleEditOrder = (order: any) => {
    const newQuantity = prompt('Edit Quantity:', order.quantity_produced);
    const newNotes = prompt('Edit Notes:', order.notes || '');
    
    if (newQuantity !== null && newNotes !== null) {
      updateManufacturingOrder(order.id, parseInt(newQuantity), newNotes);
    }
  };

  const updateManufacturingOrder = async (orderId: string, newQuantity: number, newNotes: string) => {
    try {
      const { error } = await supabase!
        .from('manufacturing_orders')
        .update({
          quantity_produced: newQuantity,
          notes: newNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      alertFunction('Order updated successfully!');
      fetchManufacturingOrders();
    } catch (error: any) {
      console.error('Error updating order:', error);
      alertFunction('Error updating order. Please try again.');
    }
  };

  const handleDeleteOrder = (order: any) => {
    showConfirmation({
      title: 'Delete Manufacturing Order',
      message: `Are you sure you want to delete order ${order.order_number}? This action cannot be undone.`,
      onConfirm: () => deleteManufacturingOrder(order.id),
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
  };

  const handleTransferToInventory = async (order: any) => {
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
      
      // If product doesn't exist, create it
      if (productError || !productData) {
        console.log('Product not found, creating new manufactured product...');
        const { data: newProduct, error: createError } = await supabase!
          .rpc('create_manufactured_product_for_transfer', {
            product_name: order.product_name,
            quantity: order.quantity_produced
          });
        
        console.log('Product creation result:', { data: newProduct, error: createError });
        
        if (createError || !newProduct) {
          console.error('Error creating manufactured product:', createError);
          alertFunction('Error creating manufactured product. Please try again.');
          return;
        }
        
        productId = newProduct;
      }
      
      // Check if already transferred to inventory
      const { data: existingInventory, error: inventoryCheckError } = await supabase!
        .from('inventory')
        .select('id')
        .eq('manufactured_product_id', productId)
        .single();
      
      if (existingInventory && !inventoryCheckError) {
        alertFunction('This product has already been transferred to inventory.');
        return;
      }
      
      // Call the transfer function with the correct UUID
      const { data, error } = await supabase!
        .rpc('transfer_manufactured_to_inventory', {
          p_manufactured_product_id: productId,
          p_quantity: order.quantity_produced,
          p_transfer_notes: `Transfer from manufacturing order ${order.order_number}`
        });

      console.log('Transfer result:', { data, error });

      if (error) {
        console.error('Error transferring to inventory:', error);
        alertFunction('Error transferring to inventory. Please try again.');
        return;
      }

      if (data) {
        alertFunction('Product transferred to inventory successfully!');
        fetchManufacturingOrders();
      }
    } catch (error: any) {
      console.error('Error in handleTransferToInventory:', error);
      alertFunction('Error transferring to inventory. Please try again.');
    }
  };

  const deleteManufacturingOrder = async (orderId: string) => {
    try {
      console.log('=== STARTING DELETE ===');
      console.log('Attempting to delete manufacturing order:', orderId);
      
      // First get the manufacturing order to find the product name
      console.log('Step 1: Fetching order data...');
      const { data: orderData, error: fetchError } = await supabase!
        .from('manufacturing_orders')
        .select('product_name')
        .eq('id', orderId)
        .single();
      
      console.log('Order data result:', { data: orderData, error: fetchError });
      
      if (fetchError) {
        console.error('Error fetching order data:', fetchError);
        throw fetchError;
      }
      
      // Delete related stock movements
      console.log('Step 2: Deleting stock movements...');
      const { error: stockError } = await supabase!
        .from('stock_movements')
        .delete()
        .eq('reference_id', orderId)
        .eq('reference_type', 'manufacturing_order');
      
      console.log('Stock movement delete result:', { error: stockError });
      
      if (stockError) {
        console.error('Error deleting stock movements:', stockError);
      }
      
      // Delete the manufactured product (find by name)
      if (orderData?.product_name) {
        console.log('Step 3: Deleting manufactured product:', orderData.product_name);
        
        // First get the manufactured product ID to delete inventory records
        const { data: productData, error: productFetchError } = await supabase!
          .from('manufactured_products')
          .select('id')
          .eq('name', orderData.product_name)
          .single();
        
        if (productFetchError) {
          console.error('Error fetching product ID:', productFetchError);
        } else if (productData?.id) {
          // Delete inventory records for this manufactured product
          console.log('Step 3.1: Deleting inventory records for product:', productData.id);
          const { error: inventoryError } = await supabase!
            .from('inventory')
            .delete()
            .eq('manufactured_product_id', productData.id);
          
          console.log('Inventory delete result:', { error: inventoryError });
          
          if (inventoryError) {
            console.error('Error deleting inventory records:', inventoryError);
          }
        }
        
        // Now delete the manufactured product
        const { error: productError } = await supabase!
          .from('manufactured_products')
          .delete()
          .eq('name', orderData.product_name);
        
        console.log('Product delete result:', { error: productError });
      }
      
      // Then delete manufacturing order using RPC
      console.log('Step 4: Deleting manufacturing order via RPC...');
      const { data, error } = await supabase!
        .rpc('delete_manufacturing_order', { 
          order_id: orderId 
        });

      console.log('RPC delete result:', { data, error });

      if (error) {
        console.error('Error deleting manufacturing order via RPC:', error);
        throw error;
      }
      
      if (!data) {
        console.error('RPC delete returned false - permission denied');
        throw new Error('Permission denied: Only admin users can delete manufacturing orders');
      }
      
      console.log('=== DELETE COMPLETED ===');
      console.log('Manufacturing order and related data deleted successfully');
      alertFunction('Order deleted successfully!');
      
      console.log('Step 5: Refreshing data...');
      await fetchManufacturingOrders();
      
    } catch (error: any) {
      console.error('Error in deleteManufacturingOrder:', error);
      alertFunction(`Error deleting order: ${error.message || 'Unknown error'}. Please try again.`);
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
          <a
            href="/expenses"
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg inline-block"
          >
            Track Expenses
          </a>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {manufacturingOrders.map((order) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                        title="View Order"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditOrder(order)}
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
              ))}
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
            {/* Employee Performance Overview */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Performance Overview</h3>
              <div className="space-y-4">
                {employees.map((employee) => {
                  const salary = calculateWeeklySalary(employee.id);
                  return (
                    <div key={employee.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{employee.full_name}</h4>
                          <p className="text-sm text-gray-500">{employee.position}</p>
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          {employee.department}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Products This Week</p>
                          <p className="font-bold text-lg">{salary.totalProducts}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Daily Average</p>
                          <p className="font-bold text-lg">{salary.dailyAverage.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Daily Salary</p>
                          <p className="font-bold text-green-600">ETB {salary.dailySalary.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Weekly Salary</p>
                          <p className="font-bold text-green-600">ETB {salary.weeklySalary.toFixed(0)}</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
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
                  Employee <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
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
    </div>
  );
};

export default Manufacturing;
