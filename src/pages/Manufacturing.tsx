import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';
import { Product, ManufacturingOrder, ManufacturingExpense } from '../types';

const Manufacturing: React.FC = () => {
  const { supabase } = useSupabase();
  const { user, hasPermission } = useAuth();
  const [manufacturingOrders, setManufacturingOrders] = useState<ManufacturingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productName, setProductName] = useState('');

  console.log('🏭 Manufacturing component rendering');
  console.log('🏭 User in Manufacturing:', user);
  console.log('🏭 hasPermission function:', hasPermission);
  
  // Test permission check
  console.log('🏭 Testing manage_manufacturing permission:', hasPermission('manage_manufacturing'));

  useEffect(() => {
    fetchManufacturingOrders();
  }, []);

  const fetchManufacturingOrders = async () => {
    try {
      const { data } = await supabase!
        .from('manufacturing_orders')
        .select('*')
        .order('created_at', { ascending: false });

      setManufacturingOrders(data || []);
    } catch (error) {
      console.error('Error fetching manufacturing orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory || !productName || !quantity) {
      alert('Please fill in all required fields: category, product name, and quantity');
      return;
    }

    try {
      // Generate order number
      const orderNumber = `MFG${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      console.log('Creating manufacturing order:', {
        orderNumber,
        branch_id: user?.branch_id,
        product_name: productName,
        quantity_produced: parseInt(quantity),
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes,
        created_by: user?.id,
        product_category: selectedCategory
      });
      
      // Create manufacturing order
      const { data: orderData, error: orderError } = await supabase!
        .from('manufacturing_orders')
        .insert({
          order_number: orderNumber,
          branch_id: user?.branch_id,
          product_name: productName,
          quantity_produced: parseInt(quantity),
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: notes,
          product_category: selectedCategory
        })
        .select()
        .single();

      console.log('Order creation result:', { data: orderData, error: orderError });

      if (orderError) throw orderError;

      // Update inventory
      console.log('Updating inventory for product:', productName);
      const { data: inventoryData } = await supabase!
        .from('inventory')
        .select('*')
        .eq('product_name', productName)
        .eq('branch_id', user?.branch_id)
        .single();

      console.log('Inventory check result:', { data: inventoryData });

      if (!inventoryData) {
        console.log('Creating new inventory record');
        await supabase!
          .from('inventory')
          .insert({
            product_name: productName,
            branch_id: user?.branch_id,
            quantity: parseInt(quantity),
            last_updated: new Date().toISOString()
          });
      } else {
        console.log('Updating existing inventory');
        await supabase!
          .from('inventory')
          .update({
            quantity: inventoryData.quantity + parseInt(quantity),
            last_updated: new Date().toISOString()
          })
          .eq('product_name', productName)
          .eq('branch_id', user?.branch_id);
      }

      // Record stock movement
      console.log('Recording stock movement');
      const { data: stockMovement, error: stockMovementError } = await supabase!
        .from('stock_movements')
        .insert({
          movement_number: `MV${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          type: 'manufacturing',
          to_branch_id: user?.branch_id,
          product_name: productName,
          quantity: parseInt(quantity),
          reference_id: orderData.id,
          reference_type: 'manufacturing_order',
          notes: `Production: ${notes || 'Manufactured product added to inventory'}`
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
      setShowAddForm(false);
      fetchManufacturingOrders();
      
      alert('Production recorded successfully!');
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
      
      alert(errorMessage);
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

      {/* Production Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🏭</span>
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
              <span className="text-2xl">📦</span>
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
              <span className="text-2xl">📈</span>
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
                  Category
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
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {order.product_category === 'gypsum' ? 'Gypsum Work' : order.product_category === 'wood' ? 'Wood Work' : 'N/A'}
                    </span>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
