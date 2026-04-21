import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { alertFunction } from '../utils/alerts';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';
import { useConfirmation } from '../utils/confirmations';
import { User, UserRole } from '../types';

const UserManagement: React.FC = () => {
  const { supabase, supabaseAdmin } = useSupabase();
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
    console.log('UserManagement component mounted/updated');
    console.log('Current user:', currentUser);
    console.log('Has manage_users permission:', hasPermission('manage_users'));
    
    // Temporarily bypass permission check for admin user
    const isAdminUser = currentUser?.role === 'admin';
    console.log('Is admin user:', isAdminUser);
    
    if (hasPermission('manage_users') || isAdminUser) {
      console.log('Permission check passed, calling fetchUsers and fetchBranches');
      fetchUsers();
      fetchBranches();
    } else {
      console.log('Permission check failed, not fetching data');
      setLoading(false); // Set loading to false if no permission
    }
  }, []);

  useEffect(() => {
    console.log('Loading state changed:', loading);
  }, [loading]);

  const fetchUsers = async () => {
    console.log('fetchUsers started');
    try {
      console.log('Fetching users...');
      console.log('supabaseAdmin available:', !!supabaseAdmin);
      console.log('supabase available:', !!supabase);
      
      // Always use admin client if available
      if (supabaseAdmin) {
        console.log('Using admin client for fetching');
        const { data, error } = await supabaseAdmin
          .from('users')
          .select(`
            *,
            branches (
              name,
              location
            )
          `)
          .order('created_at', { ascending: false });
        
        console.log('Admin client query completed');
        console.log('Admin client data:', data);
        console.log('Admin client error:', error);
        
        if (error) {
          console.error('Admin client fetch error:', error);
          setUsers([]);
          setLoading(false);
          return;
        }
        
        console.log('Fetched users with admin client:', data);
        console.log('Number of users:', data?.length || 0);
        setUsers(data || []);
        setLoading(false);
        return;
      }
      
      // Fallback to regular client
      console.log('Using regular client for fetching');
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
      
      console.log('Regular client query completed');
      console.log('Regular client data:', data);
      console.log('Regular client error:', error);
      
      if (error) {
        console.error('Regular client fetch error:', error);
        setUsers([]);
        setLoading(false);
        return;
      }
      
      console.log('Fetched users with regular client:', data);
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      console.log('fetchUsers completed, setting loading to false');
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
    
    console.log('handleAddUser called');
    console.log('Form data:', { email, name, role, branchId, password: '***' });
    console.log('Loading state:', loading);
    
    // Prevent multiple submissions
    if (loading) {
      console.log('Already creating user, skipping...');
      return;
    }
    
    // Enhanced validation
    if (!email || !name || !password) {
      console.log('Validation failed:', { email: !!email, name: !!name, password: !!password });
      alertFunction('Please fill in all required fields');
      return;
    }

    // Branch validation for non-admin roles
    if (role !== UserRole.ADMIN && !branchId) {
      console.log('Branch validation failed:', { role, branchId: !!branchId });
      alertFunction('Please select a branch for non-admin users');
      return;
    }

    console.log('Validation passed, starting user creation...');
    setLoading(true);
    console.log('Loading set to true, proceeding with user creation...');

    try {
      console.log('Step 1: Starting user creation');
      
      try {
        console.log('Step 2: Checking admin client');
        console.log('Supabase Admin available:', !!supabaseAdmin);
        
        // Check if admin client is available
        if (!supabaseAdmin) {
          console.error('Step 3: Admin client is null');
          alertFunction('Admin access not available. Please check service key configuration.');
          return;
        }
        
        console.log('Step 4: Admin client confirmed');
      } catch (err) {
        console.error('Step 4 ERROR:', err);
        return;
      }
      
      let userData: any = null;
      
      try {
        console.log('Step 5: Calling admin API');
        console.log('Email:', email);
        
        // Create user with admin API
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        });

        console.log('Step 6: Admin API completed');
        console.log('Response:', { data: !!data, error: !!error });

        if (error) {
          console.error('Step 7: Admin API error:', error);
          alertFunction('Error creating user: ' + error.message);
          return;
        }

        console.log('Step 8: User created successfully');
        console.log('User data:', data.user);
        userData = data.user;
      } catch (apiErr: any) {
        console.error('Step 5-8 API ERROR:', apiErr);
        alertFunction('API Error: ' + (apiErr.message || apiErr.toString()));
        return;
      }

      // Create profile using regular client (RLS should allow this)
      if (!userData) {
        console.error('Step 9: No user data returned');
        alertFunction('Error: No user data returned from API');
        return;
      }
      
      try {
        console.log('Step 10: Creating user profile with admin client');
        const { error: profileError } = await supabaseAdmin!
          .from('users')
          .insert({
            id: userData.id,
            email: userData.email || email,
            name,
            role,
            branch_id: role === UserRole.ADMIN ? null : branchId,
            is_active: true
          });

        if (profileError) {
          console.error('Step 11: Profile creation error:', profileError);
          alertFunction('Profile error: ' + profileError.message);
          return;
        }

        console.log('Step 12: Profile created successfully');
      } catch (profileErr: any) {
        console.error('Step 10-12 PROFILE ERROR:', profileErr);
        alertFunction('Profile Error: ' + (profileErr.message || profileErr.toString()));
        return;
      }

      console.log('Step 13: User creation completed successfully');
      alertFunction('User created successfully!');
      resetForm();
      
      // Add small delay to ensure database consistency
      setTimeout(async () => {
        console.log('Step 14: Refreshing users list after delay');
        await fetchUsers();
      }, 1000);

    } catch (error: any) {
      console.error('Unexpected error:', error);
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
      const clientToUse = supabaseAdmin || supabase;
      
      const { error } = await clientToUse!
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
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      onConfirm: async () => {
        try {
          console.log('Deleting user:', userId);
          
          // Use admin client for complete deletion
          if (!supabaseAdmin) {
            alertFunction('Admin access not available for deletion');
            return;
          }
          
          // First delete the user profile from database
          const { error: profileError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId);

          if (profileError) {
            console.error('Profile deletion error:', profileError);
            throw profileError;
          }

          console.log('User profile deleted successfully');

          // Then delete the auth user using admin API
          const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

          if (authError) {
            console.error('Auth user deletion error:', authError);
            // Profile is deleted, but auth user remains - warn user
            alertFunction('User profile deleted, but auth user still exists. Contact admin to clean up auth user.');
          } else {
            console.log('Auth user deleted successfully');
            alertFunction('User deleted completely!');
          }

          fetchUsers();
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
        <div className="flex space-x-3">
          <button
            onClick={fetchUsers}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Refresh Users
          </button>
          <button
            onClick={() => setShowAddUserForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add New User
          </button>
        </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                  <select
                    required
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
                  {!branchId && (
                    <p className="text-red-500 text-xs mt-1">Please select a branch</p>
                  )}
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
