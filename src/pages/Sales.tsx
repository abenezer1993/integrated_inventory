import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { alertFunction } from '../utils/alerts';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';
import { useConfirmation } from '../utils/confirmations';
import { ROLE_PERMISSIONS } from '../utils/accessControl';

interface Sale {
  id: string;
  product_id: string | null;
  manufactured_product_id: string | null;
  branch_id: string | null;
  branch_name: string;
  quantity_sold: number;
  unit_price: number;
  total_amount: number;
  cost_price: number;
  profit: number;
  customer_name: string;
  sale_date: string;
  product_name: string;
  product_sku: string;
  product_unit: string;
  is_manufactured: boolean;
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
  sale_date: string;
}

const Sales: React.FC = () => {
  const { supabase } = useSupabase();
  const { user, hasPermission } = useAuth();
  const { showConfirmation } = useConfirmation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState<SalesFormData>({
    branch_id: user?.branch_id || '',
    customer_name: '',
    product_id: '',
    quantity: '',
    unit_price: '',
    sale_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const SALES_PER_PAGE = 10;
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);

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
    // Handle URL parameters for branch filtering
    const urlParams = new URLSearchParams(window.location.search);
    const branchId = urlParams.get('branch');
    
    if (branchId) {
      console.log('Branch ID from URL:', branchId);
      setFormData(prev => ({
        ...prev,
        branch_id: branchId
      }));
    }
  }, []);

  useEffect(() => {
    // Load inventory first, then products (products depend on inventory)
    const initializeData = async () => {
      await fetchInventory();
      await fetchProducts();
      await fetchBranches();
      fetchSales();
    };
    initializeData();
  }, []);

  // Create optimized lookup maps for faster filtering
  const createInventoryLookup = (inventory: any[], branchId: string) => {
    const lookup = new Map();
    
    inventory.forEach((inv: any) => {
      if (inv.branch_id === branchId) {
        if (inv.product_id) {
          lookup.set(inv.product_id, inv);
        }
        if (inv.manufactured_product_id) {
          lookup.set(inv.manufactured_product_id, inv);
        }
      }
    });
    
    return lookup;
  };

  // Filter products when branch changes
  useEffect(() => {
    if (inventory.length === 0 || allProducts.length === 0) {
      console.log('Waiting for inventory and products to load...');
      return;
    }
    
    console.log('Filtering products for branch:', formData.branch_id);
    console.log('All products count:', allProducts.length);
    console.log('Inventory count:', inventory.length);
    
    // If no branch selected, show no products
    if (!formData.branch_id || formData.branch_id === '') {
      console.log('No branch selected, clearing filtered products');
      setFilteredProducts([]);
      return;
    }
    
    // Create lookup map for this branch
    const inventoryLookup = createInventoryLookup(inventory, formData.branch_id);
    
    const productsWithInventory = allProducts.filter((product) => {
      const inventoryItem = inventoryLookup.get(product.id);
      
      if (!inventoryItem) {
        return false;
      }
      
      return inventoryItem.quantity > 0;
    });
    
    console.log('Filtered products count:', productsWithInventory.length);
    setFilteredProducts(productsWithInventory);
  }, [formData.branch_id, inventory, allProducts]);

  const fetchSales = async (page: number = 1) => {
    try {
      setLoading(true);
      const offset = (page - 1) * SALES_PER_PAGE;
      
      // Fetch paginated sales with branch data
      let query = supabase!
        .from('sales')
        .select(`
          *,
          branches (name),
          products (name, sku, unit),
          manufactured_products (name, sku, unit)
        `)
        .order('created_at', { ascending: false });
      
      // Apply branch filter if user is not admin
      if (user?.role !== 'admin' && user?.branch_id) {
        query = query.eq('branch_id', user.branch_id);
      }
      
      // Apply pagination
      query = query.range(offset, offset + SALES_PER_PAGE - 1);
      
      const { data: salesData, error: salesError } = await query;
      
      // Fetch total count
      let countQuery = supabase!.from('sales').select('id', { count: 'exact', head: true });
      if (user?.role !== 'admin' && user?.branch_id) {
        countQuery = countQuery.eq('branch_id', user.branch_id);
      }
      const { count, error: countError } = await countQuery;
      
      if (salesError || countError) {
        console.error('Sales fetch error:', salesError || countError);
        setSales([]);
        setTotalSales(0);
        setTotalPages(1);
      } else {
        // Process the data to match the Sale interface
        const processedSales = salesData?.map((sale: any) => {
          let productName = '';
          let productSku = '';
          let productUnit = '';
          let isManufactured = false;
          
          if (sale.product_id && sale.products) {
            productName = sale.products.name || 'Unknown Product';
            productSku = sale.products.sku || 'No SKU';
            productUnit = sale.products.unit || 'piece';
            isManufactured = false;
          } else if (sale.manufactured_product_id && sale.manufactured_products) {
            productName = sale.manufactured_products.name || 'Manufactured Product';
            productSku = sale.manufactured_products.sku || 'No SKU';
            productUnit = sale.manufactured_products.unit || 'piece';
            isManufactured = true;
          }
          
          return {
            ...sale,
            branch_name: sale.branches?.name || 'Unknown Branch',
            product_name: productName,
            product_sku: productSku,
            product_unit: productUnit,
            is_manufactured: isManufactured
          };
        }) || [];
        
        setSales(processedSales);
        setTotalSales(count || 0);
        setTotalPages(Math.ceil((count || 0) / SALES_PER_PAGE));
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
      setSales([]);
      setTotalSales(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log('=== FETCHING PRODUCTS FOR SALES ===');
      
      // Fetch purchased products
      console.log('Fetching purchased products...');
      const { data: purchasedProducts, error: purchasedError } = await supabase!
        .from('products')
        .select('id, name, sku, unit, selling_price, cost_price')
        .eq('is_active', true);
      
      if (purchasedError) throw purchasedError;
      console.log('Purchased products:', purchasedProducts);
      
      // Fetch manufactured products using RPC (bypasses RLS)
      console.log('Fetching manufactured products via RPC...');
      let manufacturedProducts: any[] = [];
      try {
        const { data: rpcProducts, error: rpcError } = await supabase!.rpc('get_all_manufactured_products_for_dropdown');
        if (rpcError) {
          console.error('RPC Error:', rpcError);
        } else {
          manufacturedProducts = rpcProducts || [];
          console.log('Manufactured products (RPC):', manufacturedProducts);
          console.log('Manufactured products count:', manufacturedProducts.length);
          
          // Log each product details
          manufacturedProducts.forEach((product, index) => {
            console.log(`Product ${index + 1}:`, {
              id: product.id,
              name: product.name,
              sku: product.sku,
              unit: product.unit,
              selling_price: product.selling_price
            });
          });
        }
      } catch (rpcError) {
        console.error('RPC failed for manufactured products:', rpcError);
      }
      
      // Set all products (no filtering here - useEffect will handle filtering)
      const allProducts = [
        ...(purchasedProducts || []).map((p: any) => ({ ...p, type: 'purchased' })),
        ...manufacturedProducts.map((p: any) => ({ ...p, type: 'manufactured' }))
      ];
      
      console.log('All products loaded for sales:', allProducts);
      console.log('Total products loaded count:', allProducts.length);
      setAllProducts(allProducts);
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
        .select('product_id, manufactured_product_id, branch_id, quantity');
      
      console.log('Basic inventory data (no joins):', basicData);
      console.log('Basic inventory error:', basicError);
      
      // Now try with joins
      const { data, error } = await supabase!
        .from('inventory')
        .select(`
          product_id,
          manufactured_product_id,
          branch_id,
          quantity,
          products (name, sku),
          manufactured_products (name, sku),
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
    // Look for both purchased products and manufactured products
    const item = inventory.find(
      inv => (inv.product_id === productId || inv.manufactured_product_id === productId) && inv.branch_id === branchId
    );
    const quantity = item ? item.quantity : 0;
    
    return quantity;
  };

  const ensureInventoryRecord = async (productId: string, branchId: string) => {
    // Check for both purchased products and manufactured products
    const { data, error } = await supabase!
      .from('inventory')
      .select('quantity')
      .or(`product_id.eq.${productId},manufactured_product_id.eq.${productId}`)
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
      alertFunction('Please fill all required fields');
      return;
    }

    // Validate that we have either a single product or cart items
    if (!formData.product_id && cartItems.length === 0) {
      alertFunction('Please add at least one product');
      return;
    }

    // If we have a single product (not in cart), validate it
    if (formData.product_id && cartItems.length === 0 && !formData.quantity) {
      alertFunction('Please enter quantity');
      return;
    }

    try {
      let saleItems: CartItem[] = [];

      // Add single product to cart if not already there
      if (formData.product_id && cartItems.length === 0 && formData.quantity) {
        const product = filteredProducts.find((p: any) => p.id === formData.product_id);
        if (!product) {
          alertFunction('Product not found');
          return;
        }

        const quantity = parseInt(formData.quantity);
        const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : (product.selling_price || 0);
        const totalPrice = quantity * unitPrice;

        const newItem: CartItem = {
          product_id: formData.product_id,
          product_name: product.name,
          product_sku: product.sku,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          available_stock: getAvailableStock(formData.product_id, formData.branch_id)
        };
        saleItems = [newItem];
      }

      // Combine with cart items
      saleItems = [...saleItems, ...cartItems];

      // Check inventory exists and stock for all items
      for (const item of saleItems) {
        const inventoryExists = await ensureInventoryRecord(item.product_id, formData.branch_id);
        if (!inventoryExists) {
          alertFunction(`No inventory record found for ${item.product_name}. Please add inventory through the Inventory page first.`);
          return;
        }
        
        const availableStock = getAvailableStock(item.product_id, formData.branch_id);
        if (item.quantity > availableStock) {
          alertFunction(`Insufficient stock for ${item.product_name}! Available: ${availableStock}, Requested: ${item.quantity}`);
          return;
        }
      }

      // Process each sale item
      for (const item of saleItems) {
        // Check if this is a manufactured product
        const product = allProducts.find(p => p.id === item.product_id);
        const isManufactured = product?.type === 'manufactured';
        
        // Get product cost price for profit calculation
        const productCostPrice = product?.cost_price || 0;
        const profit = (item.unit_price - productCostPrice) * item.quantity;

        // Create sale record with correct product reference
        const saleData: any = {
          branch_id: formData.branch_id,
          quantity_sold: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_price,
          cost_price: productCostPrice,
          profit: profit,
          customer_name: formData.customer_name,
          sale_date: formData.sale_date,
          created_by: user?.id
        };

        if (product.type === 'purchased') {
          saleData.product_id = item.product_id;
          saleData.manufactured_product_id = null;
        } else {
          saleData.product_id = null;
          saleData.manufactured_product_id = item.product_id;
        }
        
        console.log('🔍 Sale data being inserted:', saleData);
        const { error: saleError } = await supabase!.from('sales').insert(saleData);

        if (saleError) {
          console.error('❌ Sale error details:', saleError);
          throw saleError;
        }

        // Update inventory - deduct quantity
        const currentStock = getAvailableStock(item.product_id, formData.branch_id);
        const newStock = currentStock - item.quantity;
        
        const { error: updateError } = await supabase!
          .from('inventory')
          .update({ 
            quantity: newStock,
            last_updated: new Date().toISOString()
          })
          .or(`product_id.eq.${item.product_id},manufactured_product_id.eq.${item.product_id}`)
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
        sale_date: new Date().toISOString().split('T')[0], // Reset to today's date
      });
      setCartItems([]);
      setShowForm(false);
      
      // Clear cache and refresh data
      delete cacheRef.current['sales'];
      delete cacheRef.current['inventory'];
      console.log('About to fetch sales after creating new sale...');
      await fetchSales();
      await fetchInventory();
      
      alertFunction('Sale recorded successfully!');
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
      
      alertFunction(`Error recording sale: ${errorMessage}`);
    }
  };

  const addToCart = () => {
    if (!formData.product_id || !formData.quantity || !formData.branch_id) {
      alertFunction('Please select product, branch, and quantity');
      return;
    }

    const product = filteredProducts.find(p => p.id === formData.product_id);
    if (!product) {
      alertFunction('Product not found');
      return;
    }

    const quantity = parseInt(formData.quantity);
    const availableStock = getAvailableStock(formData.product_id, formData.branch_id);
    
    if (quantity > availableStock) {
      alertFunction(`Insufficient stock! Available: ${availableStock}, Requested: ${quantity}`);
      return;
    }

    const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : (product.selling_price || 0);
    const totalPrice = quantity * unitPrice;

    // Check if product already in cart
    const existingItemIndex = cartItems.findIndex((item: any) => item.product_id === formData.product_id);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedCart = [...cartItems];
      updatedCart[existingItemIndex] = {
        ...updatedCart[existingItemIndex],
        quantity: updatedCart[existingItemIndex].quantity + quantity,
        total_price: updatedCart[existingItemIndex].total_price + totalPrice
      };
      setCartItems(updatedCart);
    } else {
      // Add new item
      setCartItems([...cartItems, {
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
      alertFunction('Please select product and quantity first');
      return;
    }
    addToCart();
  };

  const getTotalAmount = () => {
    let total = getCartTotal();
    
    // Add current product if not in cart
    if (formData.product_id && formData.quantity) {
      const product = filteredProducts.find(p => p.id === formData.product_id);
      if (product) {
        const quantity = parseInt(formData.quantity);
        const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : (product.selling_price || 0);
        total += quantity * unitPrice;
      }
    }
    
    return total;
  };

  const removeFromCart = (product_id: string) => {
    setCartItems(cartItems.filter((item: any) => item.product_id !== product_id));
  };

  const updateCartQuantity = (product_id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(product_id);
      return;
    }

    setCartItems(cartItems.map((item: any) => {
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
    return cartItems.reduce((sum: number, item: any) => sum + item.total_price, 0);
  };

  const getCartItemCount = () => {
    return cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
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
      branch_id: sale.branch_id || '',
      customer_name: sale.customer_name,
      product_id: sale.product_id || sale.manufactured_product_id || '',
      quantity: sale.quantity_sold.toString(),
      unit_price: sale.unit_price.toString(),
      sale_date: sale.sale_date ? new Date(sale.sale_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowForm(true);
  };

  const handleDeleteSale = async (sale: Sale) => {
    showConfirmation({
      title: 'Delete Sale',
      message: `Are you sure you want to delete this sale to "${sale.customer_name}" for ETB ${sale.total_amount.toFixed(2)}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          // Restore inventory quantity
          if (sale.product_id) {
            const { data: currentInventory } = await supabase!
              .from('inventory')
              .select('quantity')
              .eq('product_id', sale.product_id)
              .eq('branch_id', sale.branch_id)
              .single();
            
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
          } else if (sale.manufactured_product_id) {
            const { data: currentInventory } = await supabase!
              .from('inventory')
              .select('quantity')
              .eq('manufactured_product_id', sale.manufactured_product_id)
              .eq('branch_id', sale.branch_id)
              .single();
            
            if (currentInventory && sale.quantity_sold) {
              const newQuantity = (currentInventory.quantity || 0) + sale.quantity_sold;
              
              await supabase!
                .from('inventory')
                .update({ 
                  quantity: newQuantity,
                  last_updated: new Date().toISOString()
                })
                .eq('manufactured_product_id', sale.manufactured_product_id)
                .eq('branch_id', sale.branch_id);
            }
          }

          // Delete the sale record
          const { error: deleteError } = await supabase!
            .from('sales')
            .delete()
            .eq('id', sale.id);

          if (deleteError) throw deleteError;

          // Refresh data
          fetchSales(1);
          fetchInventory();
          
          alertFunction('Sale deleted successfully! Inventory quantity restored.');
        } catch (error: any) {
          console.error('Error deleting sale:', error);
          alertFunction(`Error deleting sale: ${error.message}`);
        }
      },
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
  };

  const getCurrentProduct = () => {
    const product = filteredProducts.find(p => p.id === formData.product_id);
    console.log('🔍 Current product data:', product);
    return product;
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

  const calculateProfit = () => {
    const product = getCurrentProduct();
    const quantity = parseInt(formData.quantity) || 0;
    const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : (product?.selling_price || 0);
    const costPrice = product?.cost_price || 0;
    return (unitPrice - costPrice) * quantity;
  };

  const getProfitMargin = () => {
    const product = getCurrentProduct();
    const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : (product?.selling_price || 0);
    const costPrice = product?.cost_price || 0;
    if (costPrice === 0) return 0;
    return ((unitPrice - costPrice) / costPrice) * 100;
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
          {(() => {
            return hasPermission('create_sales');
          })() && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              {showForm ? 'Hide Form' : 'Record New Sale'}
            </button>
          )}
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
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-600 truncate">
              ETB {sales.reduce((sum, sale) => sum + (sale.profit || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">All time profit</p>
          </div>
        </div>
      </div>

      {/* Additional Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Today's Sales</p>
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-indigo-600 truncate">
              ETB {sales
                .filter(sale => {
                  const today = new Date().toISOString().split('T')[0];
                  const saleDate = new Date(sale.sale_date).toISOString().split('T')[0];
                  return saleDate === today;
                })
                .reduce((sum, sale) => sum + sale.total_amount, 0)
                .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Today's revenue</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Average Sale</p>
              <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-teal-600 truncate">
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
                setCartItems([]);
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Branch *</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  name="customer_name"
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sales Date *</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900"
                  value={formData.sale_date}
                  onChange={handleInputChange}
                  name="sale_date"
                  max={new Date().toISOString().split('T')[0]} // Prevent future dates
                />
              </div>
            </div>

            {/* Product Selection */}
            <div className="border-t pt-3">
              {formData.product_id && formData.quantity && cartItems.length === 0 && (
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
            {cartItems.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product *</label>
                  <select
                    required={cartItems.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900"
                    value={formData.product_id}
                    onChange={handleInputChange}
                    name="product_id"
                  >
                    <option value="">Select Product</option>
                    {filteredProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.type === 'manufactured' ? 'Manufactured' : 'Purchased'}) - {product.sku}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    required={cartItems.length === 0}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900"
                    value={formData.unit_price || getCurrentProduct()?.selling_price || ''}
                    onChange={handleInputChange}
                    name="unit_price"
                    placeholder={getCurrentProduct()?.selling_price?.toString() || '0.00 ETB'}
                  />
                </div>
              </div>
            )}

            {/* Profit Calculation Display */}
            {formData.product_id && formData.quantity && formData.unit_price && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Profit Calculation</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Cost Price:</span>
                    <span className="ml-2 font-medium">ETB {getCurrentProduct()?.cost_price?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Selling Price:</span>
                    <span className="ml-2 font-medium">ETB {formData.unit_price}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Quantity:</span>
                    <span className="ml-2 font-medium">{formData.quantity}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Profit/Unit:</span>
                    <span className="ml-2 font-medium text-green-600">
                      ETB {(parseFloat(formData.unit_price) - (getCurrentProduct()?.cost_price || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="col-span-2 border-t pt-1 mt-1">
                    <span className="text-gray-500 font-semibold">Total Profit:</span>
                    <span className="ml-2 font-bold text-green-600">
                      ETB {((parseFloat(formData.unit_price) - (getCurrentProduct()?.cost_price || 0)) * parseInt(formData.quantity)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 border-t pt-3">
              <button
                type="submit"
                disabled={!formData.product_id && cartItems.length === 0}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                Complete Sale (ETB {getTotalAmount().toFixed(2)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setCartItems([]);
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
      <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700 font-mono text-xs">
            <thead className="bg-gray-800 border-b border-gray-600">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold text-green-400 uppercase tracking-wider">
                  DATE
                </th>
                <th className="px-4 py-2 text-left text-xs font-bold text-green-400 uppercase tracking-wider">
                  BRANCH
                </th>
                <th className="px-4 py-2 text-left text-xs font-bold text-green-400 uppercase tracking-wider">
                  PRODUCT
                </th>
                <th className="px-4 py-2 text-left text-xs font-bold text-green-400 uppercase tracking-wider">
                  CUSTOMER
                </th>
                <th className="px-4 py-2 text-left text-xs font-bold text-green-400 uppercase tracking-wider">
                  AMOUNT
                </th>
                <th className="px-4 py-2 text-left text-xs font-bold text-green-400 uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-gray-700">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-800 border-l-2 border-transparent hover:border-green-400 transition-all">
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-green-300">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-green-300">
                    {sale.branch_name || 'UNKNOWN'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-xs font-medium text-green-300">
                        {sale.product_name || 'UNKNOWN PRODUCT'}
                      </div>
                      <div className="text-xs text-gray-400">
                        SKU: {sale.product_sku || 'N/A'}
                      </div>
                      {sale.is_manufactured && (
                        <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-yellow-900 text-yellow-300 border border-yellow-600">
                          [MFG]
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-green-300">
                    {sale.customer_name || 'WALK-IN'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-green-400">
                    ${sale.total_amount.toFixed(2)} ETB
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaleRowClick(sale);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 p-1 hover:bg-gray-800 rounded border border-cyan-600 hover:border-cyan-400 transition-all"
                        title="VIEW DETAILS"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {hasPermission('manage_sales') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSale(sale);
                          }}
                          className="text-green-400 hover:text-green-300 p-1 hover:bg-gray-800 rounded border border-green-600 hover:border-green-400 transition-all"
                          title="EDIT SALE"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {hasPermission('manage_sales') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSale(sale);
                          }}
                          className="text-red-400 hover:text-red-300 p-1 hover:bg-gray-800 rounded border border-red-600 hover:border-red-400 transition-all"
                          title="Delete sale"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-lg p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * SALES_PER_PAGE) + 1} to {Math.min(currentPage * SALES_PER_PAGE, totalSales)} of {totalSales} sales
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => fetchSales(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchSales(pageNum)}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => fetchSales(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      
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
                      <p className="text-base text-gray-900">
                        {selectedSale.product_name || 'Unknown Product'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">SKU</p>
                      <p className="text-base text-gray-900">
                        {selectedSale.product_sku || 'No SKU'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Type</p>
                      <p className="text-base text-gray-900">
                        {selectedSale.is_manufactured ? 'Manufactured Product' : 'Purchased Product'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Quantity Sold</p>
                      <p className="text-base text-gray-900">{selectedSale.quantity_sold} {selectedSale.product_unit || 'units'}</p>
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
