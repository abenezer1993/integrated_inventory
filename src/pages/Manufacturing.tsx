import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { showAlert } from '../utils/simpleDialogs';
import { useAuth } from '../contexts/AuthContext-debug';
import { useConfirmation } from '../utils/confirmations';
import { Link } from 'react-router-dom';
import EditOrderModal from '../components/EditOrderModal';
import ViewOrderModal from '../components/ViewOrderModal';
import { Product, ManufacturingOrder, ManufacturingExpense } from '../types';

const Manufacturing: React.FC = () => {
  const { supabase, supabaseAdmin } = useSupabase();
  const { user, hasPermission } = useAuth();
  const { showConfirmation } = useConfirmation();
  const [manufacturingOrders, setManufacturingOrders] = useState<ManufacturingOrder[]>([]);
  const [manufacturingTransfers, setManufacturingTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productName, setProductName] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [transferModal, setTransferModal] = useState<{ isOpen: boolean; order: any | null }>({ isOpen: false, order: null });
  const [transferDestinationBranchId, setTransferDestinationBranchId] = useState<string>('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [materialsUsed, setMaterialsUsed] = useState<{ [key: string]: number }>({});
  const [measurementType, setMeasurementType] = useState<string>('piece');
  const [activeTab, setActiveTab] = useState('history');
    
  // Modal states
  const [viewOrderModal, setViewOrderModal] = useState<{ isOpen: boolean; order: any }>({ isOpen: false, order: null });
  const [editOrderModal, setEditOrderModal] = useState<{ isOpen: boolean; order: any }>({ isOpen: false, order: null });
  const [assignEmployeeModal, setAssignEmployeeModal] = useState<{ isOpen: boolean; order: any }>({ isOpen: false, order: null });
  const [assignmentEmployees, setAssignmentEmployees] = useState<string[]>([]);
  const [employeeEarnings, setEmployeeEarnings] = useState<{ [key: string]: string }>({});
  const [employeePayments, setEmployeePayments] = useState<{ [key: string]: { measurementType: string; quantity: string; unitPrice: string; totalPayment: number } }>({});

    
  // Check if user is loaded
  useEffect(() => {
    // Set authLoading to false immediately since we have the user context
    setAuthLoading(false);
  }, []);

  // Payment calculation function
  const calculateEmployeePayment = (employeeId: string) => {
    const payment = employeePayments[employeeId];
    if (!payment) return 0;
    
    const quantity = parseFloat(payment.quantity) || 0;
    const unitPrice = parseFloat(payment.unitPrice) || 0;
    
    return quantity * unitPrice;
  };

  // Update payment when measurement type, quantity, or unit price changes
  const updateEmployeePayment = (employeeId: string, field: 'measurementType' | 'quantity' | 'unitPrice', value: string) => {
    const currentPayment = employeePayments[employeeId] || {
      measurementType: 'piece',
      quantity: '0',
      unitPrice: '0',
      totalPayment: 0
    };

    const updatedPayment = {
      ...currentPayment,
      [field]: value
    };

    // Calculate total payment
    const quantity = parseFloat(updatedPayment.quantity) || 0;
    const unitPrice = parseFloat(updatedPayment.unitPrice) || 0;
    updatedPayment.totalPayment = quantity * unitPrice;

    setEmployeePayments({
      ...employeePayments,
      [employeeId]: updatedPayment
    });

    // Also update the earnings field for compatibility
    setEmployeeEarnings({
      ...employeeEarnings,
      [employeeId]: updatedPayment.totalPayment.toString()
    });
  };
  
  
  
  // Payment calculation functions
  const calculateEmployeePayments = (employeeId: string) => {
    const employeeOrders = manufacturingOrders.filter(order => order.employee_id === employeeId);
    
    // Also find orders where this employee is mentioned in payment notes
    const ordersWithEmployeeInNotes = manufacturingOrders.filter(order => {
      if (!order.notes) return false;
      return order.notes.includes('EMPLOYEE_PAYMENTS:') && 
             order.notes.includes(`"employee_id":"${employeeId}"`);
    });

    // Combine both sets of orders
    const allRelevantOrders = [...employeeOrders, ...ordersWithEmployeeInNotes];

    // Calculate total payments from manufacturing records and payment notes
    let totalPayments = 0;
    const paymentsByType = {
      piece: 0,
      m2: 0,
      day: 0,
      month: 0
    };
    const recentPayments: any[] = [];

    allRelevantOrders.forEach(order => {
      // Check if payment details are stored in notes
      if (order.notes && order.notes.includes('EMPLOYEE_PAYMENTS:')) {
        try {
          const paymentDataMatch = order.notes.match(/EMPLOYEE_PAYMENTS:(\[.*?\])/);
          if (paymentDataMatch) {
            const paymentData = JSON.parse(paymentDataMatch[1]);
            const employeePayment = paymentData.find((p: any) => p.employee_id === employeeId);
            
            if (employeePayment) {
              const payment = parseFloat(employeePayment.total_payment) || 0;
              totalPayments += payment;
              
              const measurementType = employeePayment.measurement_type || 'piece';
              if (measurementType in paymentsByType) {
                paymentsByType[measurementType as keyof typeof paymentsByType] += payment;
              }
              
              recentPayments.push({
                date: new Date(order.created_at).toLocaleDateString(),
                product: order.product_name || 'Unknown',
                quantity: parseFloat(employeePayment.quantity) || 0,
                measurement: measurementType,
                unitPrice: parseFloat(employeePayment.unit_price) || 0,
                totalPayment: payment
              });
            }
          }
        } catch (error) {
          console.error('Error parsing payment notes:', error);
        }
      } else {
        // Fallback to old calculation method
        const quantity = order.quantity_produced || 0;
        const unitPrice = 500; // Default fallback
        const payment = quantity * unitPrice;
        totalPayments += payment;
        paymentsByType.piece += payment;
        
        recentPayments.push({
          date: new Date(order.created_at).toLocaleDateString(),
          product: order.product_name || 'Unknown',
          quantity: quantity,
          measurement: 'piece',
          unitPrice: unitPrice,
          totalPayment: payment
        });
      }
    });

    // Sort recent payments by date and limit to 10
    recentPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      totalPayments,
      paymentsByType,
      recentPayments: recentPayments.slice(0, 10),
      totalOrders: allRelevantOrders.length
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
      fetchEmployees();
      fetchManufacturingTransfers();
    }
  }, [authLoading]);

  const fetchManufacturingTransfers = async () => {
    try {
      const { data, error } = await supabase!
        .from('stock_movements')
        .select('id, quantity, to_branch_id, reference_id, created_at, type')
        .eq('type', 'manufacturing')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setManufacturingTransfers(data || []);
    } catch (error) {
      console.error('Error fetching manufacturing transfers:', error);
      setManufacturingTransfers([]);
    }
  };

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
        if (error.message?.includes('Failed to fetch')) {
          console.error('Network connection issue detected');
          showAlert('Connection Error', 'Network connection issue. Please check your internet connection and try again.', 'error');
        }
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
    
    if (!selectedCategory || !productName || !quantity) {
      console.error('Please fill in all required fields: category, product name, and quantity');
      return;
    }

    try {
      const branchIdParam = user?.branch_id ?? null;

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
          branch_id_param: branchIdParam,
          product_name_param: productName,
          quantity_produced_param: parseInt(quantity),
          status_param: 'completed',
          completed_at_param: new Date().toISOString(),
          notes_param: notes,
          product_category_param: selectedCategory
        });


      if (orderError) throw orderError;
      

      
      // Create manufactured product record using RPC to bypass RLS
      const { data: productData, error: productError } = await supabase!
        .rpc('create_manufactured_product_with_branch', {
          product_name: productName,
          product_quantity: parseInt(quantity),
          branch_id: branchIdParam
        });
      
      if (productError) throw productError;
      
      // Manufactured product is created successfully
      const productId = productData?.[0]?.id; // RPC returns array
      
      // Update the manufacturing order with the finished_product_id
      if (productId && orderData?.[0]?.id) {
        console.log('Updating manufacturing order with finished_product_id:', productId);
        const { error: updateError } = await supabase!
          .from('manufacturing_orders')
          .update({
            finished_product_id: productId
          })
          .eq('id', orderData[0].id);
        
        if (updateError) {
          console.error('Error updating manufacturing order with finished_product_id:', updateError);
          // Don't throw - production was created, just the link failed
        } else {
          console.log('✅ Manufacturing order updated with finished_product_id successfully');
        }
      }
      
      // Production completed successfully - inventory will be created via transfer
      console.log('✅ Production completed successfully!');
      console.log('Showing success notification...');
      showAlert('Success', '✅ Production recorded successfully! Use Transfer to Inventory to add to main inventory.', 'success');
      console.log('Success notification sent');

      // Reset form and refresh data
      setSelectedProduct('');
      setQuantity('');
      setNotes('');
      setSelectedCategory('');
      setProductName('');
      setSelectedEmployee('');
      setMeasurementType('piece');
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

  const handleSaveEmployeeAssignment = async () => {
    try {
      const orderId = assignEmployeeModal.order?.id;
      
      if (!orderId) return;

      console.log('🔍 Saving employee assignment:', {
        orderId,
        employees: assignmentEmployees,
        payments: employeePayments,
        currentOrder: assignEmployeeModal.order
      });

      // Assign the first employee to the order and store all payment details in notes
      const employeeId = assignmentEmployees[0];
      
      // Create payment details string to store in notes
      const employeePaymentDetails = assignmentEmployees.map(empId => {
        const employee = employees.find(emp => emp.id === empId);
        const payment = employeePayments[empId];
        return {
          employee_id: empId,
          employee_name: employee?.full_name || 'Unknown',
          measurement_type: payment?.measurementType || 'piece',
          quantity: payment?.quantity || '0',
          unit_price: payment?.unitPrice || '0',
          total_payment: payment?.totalPayment || 0
        };
      });
      
      const paymentNotes = JSON.stringify(employeePaymentDetails);
      
      const updateData = { 
        employee_id: employeeId,
        notes: assignEmployeeModal.order?.notes 
          ? `${assignEmployeeModal.order.notes}\n\nEMPLOYEE_PAYMENTS:${paymentNotes}`
          : `EMPLOYEE_PAYMENTS:${paymentNotes}`
      };
      
      console.log('🔍 Updating order with data:', updateData);
      console.log('🔍 Order ID:', orderId);
      console.log('🔍 All assigned employees:', assignmentEmployees);
      console.log('🔍 Payment details for all employees:', employeePaymentDetails);
      
      const { error: updateError } = await supabase!
        .from('manufacturing_orders')
        .update(updateData)
        .eq('id', orderId);
      
      if (updateError) {
        console.error('Error updating order assignment:', updateError);
        console.error('Error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        throw updateError;
      }

      // Close modal and reset state
      setAssignEmployeeModal({ isOpen: false, order: null });
      setAssignmentEmployees([]);
      setEmployeeEarnings({});
      setEmployeePayments({});
      
      // Refresh data
      fetchManufacturingOrders();
      
      showAlert('Success', 'Employee assignment saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving employee assignment:', error);
      showAlert('Error', 'Error saving employee assignment', 'error');
    }
  };

  const handleTransferToInventory = (order: any) => {
    console.log('🔍 Transfer button clicked for order:', order);
    console.log('🔍 Order details:', {
      id: order.id,
      order_number: order.order_number,
      product_name: order.product_name,
      quantity_produced: order.quantity_produced,
      status: order.status
    });

    setTransferDestinationBranchId('');
    setTransferModal({ isOpen: true, order });
  };

  const performTransfer = async (order: any, destinationBranchId: string) => {
    try {
      console.log('🚀 Starting transfer process...');
      console.log('Order details:', {
        id: order.id,
        order_number: order.order_number,
        product_name: order.product_name,
        quantity_produced: order.quantity_produced,
        finished_product_id: order.finished_product_id,
        destination_branch_id: destinationBranchId
      });
      
      // Validate required fields
      if (!order.id || !order.order_number || !order.product_name || !order.quantity_produced || !destinationBranchId) {
        console.error('❌ Missing required order fields');
        throw new Error('Invalid order data: missing required fields');
      }
      
      // Always use the original finished_product_id from the manufacturing order
      // This ensures inventory can find the correct manufacturing order for product name
      let manufacturedProductId = order.finished_product_id;
      let shouldCreateManufacturedProduct = true;
      let existingProduct: any = null;
      
      console.log('📋 Using original finished_product_id:', manufacturedProductId);
      
      // Only create manufactured product if we have a finished_product_id
      if (manufacturedProductId) {
        try {
          console.log('🔍 Checking if manufactured product exists...');
          const { data: product, error: checkError } = await supabase!
            .from('manufactured_products')
            .select('id, name, sku')
            .eq('id', manufacturedProductId)
            .single();
          
          if (!checkError && product) {
            console.log('✅ Manufactured product exists:', product);
            existingProduct = product;
            shouldCreateManufacturedProduct = false;
          } else {
            console.log('📝 Will create new manufactured product...');
          }
        } catch (checkError) {
          console.log('⚠️ Product check failed, will create new one:', checkError);
          shouldCreateManufacturedProduct = true;
        }
      } else {
        console.log('⚠️ No finished_product_id, will use fallback approach...');
        shouldCreateManufacturedProduct = false;
      }
      
      // Step 2: Create manufactured product if needed
      let finalProductId = manufacturedProductId;
      let productType = 'manufactured';
      
      if (shouldCreateManufacturedProduct) {
        console.log('🏭 Creating manufactured product...');
        
        try {
          const { data: newProduct, error: createError } = await supabase!
            .from('manufactured_products')
            .insert({
              id: manufacturedProductId,
              name: order.product_name,
              sku: `MFG-${order.order_number}`,
              unit: 'piece',
              is_active: true
            })
            .select()
            .single();
          
          if (createError) throw createError;
          
          console.log('✅ Manufactured product created successfully:', newProduct);
          finalProductId = manufacturedProductId;
          productType = 'manufactured';
          
        } catch (createError: any) {
          console.log('⚠️ Manufactured product creation failed, trying fallback:', createError.message);
          
          // FALLBACK 1: Create as regular product
          try {
            console.log('🔄 Creating as regular product...');
            const { data: fallbackProduct, error: fallbackError } = await supabase!
              .from('products')
              .insert({
                name: order.product_name,
                sku: `MFG-${order.order_number}`,
                unit: 'piece',
                is_manufactured: true,
                is_active: true
              })
              .select()
              .single();
            
            if (fallbackError) throw fallbackError;
            
            console.log('✅ Regular product created successfully:', fallbackProduct);
            finalProductId = fallbackProduct.id;
            productType = 'regular';
            
          } catch (fallbackError: any) {
            console.log('⚠️ Regular product creation failed, trying direct inventory:', fallbackError.message);
            
            // FALLBACK 2: Direct inventory without product reference
            try {
              console.log('📦 Creating direct inventory record...');
              const { data: directInventory, error: directError } = await supabase!
                .from('inventory')
                .insert({
                  product_id: null,
                  manufactured_product_id: null,
                  branch_id: destinationBranchId,
                  quantity: order.quantity_produced,
                  last_updated: new Date().toISOString()
                })
                .select()
                .single();
              
              if (directError) throw directError;
              
              console.log('✅ Direct inventory created successfully:', directInventory);
              
              // Create stock movement
              await createStockMovement(order, null, 'direct', destinationBranchId);
              
              showAlert('Success', '✅ Product transferred to inventory (direct method)!', 'success');
              fetchManufacturingOrders();
              fetchManufacturingTransfers();
              return;
              
            } catch (directError: any) {
              console.error('❌ All methods failed:', directError.message);
              throw new Error(`Transfer failed: Unable to create product or inventory. Error: ${directError.message}. Please check database permissions.`);
            }
          }
        }
      } else if (existingProduct) {
        console.log('✅ Using existing manufactured product:', existingProduct);
        finalProductId = existingProduct.id;
        productType = 'manufactured';
      } else if (!manufacturedProductId) {
        console.log('⚠️ No finished_product_id, using fallback approach...');
        // Use fallback approach when there's no finished_product_id
        try {
          console.log('🔄 Creating as regular product...');
          const { data: fallbackProduct, error: fallbackError } = await supabase!
            .from('products')
            .insert({
              name: order.product_name,
              sku: `MFG-${order.order_number}`,
              unit: 'piece',
              is_manufactured: true,
              is_active: true
            })
            .select()
            .single();
          
          if (fallbackError) throw fallbackError;
          
          console.log('✅ Regular product created successfully:', fallbackProduct);
          finalProductId = fallbackProduct.id;
          productType = 'regular';
          
        } catch (fallbackError: any) {
          console.log('⚠️ Regular product creation failed, trying direct inventory:', fallbackError.message);
          
          // Direct inventory without product reference
          try {
            console.log('📦 Creating direct inventory record...');
            const { data: directInventory, error: directError } = await supabase!
              .from('inventory')
              .insert({
                product_id: null,
                manufactured_product_id: null,
                branch_id: destinationBranchId,
                quantity: order.quantity_produced,
                last_updated: new Date().toISOString()
              })
              .select()
              .single();
            
            if (directError) throw directError;
            
            console.log('✅ Direct inventory created successfully:', directInventory);
            
            // Create stock movement
            await createStockMovement(order, null, 'direct', destinationBranchId);
            
            showAlert('Success', '✅ Product transferred to inventory (direct method)!', 'success');
            fetchManufacturingOrders();
            fetchManufacturingTransfers();
            return;
            
          } catch (directError: any) {
            console.error('❌ All methods failed:', directError.message);
            throw new Error(`Transfer failed: Unable to create product or inventory. Error: ${directError.message}. Please check database permissions.`);
          }
        }
      }
      
      // Step 3: Create inventory record
      console.log('📦 Creating inventory record...');
      
      try {
        const inventoryRecord: any = {
          branch_id: destinationBranchId,
          quantity: order.quantity_produced,
          last_updated: new Date().toISOString()
        };
        
        // Set appropriate product reference based on type
        if (productType === 'manufactured') {
          inventoryRecord.manufactured_product_id = finalProductId;
          inventoryRecord.product_id = null;
        } else {
          // Always use manufactured_product_id for manufacturing transfers
          // even if we created a regular product as fallback
          inventoryRecord.manufactured_product_id = finalProductId;
          inventoryRecord.product_id = null;
        }
        
        const { data: inventoryData, error: inventoryError } = await supabase!
          .from('inventory')
          .insert(inventoryRecord)
          .select()
          .single();
        
        if (inventoryError) throw inventoryError;
        
        console.log('✅ Inventory item created successfully:', inventoryData);
        
        // Create stock movement record
        await createStockMovement(order, finalProductId, productType, destinationBranchId);
        
        console.log('🎉 Transfer completed successfully!');
        showAlert('Success', '✅ Product transferred to inventory successfully!', 'success');
        fetchManufacturingOrders();
        fetchManufacturingTransfers();
        
      } catch (inventoryError: any) {
        console.error('❌ Inventory creation failed:', inventoryError.message);
        throw new Error(`Failed to create inventory record: ${inventoryError.message}`);
      }
      
    } catch (error: any) {
      console.error('❌ Transfer failed:', error.message);
      showAlert('Error', `Transfer failed: ${error.message}`, 'error');
    }
  };

  // Helper function to create stock movement
  const createStockMovement = async (order: any, productId: string | null, type: string, destinationBranchId: string) => {
    try {
      console.log('📋 Creating stock movement record...');
      
      const movementRecord: any = {
        movement_number: `TR${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        type: 'manufacturing',
        to_branch_id: destinationBranchId ?? null,
        quantity: order.quantity_produced,
        notes: `Manufactured product transferred: ${order.product_name} - Order: ${order.order_number}`,
        reference_id: order.id,
        reference_type: 'manufacturing_order',
        created_by: user?.id ?? null
      };
      
      // Set appropriate product reference
      if (type === 'manufactured') {
        movementRecord.manufactured_product_id = productId;
      } else if (type === 'regular') {
        movementRecord.product_id = productId;
      }
      
      const { data: stockMovement, error: stockMovementError } = await supabase!
        .from('stock_movements')
        .insert(movementRecord)
        .select()
        .single();
      
      if (stockMovementError) {
        console.log('⚠️ Stock movement creation failed, but transfer succeeded:', stockMovementError);
      } else {
        console.log('✅ Stock movement created:', stockMovement);
      }
      
    } catch (stockError) {
      console.log('⚠️ Stock movement creation failed, but transfer succeeded:', stockError);
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
          {(() => {
            const totalProduced = manufacturingOrders.reduce((sum, o: any) => sum + (o.quantity_produced || 0), 0);
            const gypsumProduced = manufacturingOrders
              .filter((o: any) => o.product_category === 'gypsum')
              .reduce((sum, o: any) => sum + (o.quantity_produced || 0), 0);
            const woodProduced = manufacturingOrders
              .filter((o: any) => o.product_category === 'wood')
              .reduce((sum, o: any) => sum + (o.quantity_produced || 0), 0);

            const totalTransferred = manufacturingTransfers.reduce((sum: number, t: any) => sum + (Number(t.quantity) || 0), 0);
            const leftToTransfer = Math.max(0, totalProduced - totalTransferred);

            const branchIndex = new Map<string, { name: string; location?: string }>(
              branches.map((b: any) => [b.id, { name: b.name, location: b.location }])
            );

            const transferredByBranch = manufacturingTransfers.reduce((acc: Record<string, number>, t: any) => {
              const branchId = t.to_branch_id || 'unknown';
              acc[branchId] = (acc[branchId] || 0) + (Number(t.quantity) || 0);
              return acc;
            }, {});

            const transferredRows = Object.entries(transferredByBranch)
              .map(([branchId, qty]) => {
                const meta = branchIndex.get(branchId);
                return {
                  branchId,
                  qty,
                  label: branchId === 'unknown' ? 'Unknown / not set' : `${meta?.name || 'Unknown Branch'}${meta?.location ? ` - ${meta.location}` : ''}`,
                };
              })
              .sort((a, b) => b.qty - a.qty);

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🏗️</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Gypsum Produced</p>
                        <p className="text-2xl font-bold text-gray-900">{gypsumProduced}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🪵</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Wood Produced</p>
                        <p className="text-2xl font-bold text-gray-900">{woodProduced}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">📦</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Transferred</p>
                        <p className="text-2xl font-bold text-gray-900">{totalTransferred}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">📅</span>
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
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🧾</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Records</p>
                        <p className="text-2xl font-bold text-gray-900">{manufacturingOrders.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">⏳</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Left to Transfer</p>
                        <p className="text-2xl font-bold text-gray-900">{leftToTransfer}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Transferred To (by Branch)</h3>
                    <button
                      type="button"
                      onClick={fetchManufacturingTransfers}
                      className="text-sm text-blue-600 hover:text-blue-800"
                      title="Refresh transfer stats"
                    >
                      Refresh
                    </button>
                  </div>

                  {transferredRows.length === 0 ? (
                    <p className="text-sm text-gray-600">No transfers recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {transferredRows.map((row) => (
                        <div key={row.branchId} className="flex items-center justify-between border rounded-lg px-4 py-2">
                          <div className="text-sm text-gray-900">{row.label}</div>
                          <div className="text-sm font-semibold text-gray-900">{row.qty}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
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
                  <td colSpan={10} className="px-6 py-12 text-center">
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
                        {order.status === 'completed' && (
                          <button
                            onClick={() => handleTransferToInventory(order)}
                            className="text-orange-600 hover:text-orange-900 p-1 hover:bg-orange-50 rounded"
                            title="Transfer to Inventory"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => setAssignEmployeeModal({ isOpen: true, order })}
                          className="text-purple-600 hover:text-purple-900 p-1 hover:bg-purple-50 rounded"
                          title="Assign Employees"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  <option value="">Select category</option>
                  <option value="gypsum">Gypsum Work</option>
                  <option value="wood">Wood Work</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  <option value="piece">Piece</option>
                  <option value="m2">Square Meter (m²)</option>
                  <option value="day">Day</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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

      {/* Transfer to Inventory Modal */}
      {transferModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-2">Transfer to Inventory</h3>
            <p className="text-sm text-gray-600 mb-4">
              Transfer <span className="font-medium">{transferModal.order?.quantity_produced}</span> units of{' '}
              <span className="font-medium">"{transferModal.order?.product_name}"</span> to inventory.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={transferDestinationBranchId}
                  onChange={(e) => setTransferDestinationBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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

              <div className="flex space-x-3">
                <button
                  type="button"
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
                  onClick={() => {
                    setTransferModal({ isOpen: false, order: null });
                    setTransferDestinationBranchId('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  onClick={async () => {
                    if (!transferDestinationBranchId) {
                      await showAlert('Error', 'Please select a destination branch.', 'error');
                      return;
                    }
                    const order = transferModal.order;
                    setTransferModal({ isOpen: false, order: null });
                    const branchId = transferDestinationBranchId;
                    setTransferDestinationBranchId('');
                    await performTransfer(order, branchId);
                  }}
                >
                  Transfer
                </button>
              </div>
            </div>
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

      {/* Employee Assignment Modal */}
      {assignEmployeeModal.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Assign Employees - {assignEmployeeModal.order?.order_number}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Product: {assignEmployeeModal.order?.product_name}
              </p>
              <p className="text-sm text-gray-600">
                Category: {assignEmployeeModal.order?.product_category}
              </p>
              <p className="text-sm text-gray-600">
                Quantity: {assignEmployeeModal.order?.quantity_produced}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employees {assignEmployeeModal.order?.product_category === 'wood' ? '(Multiple allowed)' : '(Single for gypsum)'}
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {employees.map((employee: any) => (
                  <label key={employee.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type={assignEmployeeModal.order?.product_category === 'wood' ? 'checkbox' : 'radio'}
                      name="employeeSelection"
                      value={employee.id}
                      checked={assignEmployeeModal.order?.product_category === 'wood' 
                        ? assignmentEmployees.includes(employee.id)
                        : assignmentEmployees.length === 1 && assignmentEmployees[0] === employee.id}
                      onChange={(e) => {
                        if (assignEmployeeModal.order?.product_category === 'wood') {
                          if (e.target.checked) {
                            setAssignmentEmployees([...assignmentEmployees, employee.id]);
                          } else {
                            setAssignmentEmployees(assignmentEmployees.filter(id => id !== employee.id));
                          }
                        } else {
                          // Single selection for gypsum
                          setAssignmentEmployees([employee.id]);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {employee.full_name} - {employee.position}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {assignmentEmployees.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Details
                </label>
                {assignmentEmployees.map((employeeId) => {
                  const employee = employees.find(emp => emp.id === employeeId);
                  const payment = employeePayments[employeeId] || {
                    measurementType: 'piece',
                    quantity: '0',
                    unitPrice: '0',
                    totalPayment: 0
                  };
                  
                  return (
                    <div key={employeeId} className="border border-gray-200 rounded-lg p-3 mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {employee?.full_name}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Measurement Type</label>
                          <select
                            value={payment.measurementType}
                            onChange={(e) => updateEmployeePayment(employeeId, 'measurementType', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="piece">Per Piece</option>
                            <option value="m2">Per m²</option>
                            <option value="day">Per Day</option>
                            <option value="month">Per Month</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={payment.quantity}
                            onChange={(e) => updateEmployeePayment(employeeId, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="mb-2">
                        <label className="block text-xs text-gray-600 mb-1">Unit Price (ETB)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={payment.unitPrice}
                          onChange={(e) => updateEmployeePayment(employeeId, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="bg-gray-50 rounded p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Total Payment:</span>
                          <span className="text-sm font-bold text-green-600">
                            ETB {payment.totalPayment.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setAssignEmployeeModal({ isOpen: false, order: null });
                  setAssignmentEmployees([]);
                  setEmployeeEarnings({});
                  setEmployeePayments({});
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEmployeeAssignment()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={assignmentEmployees.length === 0}
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manufacturing;
