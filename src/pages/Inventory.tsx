import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';

interface InventoryItem {
  id: string;
  product_id: string;
  branch_id: string;
  quantity: number;
  last_updated: string;
  products: {
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

  useEffect(() => {
    fetchInventory();
    fetchProducts();
    fetchBranches();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await supabase!
        .from('products')
        .select('id, name, sku, unit')
        .eq('is_active', true);
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
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

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase!
        .from('inventory')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            unit,
            low_stock_threshold
          ),
          branches (
            id,
            name
          )
        `)
        .order('last_updated', { ascending: false });

      if (error) {
        console.error('Fetch error:', error);
        throw error;
      }

      setInventory(data || []);
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
    if (item.quantity <= 0) return { color: 'bg-red-100 text-red-800', text: 'Out of Stock' };
    if (item.quantity <= item.products.low_stock_threshold) return { color: 'bg-yellow-100 text-yellow-800', text: 'Low Stock' };
    return { color: 'bg-green-100 text-green-800', text: 'In Stock' };
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inventoryForm.product_id || !inventoryForm.branch_id || !inventoryForm.quantity) {
      alert('Please fill all fields');
      return;
    }

    try {
      const { error } = await supabase!
        .from('inventory')
        .upsert({
          product_id: inventoryForm.product_id,
          branch_id: inventoryForm.branch_id,
          quantity: parseInt(inventoryForm.quantity),
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'product_id,branch_id'
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
    if (!confirm(`Are you sure you want to delete the inventory record for "${item.products.name}" at "${item.branches?.name || 'Unknown'}"? This action cannot be undone.`)) {
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

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">📦</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Total Items</p>
              <p className="text-xl font-bold text-gray-900">{inventory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">In Stock</p>
              <p className="text-xl font-bold text-green-600">
                {inventory.filter(item => item.quantity > item.products.low_stock_threshold).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Low Stock</p>
              <p className="text-xl font-bold text-yellow-600">
                {inventory.filter(item => item.quantity > 0 && item.quantity <= item.products.low_stock_threshold).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-xl">❌</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Out of Stock</p>
              <p className="text-xl font-bold text-red-600">
                {inventory.filter(item => item.quantity <= 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Current Stock Levels</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
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
              {inventory.map((item) => {
                const status = getStockStatus(item);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.products.name}</div>
                      <div className="text-xs text-gray-500">Min: {item.products.low_stock_threshold} {item.products.unit}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.products.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.branches?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.quantity} {item.products.unit}
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
                      {product.name} ({product.sku})
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
