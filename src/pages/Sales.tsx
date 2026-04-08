import React, { useState, useEffect, useRef } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';

interface Sale {
  id: string;
  product_id: string;
  branch_id: string;
  quantity_sold: number;
  unit_price: number;
  total_amount: number;
  customer_name: string;
  sale_date: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  products: {
    name: string;
    sku: string;
    unit: string;
  };
  branches: {
    name: string;
    location: string;
  };
}

interface CartItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  available_stock: number;
}

interface SalesFormData {
  branch_id: string;
  customer_name: string;
  product_id: string;
  quantity: string;
  unit_price: string;
}

const Sales: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [formData, setFormData] = useState<SalesFormData>({
    branch_id: user?.branch_id || '',
    customer_name: '',
    product_id: '',
    quantity: '',
    unit_price: '',
  });

  // Simple cache to avoid repeated API calls
  const cacheRef = useRef<{ [key: string]: { data: any; timestamp: number } }>({});
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const getCachedData = (key: string) => {
    const cached = cacheRef.current[key];
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      delete cacheRef.current[key];
      return null;
    }
    return cached.data;
  };

  const setCachedData = (key: string, data: any) => {
    cacheRef.current[key] = { data, timestamp: Date.now() };
  };

  useEffect(() => {
    fetchSales();
    fetchProducts();
    fetchBranches();
    fetchInventory();
  }, []);

  const fetchSales = async () => {
    try {
      // Check cache first
      const cachedSales = getCachedData('sales');
      if (cachedSales) {
        setSales(cachedSales);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase!
        .from('sales')
        .select(`
          *,
          products (name, sku, unit),
          branches (name, location)
        `)
        .order('sale_date', { ascending: false });
      
      if (error) {
        setSales([]);
      } else {
        setSales(data || []);
        setCachedData('sales', data);
      }
    } catch (error) {
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase!
        .from('products')
        .select('id, name, sku, unit, selling_price')
        .eq('is_active', true);
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase!
        .from('branches')
        .select('id, name, location')
        .eq('is_active', true);
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchInventory = async () => {
    console.log('fetchInventory called!');
    try {
      const cachedInventory = getCachedData('inventory');
      if (cachedInventory) {
        console.log('Using cached inventory:', cachedInventory);
        setInventory(cachedInventory);
        return;
      }

      console.log('Fetching fresh inventory data...');
      
      // First, let's see what's in the inventory table without joins
      const { data: basicData, error: basicError } = await supabase!
        .from('inventory')
        .select('product_id, branch_id, quantity');
      
      console.log('Basic inventory data (no joins):', basicData);
      console.log('Basic inventory error:', basicError);
      
      // Now try with joins
      const { data, error } = await supabase!
        .from('inventory')
        .select(`
          product_id,
          branch_id,
          quantity,
          products (name, sku),
          branches (name)
        `)
        .order('last_updated', { ascending: false });
      
      console.log('Inventory data from database:', data);
      console.log('Inventory error:', error);
      console.log('Number of inventory records:', data?.length || 0);
      
      if (data && data.length > 0) {
        data.forEach((item: any) => {
          console.log(`Product: ${item.products?.name}, Branch: ${item.branches?.name}, Quantity: ${item.quantity}`);
        });
      }
      
      setInventory(data || []);
      setCachedData('inventory', data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setInventory([]);
    }
  };

  const getAvailableStock = (productId: string, branchId: string) => {
    console.log('=== Stock Lookup Debug ===');
    console.log('Looking for Product ID:', productId);
    console.log('Looking for Branch ID:', branchId);
    console.log('Available inventory records:', inventory.length);
    
    // Log all inventory records for comparison
    inventory.forEach((item: any, index) => {
      console.log(`Inventory ${index}: product_id=${item.product_id}, branch_id=${item.branch_id}, quantity=${item.quantity}`);
    });
    
    const item = inventory.find(
      inv => inv.product_id === productId && inv.branch_id === branchId
    );
    const quantity = item ? item.quantity : 0;
    
    console.log('Found matching item:', item);
    console.log('Available quantity:', quantity);
    console.log('=== End Stock Lookup Debug ===');
    
    return quantity;
  };

  const ensureInventoryRecord = async (productId: string, branchId: string) => {
    const { data, error } = await supabase!
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .eq('branch_id', branchId)
      .single();
    
    if (error || !data) {
      // Don't create inventory records automatically
      // Let the user manage inventory through the Inventory page
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.branch_id || !formData.customer_name) {
      alert('Please fill all required fields');
      return;
    }

    // Validate that we have either a single product or cart items
    if (!formData.product_id && cart.length === 0) {
      alert('Please add at least one product');
      return;
    }

    // If we have a single product (not in cart), validate it
    if (formData.product_id && cart.length === 0 && !formData.quantity) {
      alert('Please enter quantity');
      return;
    }

    try {
      let saleItems: CartItem[] = [];

      // Add single product to cart if not already there
      if (formData.product_id && cart.length === 0 && formData.quantity) {
        const product = products.find(p => p.id === formData.product_id);
        if (!product) {
          alert('Product not found');
          return;
        }

        // Check if inventory record exists
        const inventoryExists = await ensureInventoryRecord(formData.product_id, formData.branch_id);
        if (!inventoryExists) {
          alert('No inventory record found for this product and branch. Please add inventory through the Inventory page first.');
          return;
        }

        const quantity = parseInt(formData.quantity);
        const availableStock = getAvailableStock(formData.product_id, formData.branch_id);
        
        if (quantity > availableStock) {
          alert(`Insufficient stock! Available: ${availableStock}, Requested: ${quantity}`);
          return;
        }

        const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : (product.selling_price || 0);
        
        saleItems = [{
          product_id: formData.product_id,
          product_name: product.name,
          product_sku: product.sku,
          quantity,
          unit_price: unitPrice,
          total_price: quantity * unitPrice,
          available_stock: availableStock
        }];
      }

      // Combine with cart items
      saleItems = [...saleItems, ...cart];

      // Check inventory exists and stock for all items
      for (const item of saleItems) {
        const inventoryExists = await ensureInventoryRecord(item.product_id, formData.branch_id);
        if (!inventoryExists) {
          alert(`No inventory record found for ${item.product_name}. Please add inventory through the Inventory page first.`);
          return;
        }
        
        const availableStock = getAvailableStock(item.product_id, formData.branch_id);
        if (item.quantity > availableStock) {
          alert(`Insufficient stock for ${item.product_name}! Available: ${availableStock}, Requested: ${item.quantity}`);
          return;
        }
      }

      // Process each sale item
      for (const item of saleItems) {
        // Create sale record
        const { error: saleError } = await supabase!.from('sales').insert({
          product_id: item.product_id,
          branch_id: formData.branch_id,
          quantity_sold: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_price,
          customer_name: formData.customer_name,
          created_by: user?.id
        });

        if (saleError) throw saleError;

        // Update inventory - deduct quantity
        const currentStock = getAvailableStock(item.product_id, formData.branch_id);
        const newStock = currentStock - item.quantity;
        
        const { error: updateError } = await supabase!
          .from('inventory')
          .update({ 
            quantity: newStock,
            last_updated: new Date().toISOString()
          })
          .eq('product_id', item.product_id)
          .eq('branch_id', formData.branch_id);

        if (updateError) throw updateError;

        // Record stock movement
        await supabase!
          .from('stock_movements')
          .insert({
            movement_number: `MV${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            type: 'sale',
            from_branch_id: formData.branch_id,
            product_id: item.product_id,
            quantity: -item.quantity,
            reference_type: 'sale',
            notes: `Sale to ${formData.customer_name} - ${item.quantity} × ${item.product_name} at $${item.unit_price.toFixed(2)}`,
            created_by: user?.id
          });
      }

      // Reset form and cart
      setFormData({
        branch_id: user?.branch_id || '',
        customer_name: '',
        product_id: '',
        quantity: '',
        unit_price: '',
      });
      setCart([]);
      setShowForm(false);
      
      // Clear cache and refresh data
      delete cacheRef.current['sales'];
      delete cacheRef.current['inventory'];
      fetchSales();
      fetchInventory();
      
      alert('Sale recorded successfully!');
    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      
      if (error && typeof error === 'object') {
        if ('message' in error && typeof (error as any).message === 'string') {
          errorMessage = (error as any).message;
        } else if ('error' in error && typeof error.error === 'object' && error.error !== null) {
          const errorObj = error.error as any;
          if ('message' in errorObj && typeof errorObj.message === 'string') {
            errorMessage = errorObj.message;
          } else if ('details' in errorObj && typeof errorObj.details === 'string') {
            errorMessage = errorObj.details;
          }
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      alert(`Error recording sale: ${errorMessage}`);
    }
  };

  const addToCart = () => {
    if (!formData.product_id || !formData.quantity || !formData.branch_id) {
      alert('Please select product, branch, and quantity');
      return;
    }

    const product = products.find(p => p.id === formData.product_id);
    if (!product) {
      alert('Product not found');
      return;
    }

    const quantity = parseInt(formData.quantity);
    const availableStock = getAvailableStock(formData.product_id, formData.branch_id);
    
    if (quantity > availableStock) {
      alert(`Insufficient stock! Available: ${availableStock}, Requested: ${quantity}`);
      return;
    }

    const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : (product.selling_price || 0);
    const totalPrice = quantity * unitPrice;

    // Check if product already in cart
    const existingItemIndex = cart.findIndex(item => item.product_id === formData.product_id);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedCart = [...cart];
      updatedCart[existingItemIndex] = {
        ...updatedCart[existingItemIndex],
        quantity: updatedCart[existingItemIndex].quantity + quantity,
        total_price: updatedCart[existingItemIndex].total_price + totalPrice
      };
      setCart(updatedCart);
    } else {
      // Add new item
      setCart([...cart, {
        product_id: formData.product_id,
        product_name: product.name,
        product_sku: product.sku,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        available_stock: availableStock
      }]);
    }

    // Reset product fields
    setFormData({
      ...formData,
      product_id: '',
      quantity: '',
      unit_price: '',
    });
    setShowAddProduct(false);
  };

  const addCurrentProductToCart = () => {
    if (!formData.product_id || !formData.quantity) {
      alert('Please select product and quantity first');
      return;
    }
    addToCart();
  };

  const getTotalAmount = () => {
    let total = getCartTotal();
    
    // Add current product if not in cart
    if (formData.product_id && formData.quantity) {
      const product = products.find(p => p.id === formData.product_id);
      if (product) {
        const quantity = parseInt(formData.quantity);
        const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : (product.selling_price || 0);
        total += quantity * unitPrice;
      }
    }
    
    return total;
  };

  const removeFromCart = (product_id: string) => {
    setCart(cart.filter(item => item.product_id !== product_id));
  };

  const updateCartQuantity = (product_id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(product_id);
      return;
    }

    setCart(cart.map(item => {
      if (item.product_id === product_id) {
        return {
          ...item,
          quantity: newQuantity,
          total_price: newQuantity * item.unit_price
        };
      }
      return item;
    }));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.total_price, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaleRowClick = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedSale(null);
  };

  const handleEditSale = (sale: Sale) => {
    // Pre-fill form with sale data for editing
    setFormData({
      branch_id: sale.branch_id,
      customer_name: sale.customer_name,
      product_id: sale.product_id,
      quantity: sale.quantity_sold.toString(),
      unit_price: sale.unit_price.toString()
    });
    setShowForm(true);
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (!confirm(`Are you sure you want to delete this sale to "${sale.customer_name || 'Unknown Customer'}" for ETB ${sale.total_amount.toFixed(2)}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Get current inventory before deleting sale
      const { data: currentInventory } = await supabase!
        .from('inventory')
        .select('quantity')
        .eq('product_id', sale.product_id)
        .eq('branch_id', sale.branch_id)
        .single();
      
      // Restore inventory quantity
      if (currentInventory && sale.quantity_sold) {
        const newQuantity = (currentInventory.quantity || 0) + sale.quantity_sold;
        
        await supabase!
          .from('inventory')
          .update({ 
            quantity: newQuantity,
            last_updated: new Date().toISOString()
          })
          .eq('product_id', sale.product_id)
          .eq('branch_id', sale.branch_id);
      }

      // Delete the sale record
      const { error } = await supabase!
        .from('sales')
        .delete()
        .eq('id', sale.id);

      if (error) {
        const errorMessage = error && typeof error === 'object' && 'message' in error ? error.message : 'Unknown error';
        alert(`Error deleting sale: ${errorMessage}`);
        return;
      }
      
      // Clear cache and refresh data
      delete cacheRef.current['sales'];
      delete cacheRef.current['inventory'];
      fetchSales();
      fetchInventory();
      
      alert('Sale deleted successfully! Inventory quantity restored.');
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error ? error.message : 'Unknown error';
      alert(`Error deleting sale: ${errorMessage}`);
    }
  };

  const getCurrentProduct = () => {
    return products.find(p => p.id === formData.product_id);
  };

  const calculateTotal = () => {
    const product = getCurrentProduct();
    const quantity = parseInt(formData.quantity) || 0;
    const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : (product?.selling_price || 0);
    return quantity * unitPrice;
  };

  const getDisplayPrice = () => {
    const product = getCurrentProduct();
    const price = formData.unit_price || product?.selling_price || 0;
    return parseFloat(price.toString()) || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Fikir & Leul
          </h1>
          <p className="text-lg text-gray-600">
            Inventory and Sales System
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => fetchSales()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            {showForm ? 'Hide Form' : 'Record New Sale'}
          </button>
        </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 truncate">
              {sales.length.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Transactions</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600 truncate">
              ETB {sales.reduce((sum, sale) => sum + sale.total_amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">All time sales</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Items Sold</p>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 truncate">
              {sales.reduce((sum, sale) => sum + sale.quantity_sold, 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total units</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Average Sale</p>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-600 truncate">
              ETB {sales.length > 0 ? (sales.reduce((sum, sale) => sum + sale.total_amount, 0) / sales.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Per transaction</p>
          </div>
        </div>
      </div>

      {/* Sale Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-4 max-w-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Record New Sale</h2>
            <button
              onClick={() => {
                setShowForm(false);
                setCart([]);
                setShowAddProduct(false);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer and Branch Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Branch *</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  value={formData.branch_id}
                  onChange={handleInputChange}
                  name="branch_id"
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  name="customer_name"
                  placeholder="Enter customer name"
                />
              </div>
            </div>

            {/* Product Selection */}
            <div className="border-t pt-3">
              {formData.product_id && formData.quantity && cart.length === 0 && (
                <button
                  type="button"
                  onClick={addCurrentProductToCart}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  Add Product
                </button>
              )}
            </div>

            {/* Single Product Form */}
            {cart.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product *</label>
                  <select
                    required={cart.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    value={formData.product_id}
                    onChange={handleInputChange}
                    name="product_id"
                  >
                    <option value="">Select Product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    required={cart.length === 0}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    name="quantity"
                  />
                  {formData.product_id && formData.branch_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {getAvailableStock(formData.product_id, formData.branch_id)} units
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    value={formData.unit_price || getCurrentProduct()?.selling_price || ''}
                    onChange={handleInputChange}
                    name="unit_price"
                    placeholder={getCurrentProduct()?.selling_price?.toString() || '0.00 ETB'}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 border-t pt-3">
              <button
                type="submit"
                disabled={!formData.product_id && cart.length === 0}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                Complete Sale (ETB {getTotalAmount().toFixed(2)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setCart([]);
                  setShowAddProduct(false);
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Sales History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr 
                  key={sale.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleSaleRowClick(sale)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {sale.products?.name || (sale.product_id ? `Product ID: ${sale.product_id}` : 'No Product Assigned')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {sale.products?.sku || (sale.product_id ? 'No SKU Available' : 'No Product')}
                      </div>
                      {!sale.products && (
                        <div className="text-xs text-orange-600 mt-1">
                          {sale.product_id ? '⚠️ Product information missing' : '⚠️ No product linked to this sale'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.branches?.name || (sale.branch_id ? `Branch ID: ${sale.branch_id}` : 'No Branch Assigned')}
                    {!sale.branches && (
                      <div className="text-xs text-orange-600">
                        {sale.branch_id ? '⚠️ Branch info missing' : '⚠️ No branch linked to this sale'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.customer_name || 'Walk-in Customer'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.quantity_sold} {sale.products?.unit || 'units'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${sale.unit_price.toFixed(2)} ETB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${sale.total_amount.toFixed(2)} ETB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSale(sale);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                        title="Edit sale"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11 16H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSale(sale);
                        }}
                        className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors"
                        title="Delete sale"
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
      
      {/* Sale Detail Modal */}
      {showDetailModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">🧾</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Sale Details</h3>
                    <p className="text-blue-100 text-sm">
                      {new Date(selectedSale.sale_date).toLocaleDateString()} at {new Date(selectedSale.sale_date).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetailModal}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Product Information</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Product Name</p>
                      <p className="text-base text-gray-900">{selectedSale.products?.name || (selectedSale.product_id ? `Product ID: ${selectedSale.product_id}` : 'No Product Assigned')}</p>
                      {!selectedSale.products && (
                        <p className="text-xs text-orange-600 mt-1">
                          {selectedSale.product_id ? '⚠️ Product information missing' : '⚠️ No product linked to this sale'}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">SKU</p>
                      <p className="text-base text-gray-900">{selectedSale.products?.sku || (selectedSale.product_id ? 'No SKU Available' : 'No Product')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Quantity Sold</p>
                      <p className="text-base text-gray-900">{selectedSale.quantity_sold} {selectedSale.products?.unit || 'units'}</p>
                    </div>
                  </div>
                </div>

                {/* Sale Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Sale Information</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Customer Name</p>
                      <p className="text-base text-gray-900">{selectedSale.customer_name || 'Walk-in Customer'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Branch</p>
                      <p className="text-base text-gray-900">{selectedSale.branches?.name || (selectedSale.branch_id ? `Branch ID: ${selectedSale.branch_id}` : 'No Branch Assigned')}</p>
                      {!selectedSale.branches && (
                        <p className="text-xs text-orange-600">
                          {selectedSale.branch_id ? '⚠️ Branch information missing' : '⚠️ No branch linked to this sale'}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Unit Price</p>
                      <p className="text-base text-gray-900">ETB {selectedSale.unit_price.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Amount */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-green-600">ETB {selectedSale.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t">
              <button
                onClick={handleCloseDetailModal}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Sales;
