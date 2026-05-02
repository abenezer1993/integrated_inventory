import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { alertFunction } from '../utils/alerts';

interface Purchase {
  id: string;
  order_number: string;
  supplier_name: string;
  supplier_contact?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  order_date: string;
  expected_delivery?: string;
  actual_delivery?: string;
  notes?: string;
  branch_id?: string;
}

const Purchases: React.FC = () => {
  const { supabase } = useSupabase();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    order_number: '',
    supplier_name: '',
    supplier_contact: '',
    product_name: '',
    quantity: 0,
    unit_price: 0,
    subtotal: 0,
    total_amount: 0,
    status: 'pending' as Purchase['status'],
    notes: ''
  });

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}${day}-${random}`;
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  useEffect(() => {
    // Auto-generate order number when form is opened for new purchase
    if (showAddForm && !editingPurchase) {
      setFormData(prev => ({
        ...prev,
        order_number: generateOrderNumber()
      }));
    }
  }, [showAddForm, editingPurchase]);

  useEffect(() => {
    // Calculate total amount when quantity or unit price changes
    const total = formData.quantity * formData.unit_price;
    setFormData(prev => ({ ...prev, total_amount: total }));
  }, [formData.quantity, formData.unit_price]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Calculate subtotal and total amount when quantity or unit price changes
    if (name === 'quantity' || name === 'unit_price') {
      const quantity = name === 'quantity' ? parseFloat(value) || 0 : formData.quantity;
      const unitPrice = name === 'unit_price' ? parseFloat(value) || 0 : formData.unit_price;
      const subtotal = quantity * unitPrice;
      
      setFormData(prev => ({
        ...prev,
        [name]: name === 'quantity' ? parseInt(value) || 0 : parseFloat(value) || 0,
        subtotal: subtotal,
        total_amount: subtotal
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const purchaseData = {
        ...formData
      };
      
      console.log('=== NEW CODE VERSION ===', new Date().toISOString());
      console.log('Submitting purchase data:', JSON.stringify(purchaseData, null, 2));
      console.log('Form status value:', formData.status);
      console.log('Status type:', typeof formData.status);
      console.log('Interface status type: pending|completed|cancelled');
      
      if (editingPurchase) {
        const { error } = await supabase
          .from('purchase_orders')
          .update(purchaseData)
          .eq('id', editingPurchase.id);
        
        if (error) throw error;
        alertFunction('Purchase order updated successfully!');
      } else {
        const { error } = await supabase
          .from('purchase_orders')
          .insert(purchaseData);
        
        if (error) throw error;
        alertFunction('Purchase order created successfully!');
      }
      
      setShowAddForm(false);
      setEditingPurchase(null);
      resetForm();
      fetchPurchases();
    } catch (error) {
      console.error('Error saving purchase:', error);
      alertFunction('Error saving purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      order_number: '',
      supplier_name: '',
      supplier_contact: '',
      product_name: '',
      quantity: 0,
      unit_price: 0,
      subtotal: 0,
      total_amount: 0,
      status: 'pending' as Purchase['status'],
      notes: ''
    });
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      order_number: purchase.order_number,
      supplier_name: purchase.supplier_name,
      supplier_contact: purchase.supplier_contact || '',
      product_name: purchase.product_name,
      quantity: purchase.quantity,
      unit_price: purchase.unit_price,
      subtotal: purchase.subtotal || 0,
      total_amount: purchase.total_amount,
      status: purchase.status,
      notes: purchase.notes || ''
    });
    setShowAddForm(true);
  };

  const handleStatusUpdate = async (id: string, newStatus: Purchase['status']) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'completed') {
        updateData.actual_delivery = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      alertFunction(`Purchase status updated to ${newStatus}`);
      fetchPurchases();
    } catch (error) {
      console.error('Error updating status:', error);
      alertFunction('Error updating purchase status');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      try {
        if (!supabase) {
          throw new Error('Supabase client not available');
        }
        
        const { error } = await supabase
          .from('purchase_orders')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        alertFunction('Purchase order deleted successfully');
        fetchPurchases();
      } catch (error) {
        console.error('Error deleting purchase:', error);
        alertFunction('Error deleting purchase order');
      }
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Purchase['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Purchase['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'completed': return '✅';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600">Manage supplier purchases and stock receiving</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Purchase Order
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Total Orders</p>
              <p className="text-xl font-bold text-gray-900">{purchases.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-xl">⏳</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Pending</p>
              <p className="text-xl font-bold text-yellow-600">
                {purchases.filter(p => p.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
                
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Completed</p>
              <p className="text-xl font-bold text-green-600">
                {purchases.filter(p => p.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by order number, supplier, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Purchase Orders</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading purchase orders...</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">
              <span className="text-4xl">📋</span>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No purchase orders found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Create your first purchase order to get started'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{purchase.order_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{purchase.supplier_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${purchase.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(purchase.status)}`}>
                        {getStatusIcon(purchase.status)} {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                      </span>
                    </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(purchase)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Edit
                        </button>
                        {purchase.status !== 'completed' && purchase.status !== 'cancelled' && (
                          <button
                            onClick={() => handleStatusUpdate(purchase.id, purchase.status === 'pending' ? 'completed' : 'completed')}
                            className="text-green-600 hover:text-green-900 font-medium"
                          >
                            Complete
                          </button>
                        )}
                        {purchase.status !== 'cancelled' && (
                          <button
                            onClick={() => handleStatusUpdate(purchase.id, 'cancelled')}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(purchase.id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Purchase Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm">🛒</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingPurchase ? 'Edit Purchase Order' : 'New Purchase Order'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
              <form onSubmit={handleAddPurchase} className="p-4 space-y-3">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Order Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          name="order_number"
                          value={formData.order_number}
                          onChange={handleInputChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm font-medium text-gray-900"
                          placeholder="PO-001"
                          readOnly
                          required
                        />
                        {!editingPurchase && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, order_number: generateOrderNumber() }))}
                            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm font-medium transition-colors"
                            title="Generate new order number"
                          >
                            🔄
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Supplier Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="supplier_name"
                        value={formData.supplier_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                        placeholder="Supplier Co."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="product_name"
                        value={formData.product_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                        placeholder="Product name"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="quantity"
                          value={formData.quantity}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                          placeholder="0"
                          min="0"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Unit Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="unit_price"
                          value={formData.unit_price}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Total Amount
                      </label>
                      <input
                        type="number"
                        value={formData.total_amount}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm font-medium text-gray-900"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Status <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                          required
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                                          </div>

                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 resize-none"
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`flex-1 px-4 py-2 rounded-md font-medium transition-all text-sm ${
                        isSubmitting
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {editingPurchase ? 'Updating...' : 'Creating...'}
                        </span>
                      ) : (
                        <span>{editingPurchase ? 'Update Order' : 'Create Order'}</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
