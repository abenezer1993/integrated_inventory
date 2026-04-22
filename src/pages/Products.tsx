import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { alertFunction } from '../utils/alerts';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';
import { useConfirmation } from '../utils/confirmations';
import { Product, ProductCategory } from '../types';

const Products: React.FC = () => {
  const { supabase } = useSupabase();
  const { hasPermission } = useAuth();
  const { showConfirmation } = useConfirmation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const productsPerPage = 15;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    description: '',
    unit: '',
    cost_price: '',
    low_stock_threshold: '10'
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, debouncedSearchTerm]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching products with search term:', debouncedSearchTerm);
      
      // Build query with search
      let queryBuilder = supabase!
        .from('products')
        .select(`
          *,
          product_categories (
            name
          )
        `)
        .eq('is_active', true);
      
      // Add search filter if search term exists
      if (debouncedSearchTerm.trim()) {
        const searchFilter = `name.ilike.%${debouncedSearchTerm}%,sku.ilike.%${debouncedSearchTerm}%,description.ilike.%${debouncedSearchTerm}%`;
        console.log('🔍 Applying search filter:', searchFilter);
        queryBuilder = queryBuilder.or(searchFilter);
      }
      
      // Get paginated products
      const from = (currentPage - 1) * productsPerPage;
      const to = from + productsPerPage - 1;
      
      console.log('🔍 Query range:', from, 'to', to);
      
      const { data, error } = await queryBuilder
        .order('created_at', { ascending: false })
        .range(from, to);
      
      // Get total count separately for pagination
      let countQuery = supabase!
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (debouncedSearchTerm.trim()) {
        countQuery = countQuery.or(
          `name.ilike.%${debouncedSearchTerm}%,sku.ilike.%${debouncedSearchTerm}%,description.ilike.%${debouncedSearchTerm}%`
        );
      }
      
      const { count: totalCount } = await countQuery;
      
      console.log('🔍 Query results:', { data: data?.length || 0, totalCount, error });
      
      if (error) throw error;
      setProducts(data || []);
      setTotalProducts(totalCount || 0);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase!
        .from('product_categories')
        .select('*');
      
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const addMissingCategories = async (existingCategories: any[]) => {
    try {
      const defaultCategories = [
        { name: 'Cement & Concrete' },
        { name: 'Steel & Metal' },
        { name: 'Wood & Timber' },
        { name: 'Paints & Coatings' },
        { name: 'Electrical & Lighting' },
        { name: 'Plumbing & Pipes' },
        { name: 'Tools & Equipment' },
        { name: 'Roofing Materials' },
        { name: 'Insulation' },
        { name: 'Hardware & Fasteners' },
        { name: 'Glass & Windows' },
        { name: 'Flooring' },
        { name: 'Doors & Windows' },
        { name: 'Adhesives & Sealants' },
        { name: 'Safety Equipment' },
        { name: 'Raw Materials' },
        { name: 'Packaging Materials' }
      ];

      const existingNames = existingCategories.map(cat => cat.name);
      const missingCategories = defaultCategories.filter(
        cat => !existingNames.includes(cat.name)
      );

      if (missingCategories.length > 0) {
        const { error } = await supabase!
          .from('product_categories')
          .insert(missingCategories);

        if (error) {
          console.error('Error adding missing categories:', error);
        } else {
          console.log(`${missingCategories.length} new categories added successfully`);
        }
      } else {
        console.log('All construction categories already exist');
      }
    } catch (error) {
      console.error('Error in addMissingCategories:', error);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Adding product:', formData);
      
      const { data, error } = await supabase!
        .from('products')
        .insert({
          name: formData.name,
          sku: formData.sku || `PRD${Date.now()}`,
          category_id: formData.category_id || null,
          description: formData.description,
          unit: formData.unit,
          cost_price: parseFloat(formData.cost_price) || 0,
          low_stock_threshold: parseInt(formData.low_stock_threshold)
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Product added successfully:', data);

      // Reset form and refresh data
      resetForm();
      setShowAddForm(false);
      
      // Wait a moment then refresh
      setTimeout(() => {
        fetchProducts();
      }, 500);
      
      alertFunction('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alertFunction(`Error adding product: ${errorMessage}`);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category_id: product.category_id || '',
      description: product.description || '',
      unit: product.unit,
      cost_price: product.cost_price?.toString() || '',
      low_stock_threshold: product.low_stock_threshold?.toString() || '10'
    });
    setShowAddForm(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProduct) return;
    
    try {
      const { data, error } = await supabase!
        .from('products')
        .update({
          name: formData.name,
          sku: formData.sku,
          category_id: formData.category_id || null,
          description: formData.description,
          unit: formData.unit,
          cost_price: parseFloat(formData.cost_price) || 0,
          low_stock_threshold: parseInt(formData.low_stock_threshold)
        })
        .eq('id', editingProduct.id)
        .select()
        .single();

      if (error) throw error;

      resetForm();
      setShowAddForm(false);
      setEditingProduct(null);
      
      setTimeout(() => {
        fetchProducts();
      }, 500);
      
      alertFunction('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alertFunction(`Error updating product: ${errorMessage}`);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    console.log('Delete function called for product:', product);
    
    const deleteProduct = async () => {
      console.log('Delete confirmed for product:', product.id);
      try {
        // First, delete related stock movements
        const { error: stockError } = await supabase!
          .from('stock_movements')
          .delete()
          .eq('product_id', product.id);

        if (stockError) {
          console.error('Error deleting stock movements:', stockError);
          throw stockError;
        }

        console.log('Stock movements deleted, now deleting product...');
        
        // Then delete the product
        const { error } = await supabase!
          .from('products')
          .delete()
          .eq('id', product.id);

        if (error) {
          console.error('Error deleting product:', error);
          throw error;
        }
        
        setTimeout(() => {
          fetchProducts();
        }, 500);
        
        alertFunction('Product deleted successfully!');
      } catch (error: any) {
        console.error('Error deleting product:', error);
        
        // Handle specific constraint violations
        let errorMessage = 'Unknown error occurred';
        
        if (error?.code === '23503') {
          errorMessage = 'Cannot delete product: It is referenced by other records (sales, manufacturing orders, etc.). Please deactivate product instead.';
        } else if (error?.code === 'PGRST116') {
          errorMessage = 'Product not found or already deleted.';
        } else if (error?.message) {
          if (error.message.includes('violates foreign key constraint') || 
              error.message.includes('is still referenced') ||
              error.message.includes('still referenced')) {
            errorMessage = 'Cannot delete product: It is referenced by other records (sales, manufacturing orders, etc.). Please deactivate product instead.';
          } else {
            errorMessage = error.message;
          }
        }
        
        alertFunction(`Error deleting product: ${errorMessage}`);
      }
    };

    console.log('Showing confirmation dialog...');
    showConfirmation({
      title: 'Delete Product', 
      message: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`, 
      onConfirm: deleteProduct, 
      type: 'danger', 
      confirmText: 'Delete', 
      cancelText: 'Cancel'
    });
  };

  const handleDeactivateProduct = async (product: Product) => {
    showConfirmation({title: 'Deactivate Product', message: `Are you sure you want to deactivate "${product.name}"? It will no longer be available for new transactions but will remain in existing records.`, onConfirm: () => {}, type: 'warning', confirmText: 'Deactivate', cancelText: 'Cancel'});
    return;
    
    try {
      const { error } = await supabase!
        .from('products')
        .update({ is_active: false })
        .eq('id', product.id);

      if (error) throw error;
      
      setTimeout(() => {
        fetchProducts();
      }, 500);
      
      alertFunction('Product deactivated successfully!');
    } catch (error: any) {
      console.error('Error deactivating product:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alertFunction(`Error deactivating product: ${errorMessage}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category_id: '',
      description: '',
      unit: '',
      cost_price: '',
      low_stock_threshold: '10'
    });
    setEditingProduct(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
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
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        {hasPermission('manage_products') && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Product
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search products by name, SKU, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {debouncedSearchTerm && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {totalProducts} result{totalProducts !== 1 ? 's' : ''} found
              </span>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedSearchTerm('');
                }}
                className="ml-2 text-gray-500 hover:text-gray-700"
                title="Clear search"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Alert
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(product as any).product_categories?.name || 'Uncategorized'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ETB {product.cost_price?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.low_stock_threshold}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      Purchased
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      {hasPermission('manage_products') && (
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                          title="Edit product"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {hasPermission('manage_products') && (
                        <button
                          onClick={() => handleDeactivateProduct(product)}
                          className="text-orange-600 hover:text-orange-800 font-medium text-sm transition-colors"
                          title="Deactivate product"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                      {hasPermission('manage_products') && (
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors"
                          title="Delete product"
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

      {/* Pagination */}
      {totalProducts > productsPerPage && (
        <div className="bg-white rounded-xl shadow-lg p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * productsPerPage) + 1} to {Math.min(currentPage * productsPerPage, totalProducts)} of {totalProducts} products
              {debouncedSearchTerm && (
                <span className="ml-2 text-blue-600">
                  (filtered from search)
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.ceil(totalProducts / productsPerPage) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalProducts / productsPerPage)))}
                disabled={currentPage === Math.ceil(totalProducts / productsPerPage)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Show message when no products found */}
      {!loading && products.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-gray-500">
            {debouncedSearchTerm ? (
              <>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No products match your search for "{debouncedSearchTerm}"
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearchTerm('');
                  }}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 5a2 2 0 002 2h8a2 2 0 002-2v-5a2 2 0 00-2-2h-8a2 2 0 00-2 2v5z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first product.
                </p>
                {hasPermission('manage_products') && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Product
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">
                      {editingProduct ? '✏️' : '📦'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {editingProduct ? 'Edit Product' : 'Add Product'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    placeholder="e.g., Cement Blocks"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      placeholder="Auto-gen"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      required
                    >
                      <option value="">Select</option>
                      <option value="pieces">Pieces</option>
                      <option value="bags">Bags</option>
                      <option value="kg">Kg</option>
                      <option value="tons">Tons</option>
                      <option value="meters">Meters</option>
                      <option value="liters">Liters</option>
                      <option value="gallons">Gallons</option>
                      <option value="boxes">Boxes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Cost Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="cost_price"
                    value={formData.cost_price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-sm"
                    rows={3}
                  />
                  </div>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
