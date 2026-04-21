import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { alertFunction } from '../utils/alerts';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';
import { useConfirmation } from '../utils/confirmations';
import { User, UserRole } from '../types';

const UserManagement: React.FC = () => {
  const { supabase } = useSupabase();
  const { user: currentUser, hasPermission } = useAuth();
  const { showConfirmation } = useConfirmation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.SALES_STAFF);
  const [branchId, setBranchId] = useState('');
  const [password, setPassword] = useState('');
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    if (hasPermission('manage_users')) {
      fetchUsers();
      fetchBranches();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch real users from database only
      const { data, error } = await supabase!
        .from('users')
        .select(`
          *,
          branches (
            name,
            location
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Database fetch error:', error);
        // If RLS blocks, show empty state with message
        setUsers([]);
        return;
      }
      
      console.log('Fetched users from database:', data);
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await supabase!
        .from('branches')
        .select('*')
        .eq('is_active', true);
      
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!email || !name || !password) {
      alertFunction('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      console.log('Creating user...');
      
      // Create user with admin API
      const { data, error } = await supabase!.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (error) {
        alertFunction('Error: ' + error.message);
        return;
      }

      // Create profile
      const { error: profileError } = await supabase!
        .from('users')
        .insert({
          id: data.user!.id,
          email: data.user!.email!,
          name,
          role,
          branch_id: role === UserRole.ADMIN ? null : branchId,
          is_active: true
        });

      if (profileError) {
        alertFunction('Profile error: ' + profileError.message);
        return;
      }

      alertFunction('User created successfully!');
      resetForm();
      await fetchUsers();

    } catch (error: any) {
      alertFunction('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser || !email || !name) {
      alertFunction('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase!
        .from('users')
        .update({
          email,
          name,
          role,
          branch_id: role === UserRole.ADMIN ? null : branchId || null
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setEditingUser(null);
      setEmail('');
      setName('');
      setRole(UserRole.SALES_STAFF);
      setBranchId('');
      
      fetchUsers();
      alertFunction('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alertFunction('Error updating user. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    showConfirmation({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user?',
      onConfirm: async () => {
        try {
          console.log('Deleting user:', userId);
          
          // Delete user profile from database
          const { error: profileError } = await supabase!
            .from('users')
            .delete()
            .eq('id', userId);

          if (profileError) {
            console.error('Profile deletion error:', profileError);
            throw profileError;
          }

          console.log('User profile deleted successfully');

          // Note: Auth user deletion would require admin API
          // For now, just delete the profile
          fetchUsers();
          alertFunction('User deleted successfully!');
        } catch (error) {
          console.error('Error deleting user:', error);
          alertFunction('Error deleting user. Please try again.');
        }
      },
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
  };

  const openEditForm = (user: User) => {
    setEditingUser(user);
    setEmail(user.email);
    setName(user.name);
    setRole(user.role);
    setBranchId(user.branch_id || '');
    setShowAddUserForm(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setEmail('');
    setName('');
    setRole(UserRole.SALES_STAFF);
    setBranchId('');
    setPassword('');
    setShowAddUserForm(false);
  };

  if (!hasPermission('manage_users')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
        <button
          onClick={() => setShowAddUserForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Add New User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === UserRole.ADMIN 
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === UserRole.BRANCH_MANAGER
                        ? 'bg-blue-100 text-blue-800'
                        : user.role === UserRole.SALES_STAFF
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {user.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(user as any).branches?.name || 'All Branches'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openEditForm(user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showAddUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            
                        
            <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    email && (!email.includes('@') || !email.includes('.')) ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
                {email && (!email.includes('@') || !email.includes('.')) && (
                  <p className="text-red-500 text-xs mt-1">Please enter a valid email address</p>
                )}
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      password && password.length < 6 ? 'border-red-300' : 'border-gray-300'
                    }`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                  />
                  {password && password.length < 6 && (
                    <p className="text-red-500 text-xs mt-1">Password must be at least 6 characters</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value={UserRole.ADMIN}>Admin</option>
                  <option value={UserRole.BRANCH_MANAGER}>Branch Manager</option>
                  <option value={UserRole.SALES_STAFF}>Sales Staff</option>
                  <option value={UserRole.WAREHOUSE_STAFF}>Warehouse Staff</option>
                </select>
              </div>

              {role !== UserRole.ADMIN && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} - {branch.location}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    editingUser ? 'Update User' : 'Create User'
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
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

export default UserManagement;
