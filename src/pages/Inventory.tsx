import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';

interface InventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  branch_id: string;
  quantity: number;
  last_updated: string;
  source: 'manufactured' | 'purchased';
  display_sku: string;
  products: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    low_stock_threshold: number;
  };
  manufactured_products: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    low_stock_threshold: number;
  };
  branches: {
    id: string;
    name: string;
  };
  product_info: any;
}

const Inventory: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [showAddInventoryForm, setShowAddInventoryForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [inventoryForm, setInventoryForm] = useState({
    product_id: '',
    branch_id: '',
    quantity: ''
  });
  const [filter, setFilter] = useState<'all' | 'manufactured' | 'purchased'>('all');

  // Filter inventory based on selected source
  const filteredInventory = inventory.filter(item => {
    if (filter === 'all') return true;
    return item.source === filter;
  });

  const manufacturedInventory = inventory.filter(item => item.source === 'manufactured');
  const purchasedInventory = inventory.filter(item => item.source === 'purchased');

  useEffect(() => {
    fetchInventory();
    fetchBranches();
  }, []);

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

  const fetchInventory = async () => {
    try {
      setLoading(true);
      
      // Fetch inventory records first
      const { data: inventoryData, error: inventoryError } = await supabase!
        .from('inventory')
        .select(`
          *,
          branches (id, name, location)
        `)
        .order('last_updated', { ascending: false });

      if (inventoryError) {
        console.error('Fetch error:', inventoryError);
        throw inventoryError;
      }

      console.log('Raw inventory data:', inventoryData);
      console.log('Inventory items with product_id:', inventoryData?.filter(item => item.product_id));
      console.log('Inventory items with manufactured_product_id:', inventoryData?.filter(item => item.manufactured_product_id));

      // Fetch all manufactured products at once to avoid RLS issues
      let allManufacturedProducts: any[] = [];
      try {
        console.log('Fetching manufactured products...');
        const { data: mfgProducts, error: directError } = await supabase!
          .from('manufactured_products')
          .select('id, name, sku, unit, cost_price, selling_price, low_stock_threshold');
        
        if (directError) {
          console.log('Direct fetch error:', directError);
          throw directError;
        }
        
        allManufacturedProducts = mfgProducts || [];
        console.log('Direct fetch manufactured products:', allManufacturedProducts);
        
        // If direct fetch returns empty, try RPC as fallback
        if (allManufacturedProducts.length === 0) {
          console.log('Direct fetch returned empty, trying RPC...');
          try {
            const { data: rpcProducts, error: rpcError } = await supabase!.rpc('get_all_manufactured_products_for_dropdown');
            if (rpcError) {
              console.log('RPC error:', rpcError);
            } else {
              allManufacturedProducts = rpcProducts || [];
              console.log('RPC manufactured products:', allManufacturedProducts);
            }
          } catch (rpcError) {
            console.log('RPC also failed:', rpcError);
          }
        }
      } catch (mfgError) {
        console.log('Could not fetch manufactured products directly, trying RPC:', mfgError);
        // Try RPC as fallback
        try {
          const { data: rpcProducts, error: rpcError } = await supabase!.rpc('get_all_manufactured_products_for_dropdown');
          if (rpcError) {
            console.log('RPC error:', rpcError);
          } else {
            allManufacturedProducts = rpcProducts || [];
            console.log('RPC manufactured products:', allManufacturedProducts);
          }
        } catch (rpcError) {
          console.log('RPC also failed:', rpcError);
        }
      }

      // Fetch manufacturing orders to get order numbers for manufactured products
      let manufacturingOrders: any[] = [];
      try {
        console.log('Fetching manufacturing orders...');
        const { data: orders } = await supabase!
          .from('manufacturing_orders')
          .select('id, order_number, product_name');
        manufacturingOrders = orders || [];
        console.log('Manufacturing orders:', manufacturingOrders);
      } catch (orderError) {
        console.log('Could not fetch manufacturing orders:', orderError);
      }

      // Wait for all data to be available before processing
      console.log('Starting inventory processing with:');
      console.log('- Manufactured products count:', allManufacturedProducts.length);
      console.log('- Manufacturing orders count:', manufacturingOrders.length);

      // Then fetch product details for each inventory item
      const enrichedInventory = await Promise.all((inventoryData || []).map(async (item) => {
        console.log('Processing inventory item:', item);
        
        let productInfo = null;
        let source = 'purchased';
        let displaySku = null;
        
        if (item.manufactured_product_id) {
          console.log('Found manufactured_product_id:', item.manufactured_product_id);
          console.log('Available manufactured products in cache:', allManufacturedProducts.map(p => ({ id: p.id, name: p.name })));
          
          // Find the product in our cached list
          const mfgProduct = allManufacturedProducts.find((p: any) => p.id === item.manufactured_product_id);
          
          console.log('Manufactured product data (cache):', mfgProduct);
          console.log('Looking for ID:', item.manufactured_product_id, 'in cache of length:', allManufacturedProducts.length);
          
          if (mfgProduct) {
            productInfo = mfgProduct;
            source = 'manufactured';
            
            // Find the manufacturing order to get the order number as SKU
            console.log('Looking for manufacturing order for product:', mfgProduct.name);
            console.log('Available manufacturing orders:', manufacturingOrders.map(o => ({ name: o.product_name, order_number: o.order_number })));
            
            const manufacturingOrder = manufacturingOrders.find(order => order.product_name === mfgProduct.name);
            console.log('Found manufacturing order:', manufacturingOrder);
            
            if (manufacturingOrder) {
              displaySku = manufacturingOrder.order_number;
              console.log('Using order number as SKU:', displaySku);
            } else {
              displaySku = mfgProduct.sku || 'N/A';
              console.log('No order found, using product SKU:', displaySku);
            }
            
            console.log('Set source to manufactured, SKU:', displaySku);
          } else {
            // Even if we can't find the product details, if it has manufactured_product_id, it's manufactured
            source = 'manufactured';
            productInfo = { name: 'Unknown Manufactured Product' };
            displaySku = 'N/A';
            console.log('Product not found in cache but has manufactured_product_id, setting source to manufactured');
          }
        } else if (item.product_id) {
          console.log('Found product_id:', item.product_id);
          // Fetch purchased product details
          const { data: prodData } = await supabase!
            .from('products')
            .select('id, name, sku, unit, cost_price, selling_price, low_stock_threshold')
            .eq('id', item.product_id)
            .single();
          
          console.log('Purchased product data:', prodData);
          
          if (prodData) {
            productInfo = prodData;
            source = 'purchased';
            displaySku = prodData.sku;
            console.log('Set source to purchased');
          }
        } else {
          console.log('No product_id or manufactured_product_id found');
        }
        
        console.log(`Final Product: ${productInfo?.name}, Source: ${source}, SKU: ${displaySku}`);
        return {
          ...item,
          source: source,
          product_name: productInfo?.name || 'Unknown',
          display_sku: displaySku || 'N/A',
          product_info: productInfo
        };
      }));

      console.log('Enriched inventory:', enrichedInventory);

      setInventory(enrichedInventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Adjustment form data:', {
      selectedItem,
      adjustmentQuantity,
      adjustmentType,
      adjustmentNotes
    });
    
    if (!selectedItem) {
      alert('Please select an inventory item');
      return;
    }
    
    if (!adjustmentQuantity || adjustmentQuantity.trim() === '') {
      alert('Please enter a quantity');
      return;
    }

    const qty = parseInt(adjustmentQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity greater than 0');
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
      
      alert('Stock adjusted successfully!');
    } catch (error) {
      console.error('Error adjusting stock:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error adjusting stock: ${errorMessage}`);
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
      alert('Please fill all fields');
      return;
    }

    try {
      // Find the selected product to determine its type
      const selectedProduct = products.find(p => p.id === inventoryForm.product_id);
      
      if (!selectedProduct) {
        alert('Selected product not found');
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
      
      alert('Inventory added successfully!');
    } catch (error) {
      console.error('Error adding inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error adding inventory: ${errorMessage}`);
    }
  };

  const handleInventoryFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInventoryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDeleteInventory = async (item: InventoryItem) => {
    const productName = item.product_name || 'Unknown Product';
    if (!confirm(`Are you sure you want to delete the inventory record for "${productName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const { error } = await supabase!
        .from('inventory')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      
      fetchInventory();
      alert('Inventory record deleted successfully!');
    } catch (error) {
      console.error('Error deleting inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error deleting inventory: ${errorMessage}`);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600">Manage stock levels across all locations</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => fetchInventory()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
            title="Refresh inventory"
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
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm">All</span>
            </div>
            <div className="ml-2 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Total Items</p>
              <p className="text-lg font-bold text-blue-600">{inventory.length}</p>
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
                {inventory.filter(item => item.quantity > 0 && item.quantity <= (item.products?.low_stock_threshold || 0)).length}
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
                {inventory.filter(item => item.quantity <= 0).length}
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
                All ({inventory.length})
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item) => {
                const status = getStockStatus(item);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.product_info?.name || item.product_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">Min: {item.product_info?.low_stock_threshold || 0} {item.product_info?.unit || 'units'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.source === 'manufactured' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.source === 'manufactured' ? 'Manufactured' : 'Purchased'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.display_sku || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.branches?.name || 'Main Branch'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.quantity} {item.products?.unit || 'units'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.last_updated).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-2">
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
                          onClick={() => handleDeleteInventory(item)}
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
                  <p className="text-sm font-medium text-gray-900">{selectedItem.products.name}</p>
                  <p className="text-xs text-gray-500">
                    Current: {selectedItem.quantity} {selectedItem.products.unit} at {selectedItem.branches?.name}
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
                  onChange={handleInventoryFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  required
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
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
    </div>
  );
};

export default Inventory;
