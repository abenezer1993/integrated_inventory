import React, { useState, useEffect, useMemo } from 'react';
import { alertFunction } from '../utils/alerts';
import { useAuth } from '../contexts/AuthContext-debug';
import { useSupabase } from '../contexts/SupabaseContext';
import { useConfirmation } from '../utils/confirmations';

interface ManufacturedProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  low_stock_threshold: number;
}

interface InventoryItem {
  id: string;
  product_id: string | null;
  manufactured_product_id: string | null;
  quantity: number;
  last_updated: string;
  branch_id: string | null;
  branches: {
    id: string;
    name: string;
  };
  products: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    low_stock_threshold: number;
  };
  manufactured_products: ManufacturedProduct;
  product_info: ManufacturedProduct | null;
  source: string;
  product_name: string;
  display_sku: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  low_stock_threshold: number;
  type: 'purchased' | 'manufactured';
}

interface Branch {
  id: string;
  name: string;
  location: string;
}

interface TransferForm {
  from_branch_id: string;
  to_branch_id: string;
  product_id: string;
  quantity: string;
  notes: string;
}

interface TransferFormErrors {
  from_branch_id: string;
  to_branch_id: string;
  product_id: string;
  quantity: string;
  notes: string;
}

interface InventoryForm {
  product_id: string;
  branch_id: string;
  quantity: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const Inventory: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { showConfirmation } = useConfirmation();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [showAddInventoryForm, setShowAddInventoryForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [transferForm, setTransferForm] = useState({
    from_branch_id: '',
    to_branch_id: '',
    product_id: '',
    quantity: '',
    notes: ''
  });
  const [transferFormErrors, setTransferFormErrors] = useState({
    from_branch_id: '',
    to_branch_id: '',
    product_id: '',
    quantity: '',
    notes: ''
  });
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [inventoryForm, setInventoryForm] = useState({
    product_id: '',
    branch_id: '',
    quantity: ''
  });
  const [filter, setFilter] = useState<'all' | 'manufactured' | 'purchased'>('all');
  const [productSearch, setProductSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const [manufacturedPagination, setManufacturedPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0
  });
  
  const [purchasedPagination, setPurchasedPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0
  });
  const [totalInventory, setTotalInventory] = useState<InventoryItem[]>([]);

  // Use total inventory for accurate filter counts
  const manufacturedInventory = useMemo(() => {
    return totalInventory.filter(item => item.source === 'manufactured');
  }, [totalInventory]);

  const purchasedInventory = useMemo(() => {
    return totalInventory.filter(item => item.source === 'purchased');
  }, [totalInventory]);

  // Memoized filtering to prevent re-renders
  const filteredInventory = useMemo(() => {
    switch (filter) {
      case 'manufactured':
        const mfgStart = (manufacturedPagination.page - 1) * manufacturedPagination.limit;
        const mfgEnd = mfgStart + manufacturedPagination.limit;
        return manufacturedInventory.slice(mfgStart, mfgEnd);
      case 'purchased':
        const purStart = (purchasedPagination.page - 1) * purchasedPagination.limit;
        const purEnd = purStart + purchasedPagination.limit;
        return purchasedInventory.slice(purStart, purEnd);
      default:
        return inventory; // Show paginated inventory (includes both manufactured + purchased)
    }
  }, [inventory, filter, manufacturedInventory, purchasedInventory, manufacturedPagination.page, manufacturedPagination.limit, purchasedPagination.page, purchasedPagination.limit]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!productSearch || productSearch.trim() === '') {
      return products; // Show all products when search is empty
    }
    const searchLower = productSearch.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower)
    );
  }, [products, productSearch]);

  
  useEffect(() => {
    fetchInventory();
    fetchBranches();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [pagination.page, pagination.limit]);

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

  const fetchProducts = async () => {
    try {
      // Fetch purchased products
      const { data: purchasedProducts, error: purchasedError } = await supabase!
        .from('products')
        .select('id, name, sku, unit, cost_price, selling_price, low_stock_threshold')
        .eq('is_active', true);
      
      if (purchasedError) throw purchasedError;
      
      // Fetch manufactured products
      const { data: manufacturedProducts, error: manufacturedError } = await supabase!
        .from('manufactured_products')
        .select('id, name, sku, unit, cost_price, selling_price, low_stock_threshold');
      
      if (manufacturedError) throw manufacturedError;
      
      // Combine both product types
      const allProducts = [
        ...(purchasedProducts || []).map(p => ({ ...p, type: 'purchased' })),
        ...(manufacturedProducts || []).map(p => ({ ...p, type: 'manufactured' }))
      ];
      
      setProducts(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      
      // First get total count
      let countQuery = supabase!
        .from('inventory')
        .select('*', { count: 'exact', head: true });
      
      // Only filter by branch for non-admin users with valid branch_id
      if (user?.role !== 'admin' && user?.branch_id) {
        countQuery = countQuery.eq('branch_id', user.branch_id);
      }
      
      const { count: totalCount, error: countError } = await countQuery;
      if (countError) {
        console.error('Count error:', countError);
        throw countError;
      }
      
      // Fetch ALL inventory for filter counts (no pagination)
      let allInventoryQuery = supabase!
        .from('inventory')
        .select(`
          *,
          branches (id, name, location),
          products (id, name, sku, unit, cost_price, selling_price, low_stock_threshold),
          manufactured_products (id, name, sku, unit, cost_price, selling_price, low_stock_threshold)
        `)
        .order('last_updated', { ascending: false });
      
      // Only filter by branch for non-admin users with valid branch_id
      if (user?.role !== 'admin' && user?.branch_id) {
        allInventoryQuery = allInventoryQuery.eq('branch_id', user.branch_id);
      }

      
            
      // Create paginated query with same structure as allInventoryQuery
      let paginatedQuery = supabase!
        .from('inventory')
        .select(`
          *,
          branches (id, name, location),
          products (id, name, sku, unit, cost_price, selling_price, low_stock_threshold),
          manufactured_products (id, name, sku, unit, cost_price, selling_price, low_stock_threshold)
        `)
        .order('last_updated', { ascending: false })
        .range((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit - 1);
      
      // Only filter by branch for non-admin users with valid branch_id
      if (user?.role !== 'admin' && user?.branch_id) {
        paginatedQuery = paginatedQuery.eq('branch_id', user.branch_id);
      }
      
      // Fetch inventory and manufacturing orders data in parallel
      const [
        { data: allInventoryData, error: allInventoryError },
        { data: inventoryData, error: inventoryError },
        { data: manufacturingOrdersData, error: manufacturingOrdersError }
      ] = await Promise.all([
        allInventoryQuery,
        paginatedQuery,
        supabase!.from('manufacturing_orders').select('*')
      ]);

      if (allInventoryError || inventoryError) {
        console.error('Fetch error:', allInventoryError || inventoryError);
        throw allInventoryError || inventoryError;
      }

      
      // Update pagination state
      setPagination(prev => ({
        ...prev,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pagination.limit)
      }));

      // Process ALL inventory data for filter counts
      const enrichedTotalInventory = (allInventoryData || []).map((item) => {
        let source = 'purchased';
        let productName = 'Unknown';
        let displaySku = 'N/A';
        let productInfo = null;
        
        if (item.product_id && item.products) {
          // Use the products data for purchased products
          source = 'purchased';
          productName = item.products.name || 'Unknown';
          displaySku = item.products.sku || 'N/A';
          productInfo = item.products;
        } else if (item.manufactured_product_id && !item.product_id) {
          // For manufactured products, use manufacturing orders data
          source = 'manufactured';
          
          // Find the manufacturing order that matches this manufactured_product_id
          const manufacturingOrder = manufacturingOrdersData?.find(order => 
            order.finished_product_id === item.manufactured_product_id && 
            order.status === 'completed'
          );
          
          if (manufacturingOrder) {
            productName = manufacturingOrder.product_name || 'Manufactured Product';
            displaySku = manufacturingOrder.order_number || 'MFG-' + item.manufactured_product_id?.slice(0, 8) || 'N/A';
          } else {
            productName = 'Manufactured Product';
            displaySku = 'MFG-' + item.manufactured_product_id?.slice(0, 8) || 'N/A';
          }
        } else {
          // Handle orphaned items (both null)
          source = 'unknown';
          productName = 'Unknown Product';
          displaySku = 'N/A';
        }
        
        return {
          ...item,
          source: source,
          product_name: productName,
          display_sku: displaySku,
          product_info: productInfo
        };
      });

      // Process inventory data with simple, direct approach
      const enrichedInventory = (inventoryData || []).map((item: any) => {
        let source = 'purchased';
        let productName = 'Unknown';
        let displaySku = 'N/A';
        let productInfo = null;
        
        if (item.product_id && item.products) {
          // Use the products data for purchased products
          source = 'purchased';
          productName = item.products.name || 'Unknown';
          displaySku = item.products.sku || 'N/A';
          productInfo = item.products;
        } else if (item.manufactured_product_id && !item.product_id) {
          // For manufactured products, use manufacturing orders data
          source = 'manufactured';
          
          // Find the manufacturing order that matches this manufactured_product_id
          const manufacturingOrder = manufacturingOrdersData?.find(order => 
            order.finished_product_id === item.manufactured_product_id && 
            order.status === 'completed'
          );
          
          if (manufacturingOrder) {
            productName = manufacturingOrder.product_name || 'Manufactured Product';
            displaySku = manufacturingOrder.order_number || 'MFG-' + item.manufactured_product_id?.slice(0, 8) || 'N/A';
          } else {
            productName = 'Manufactured Product';
            displaySku = 'MFG-' + item.manufactured_product_id?.slice(0, 8) || 'N/A';
          }
        } else {
          // Handle orphaned items (both null)
          source = 'unknown';
          productName = 'Unknown Product';
          displaySku = 'N/A';
        }
        
        return {
          ...item,
          source,
          product_name: productName,
          display_sku: displaySku,
          product_info: item.products || null
        };
      });

      setInventory(enrichedInventory);
      setTotalInventory(enrichedTotalInventory);
      
      // Update pagination states for manufactured and purchased tabs
      setManufacturedPagination(prev => ({
        ...prev,
        total: manufacturedInventory.length,
        totalPages: Math.ceil(manufacturedInventory.length / prev.limit)
      }));
      
      setPurchasedPagination(prev => ({
        ...prev,
        total: purchasedInventory.length,
        totalPages: Math.ceil(purchasedInventory.length / prev.limit)
      }));
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    
        
    if (!selectedItem) {
      alertFunction('Please select an inventory item');
      return;
    }
    
    if (!adjustmentQuantity || adjustmentQuantity.trim() === '') {
      alertFunction('Please enter a quantity');
      return;
    }

    const qty = parseInt(adjustmentQuantity);
    if (isNaN(qty) || qty <= 0) {
      alertFunction('Please enter a valid quantity greater than 0');
      return;
    }

    try {
      const newQuantity = adjustmentType === 'add' 
        ? selectedItem.quantity + qty 
        : Math.max(0, selectedItem.quantity - qty);

      // Update inventory
      const { error: updateError } = await supabase!
        .from('inventory')
        .update({
          quantity: newQuantity
        })
        .eq('id', selectedItem.id);

      if (updateError) throw updateError;

      // Record stock movement
      const { error: movementError } = await supabase!
        .from('stock_movements')
        .insert({
          movement_number: `MV${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          type: 'adjustment',
          from_branch_id: selectedItem.branch_id,
          to_branch_id: selectedItem.branch_id,
          product_id: selectedItem.product_id,
          quantity: adjustmentType === 'add' ? qty : -qty,
          reference_id: selectedItem.id,
          reference_type: 'inventory',
          notes: `${adjustmentType === 'add' ? 'Stock added' : 'Stock removed'}: ${adjustmentNotes}`,
          created_by: user?.id
        });

      if (movementError) throw movementError;

      // Reset form and refresh
      setSelectedItem(null);
      setAdjustmentQuantity('');
      setAdjustmentNotes('');
      setShowAdjustForm(false);
      fetchInventory();
      
      alertFunction('Stock adjusted successfully!');
    } catch (error) {
      console.error('Error adjusting stock:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alertFunction(`Error adjusting stock: ${errorMessage}`);
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    // Get the appropriate product info and low_stock_threshold
    const productInfo = item.product_info || item.manufactured_products;
    const lowStockThreshold = productInfo?.low_stock_threshold || 0;
    
    if (item.quantity <= 0) return { color: 'bg-red-100 text-red-800', text: 'Out of Stock' };
    if (item.quantity <= lowStockThreshold) return { color: 'bg-yellow-100 text-yellow-800', text: 'Low Stock' };
    return { color: 'bg-green-100 text-green-800', text: 'In Stock' };
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inventoryForm.product_id || !inventoryForm.branch_id || !inventoryForm.quantity) {
      alertFunction('Please fill all fields');
      return;
    }

    try {
      // Find the selected product to determine its type
      const selectedProduct = products.find(p => p.id === inventoryForm.product_id);
      
      if (!selectedProduct) {
        alertFunction('Selected product not found');
        return;
      }

      // Prepare inventory data based on product type
      const inventoryData: any = {
        branch_id: inventoryForm.branch_id,
        quantity: parseInt(inventoryForm.quantity),
        last_updated: new Date().toISOString()
      };

      if (selectedProduct.type === 'manufactured') {
        inventoryData.manufactured_product_id = inventoryForm.product_id;
        inventoryData.product_id = null; // Ensure product_id is null for manufactured products
      } else {
        inventoryData.product_id = inventoryForm.product_id;
        inventoryData.manufactured_product_id = null; // Ensure manufactured_product_id is null for purchased products
      }

      const { error } = await supabase!
        .from('inventory')
        .upsert(inventoryData, {
          onConflict: selectedProduct.type === 'manufactured' ? 'manufactured_product_id,branch_id' : 'product_id,branch_id'
        });

      if (error) throw error;

      // Reset form and refresh
      setInventoryForm({
        product_id: '',
        branch_id: '',
        quantity: ''
      });
      setShowAddInventoryForm(false);
      fetchInventory();
      
      alertFunction('Inventory added successfully!');
    } catch (error) {
      console.error('Error adding inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alertFunction(`Error adding inventory: ${errorMessage}`);
    }
  };

  const handleInventoryFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInventoryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTransferFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTransferForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStockTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferForm.from_branch_id || !transferForm.to_branch_id || !transferForm.product_id || !transferForm.quantity) {
      alertFunction('Please fill all transfer fields');
      return;
    }

    if (transferForm.from_branch_id === transferForm.to_branch_id) {
      alertFunction('Cannot transfer to the same branch');
      return;
    }

    try {

      // Check if product exists at source branch
      const { data: sourceInventory, error: sourceError } = await supabase!
        .from('inventory')
        .select('quantity')
        .eq('branch_id', transferForm.from_branch_id)
        .or('product_id.eq.' + transferForm.product_id + ',manufactured_product_id.eq.' + transferForm.product_id)
        .single();

      if (sourceError || !sourceInventory) {
        alertFunction('Product not found at source branch');
        return;
      }

      const transferQuantity = parseInt(transferForm.quantity);
      if (sourceInventory.quantity < transferQuantity) {
        alertFunction(`Insufficient stock. Available: ${sourceInventory.quantity}, Requested: ${transferQuantity}`);
        return;
      }

      // Check if product already exists at destination branch
      const { data: destInventory, error: destError } = await supabase!
        .from('inventory')
        .select('quantity')
        .eq('branch_id', transferForm.to_branch_id)
        .or('product_id.eq.' + transferForm.product_id + ',manufactured_product_id.eq.' + transferForm.product_id)
        .single();

      const newDestQuantity = (destInventory?.quantity || 0) + transferQuantity;

      // Update source branch (subtract)
      const { error: updateSourceError } = await supabase!
        .from('inventory')
        .update({
          quantity: sourceInventory.quantity - transferQuantity,
          last_updated: new Date().toISOString()
        })
        .eq('branch_id', transferForm.from_branch_id)
        .or('product_id.eq.' + transferForm.product_id + ',manufactured_product_id.eq.' + transferForm.product_id);

      if (updateSourceError) throw updateSourceError;

      // Update destination branch (add or create)
      const { error: updateDestError } = await supabase!
        .from('inventory')
        .upsert({
          branch_id: transferForm.to_branch_id,
          product_id: transferForm.product_id,
          manufactured_product_id: transferForm.product_id.includes('mfg') ? transferForm.product_id : null,
          quantity: newDestQuantity,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'branch_id,product_id,manufactured_product_id'
        });

      if (updateDestError) throw updateDestError;

      // Record stock movement
      const { error: movementError } = await supabase!
        .from('stock_movements')
        .insert({
          movement_number: `TR${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          type: 'transfer',
          from_branch_id: transferForm.from_branch_id,
          to_branch_id: transferForm.to_branch_id,
          product_id: transferForm.product_id,
          quantity: transferQuantity,
          notes: `Stock transfer: ${transferForm.notes}`,
          created_by: user?.id
        });

      if (movementError) throw movementError;

      // Reset form and refresh
      setTransferForm({
        from_branch_id: '',
        to_branch_id: '',
        product_id: '',
        quantity: '',
        notes: ''
      });
      setShowTransferForm(false);
      fetchInventory();
      
      alertFunction('Stock transferred successfully!');
    } catch (error) {
      console.error('Error transferring stock:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alertFunction(`Error transferring stock: ${errorMessage}`);
    }
  };

  const handleDeleteInventory = async (item: InventoryItem) => {
    const productName = item.product_name || 'Unknown Product';
    
    const deleteInventory = async () => {
      try {
        const { error } = await supabase!
          .from('inventory')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
        
        fetchInventory();
        alertFunction('Inventory record deleted successfully!');
      } catch (error: any) {
        console.error('Error deleting inventory:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alertFunction(`Error deleting inventory: ${errorMessage}`);
      }
    };

    showConfirmation({
      title: 'Delete Inventory', 
      message: `Are you sure you want to delete the inventory record for "${productName}"? This action cannot be undone.`, 
      onConfirm: deleteInventory, 
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchInventory()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setShowAddInventoryForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Add Inventory
          </button>
          <button
            onClick={() => setShowAdjustForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Adjust Stock
          </button>
          <button
            onClick={() => setShowTransferForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Transfer Stock
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm">All</span>
            </div>
            <div className="ml-2 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Total Items</p>
              <p className="text-lg font-bold text-blue-600">{manufacturedInventory.length + purchasedInventory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm">MFG</span>
            </div>
            <div className="ml-2 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Manufactured</p>
              <p className="text-lg font-bold text-green-600">{manufacturedInventory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm">PUR</span>
            </div>
            <div className="ml-2 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Purchased</p>
              <p className="text-lg font-bold text-purple-600">{purchasedInventory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm">Low</span>
            </div>
            <div className="ml-2 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Low Stock</p>
              <p className="text-lg font-bold text-yellow-600">
                {totalInventory.filter(item => item.quantity > 0 && item.quantity <= (item.products?.low_stock_threshold || 0)).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm">Out</span>
            </div>
            <div className="ml-2 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Out of Stock</p>
              <p className="text-lg font-bold text-red-600">
                {totalInventory.filter(item => item.quantity <= 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm">💰</span>
            </div>
            <div className="ml-2 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Total Stock Value</p>
              <p className="text-lg font-bold text-indigo-600">
                ETB {(() => {
                  const total = totalInventory.reduce((total, item) => {
                    const costPrice = (item.products as any)?.cost_price || (item.manufactured_products as any)?.cost_price || 0;
                    return total + (costPrice * item.quantity);
                  }, 0);
                  return total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Current Stock Levels</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({totalInventory.length})
              </button>
              <button
                onClick={() => setFilter('manufactured')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'manufactured'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manufactured ({manufacturedInventory.length})
              </button>
              <button
                onClick={() => setFilter('purchased')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'purchased'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Purchased ({purchasedInventory.length})
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item) => {
                const status = getStockStatus(item);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900">
                        {item.product_info?.name || item.product_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">Min: {item.product_info?.low_stock_threshold || 0} {item.product_info?.unit || 'units'}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                        item.source === 'manufactured' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.source === 'manufactured' ? 'MFG' : 'PUR'}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                      {item.display_sku || 'N/A'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                      {item.branches?.name || 'Main Branch'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900">
                        {item.quantity} {item.products?.unit || 'units'}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-1 inline-flex text-xs leading-4 font-semibold rounded-full ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                      {new Date(item.last_updated).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowAdjustForm(true);
                          }}
                          className="text-green-600 hover:text-green-800 font-medium transition-colors"
                          title="Adjust stock"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            console.log('Delete button clicked for item:', item);
                            handleDeleteInventory(item);
                          }}
                          className="text-red-600 hover:text-red-800 font-medium transition-colors"
                          title="Delete inventory record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-700">
            <span className="text-xs">
              {filter === 'all' && (
                <>Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results</>
              )}
              {filter === 'manufactured' && (
                <>Showing {((manufacturedPagination.page - 1) * manufacturedPagination.limit) + 1} to {Math.min(manufacturedPagination.page * manufacturedPagination.limit, manufacturedPagination.total)} of {manufacturedPagination.total} results</>
              )}
              {filter === 'purchased' && (
                <>Showing {((purchasedPagination.page - 1) * purchasedPagination.limit) + 1} to {Math.min(purchasedPagination.page * purchasedPagination.limit, purchasedPagination.total)} of {purchasedPagination.total} results</>
              )}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (filter === 'all') {
                  setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
                } else if (filter === 'manufactured') {
                  setManufacturedPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
                } else if (filter === 'purchased') {
                  setPurchasedPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
                }
              }}
              disabled={
                (filter === 'all' && pagination.page === 1) ||
                (filter === 'manufactured' && manufacturedPagination.page === 1) ||
                (filter === 'purchased' && purchasedPagination.page === 1)
              }
              className="px-2 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, 
                filter === 'all' ? pagination.totalPages :
                filter === 'manufactured' ? manufacturedPagination.totalPages :
                purchasedPagination.totalPages
              ) }, (_, i) => {
                const pageNumber = i + 1;
                const currentPage = filter === 'all' ? pagination.page :
                                  filter === 'manufactured' ? manufacturedPagination.page :
                                  purchasedPagination.page;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => {
                      if (filter === 'all') {
                        setPagination(prev => ({ ...prev, page: pageNumber }));
                      } else if (filter === 'manufactured') {
                        setManufacturedPagination(prev => ({ ...prev, page: pageNumber }));
                      } else if (filter === 'purchased') {
                        setPurchasedPagination(prev => ({ ...prev, page: pageNumber }));
                      }
                    }}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      currentPage === pageNumber
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => {
                if (filter === 'all') {
                  setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }));
                } else if (filter === 'manufactured') {
                  setManufacturedPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }));
                } else if (filter === 'purchased') {
                  setPurchasedPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }));
                }
              }}
              disabled={
                (filter === 'all' && pagination.page === pagination.totalPages) ||
                (filter === 'manufactured' && manufacturedPagination.page === manufacturedPagination.totalPages) ||
                (filter === 'purchased' && purchasedPagination.page === purchasedPagination.totalPages)
              }
              className="px-2 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">📦</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Adjust Stock</h3>
                </div>
                <button
                  onClick={() => setShowAdjustForm(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleStockAdjustment} className="p-5 space-y-4">
              {selectedItem && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{selectedItem.product_info?.name || selectedItem.product_name || 'Unknown Product'}</p>
                  <p className="text-xs text-gray-500">
                    Current: {selectedItem.quantity} {selectedItem.product_info?.unit || 'units'} at {selectedItem.branches?.name || 'Unknown Branch'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('add')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      adjustmentType === 'add'
                        ? 'bg-green-100 text-green-800 border-2 border-green-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-gray-200'
                    }`}
                  >
                    ➕ Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('remove')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      adjustmentType === 'remove'
                        ? 'bg-red-100 text-red-800 border-2 border-red-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-gray-200'
                    }`}
                  >
                    ➖ Remove Stock
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Enter quantity"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  rows={2}
                  placeholder="Reason for adjustment..."
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAdjustForm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
                >
                  Adjust Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Inventory Modal */}
      {showAddInventoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-5 py-3 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">📦</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Add Inventory</h3>
                </div>
                <button
                  onClick={() => {
                    setShowAddInventoryForm(false);
                    setInventoryForm({
                      product_id: '',
                      branch_id: '',
                      quantity: ''
                    });
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddInventory} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  name="product_id"
                  value={inventoryForm.product_id}
                  onChange={(e) => {
                    handleInventoryFormChange(e);
                    // Don't set productSearch on selection to avoid filtering issues
                    setProductSearch('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  required
                >
                  <option value="">{productSearch && productSearch.trim() ? 'No matching products' : 'Select a product...'}</option>
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - {product.type === 'manufactured' ? 'Manufactured' : 'Purchased'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  name="branch_id"
                  value={inventoryForm.branch_id}
                  onChange={handleInventoryFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  required
                >
                  <option value="">Select a branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Initial Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={inventoryForm.quantity}
                  onChange={handleInventoryFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  placeholder="Enter initial quantity"
                  min="0"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddInventoryForm(false);
                    setInventoryForm({
                      product_id: '',
                      branch_id: '',
                      quantity: ''
                    });
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
                >
                  Add Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Stock Modal */}
      {showTransferForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-3 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🚚</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Transfer Stock</h3>
                </div>
                <button
                  onClick={() => setShowTransferForm(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleStockTransfer} className="p-5 space-y-4">
              {/* Transfer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    From Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="from_branch_id"
                    value={transferForm.from_branch_id}
                    onChange={handleTransferFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    required
                  >
                    <option value="">Select source branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} - {branch.location}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    To Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="to_branch_id"
                    value={transferForm.to_branch_id}
                    onChange={handleTransferFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    required
                  >
                    <option value="">Select destination branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} - {branch.location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  name="product_id"
                  value={transferForm.product_id}
                  onChange={handleTransferFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  required
                >
                  <option value="">Select product to transfer</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - {product.type === 'manufactured' ? 'Manufactured' : 'Purchased'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={transferForm.quantity}
                  onChange={handleTransferFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="Enter quantity to transfer"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Transfer Notes
                </label>
                <textarea
                  name="notes"
                  value={transferForm.notes}
                  onChange={handleTransferFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                  rows={3}
                  placeholder="Reason for transfer (optional)"
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferForm(false);
                    setTransferForm({
                      from_branch_id: '',
                      to_branch_id: '',
                      product_id: '',
                      quantity: '',
                      notes: ''
                    });
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
                >
                  Transfer Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
