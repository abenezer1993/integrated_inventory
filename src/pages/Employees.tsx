import React, { useState, useEffect } from 'react';
import { alertFunction } from '../utils/alerts';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';
import { useConfirmation } from '../utils/confirmations';

interface Employee {
  id?: string;
  employee_id: string;
  full_name: string;
  phone: string;
  position: string;
  department: string;
  branch_id?: string;
  branch_name?: string;
  salary: number;
  salary_type: 'per_piece' | 'per_kare' | 'daily';
  hire_date: string;
  status: 'active' | 'inactive' | 'on_leave';
  created_at?: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

const Employees: React.FC = () => {
  const { supabase } = useSupabase();
  const { user, hasPermission } = useAuth();
  const { showConfirmation } = useConfirmation();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'departments'>('overview');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Form states
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    phone: '',
    job_type: 'gypsum' as const,
    branch_id: ''
  });

  useEffect(() => {
    console.log('Employees component mounted');
    testDatabaseConnection();
    fetchEmployees();
    fetchDepartments();
    fetchBranches();
  }, []);

  const testDatabaseConnection = async () => {
    try {
      console.log('Testing database connection...');
      
      // Test basic connection
      const { data, error } = await supabase!
        .from('branches')
        .select('count')
        .limit(1);
      
      console.log('Database connection test:', { data, error });
      
      if (error) {
        console.error('Database connection issue:', error);
      } else {
        console.log('Database connection OK');
      }
    } catch (error) {
      console.error('Database test error:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      console.log('Fetching employees...');
      
      // First check if table exists by doing a simple count
      const { count, error: countError } = await supabase!
        .from('employees')
        .select('*', { count: 'exact', head: true });
      
      console.log('Employees count check:', { count, error: countError });
      
      if (countError) {
        console.error('Employees table might not exist:', countError);
        setEmployees([]);
        setLoading(false);
        return;
      }
      
      // If table exists, fetch the data
      const { data, error } = await supabase!
        .from('employees')
        .select(`
          *,
          branches!inner(name)
        `)
        .order('created_at', { ascending: false });
      
      console.log('Employees fetch response:', { data: data?.length || 0, error });
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase!
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      console.log('Fetching branches...');
      const { data, error } = await supabase!
        .from('branches')
        .select('id, name, location')
        .eq('is_active', true);
      
      console.log('Branches response:', { data: data?.length || 0, error });
      
      if (error) throw error;
      setBranches(data || []);
    } catch (error: any) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('handleAddEmployee called');
    console.log('Form data:', formData);
    
    // Validation
    if (!formData.full_name || !formData.phone) {
      console.log('Validation failed - missing required fields');
      alertFunction('Please fill in all required fields');
      return;
    }
    
    try {
      console.log('Starting employee insertion...');
      
      // Generate auto employee ID
      const employeeId = `EMP${new Date().getFullYear()}${String(employees.length + 1).padStart(4, '0')}`;
      
      const employeeData = {
        employee_id: employeeId,
        full_name: formData.full_name,
        phone: formData.phone,
        position: formData.job_type === 'gypsum' ? 'Gypsum Worker' : 'Woodwork Worker',
        branch_id: formData.branch_id || null,
        job_type: formData.job_type,
        hire_date: new Date().toISOString()
      };
      
      console.log('Employee data to insert:', employeeData);
      
      const { data, error } = await supabase!
        .from('employees')
        .insert([employeeData]);

      console.log('Insert response:', { data: !!data, error });

      if (error) {
        console.error('Insert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Employee added successfully');
      alertFunction('Employee added successfully!');
      setShowAddModal(false);
      setFormData({
        employee_id: '',
        full_name: '',
        phone: '',
        job_type: 'gypsum' as const,
        branch_id: ''
      });
      fetchEmployees();
    } catch (error: any) {
      console.error('Error adding employee:', error);
      alertFunction('Error adding employee. Please try again.');
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    showConfirmation({
      title: 'Delete Employee',
      message: 'Are you sure you want to delete this employee? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const { error } = await supabase!
            .from('employees')
            .delete()
            .eq('id', employeeId);

          if (error) throw error;
          alertFunction('Employee deleted successfully!');
          fetchEmployees();
        } catch (error: any) {
          console.error('Error deleting employee:', error);
          alertFunction('Error deleting employee. Please try again.');
        }
      },
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
  };

  const handleUpdateStatus = async (employeeId: string, newStatus: 'active' | 'inactive' | 'on_leave') => {
    try {
      const { error } = await supabase!
        .from('employees')
        .update({ status: newStatus })
        .eq('id', employeeId);

      if (error) throw error;
      alertFunction(`Employee status updated to ${newStatus}!`);
      fetchEmployees();
    } catch (error: any) {
      console.error('Error updating employee status:', error);
      alertFunction('Error updating employee status. Please try again.');
    }
  };

  const getFilteredEmployees = () => {
    if (selectedDepartment === 'all') {
      return employees;
    }
    return employees.filter(emp => emp.department === selectedDepartment);
  };

  const getDepartmentStats = () => {
    return departments.map(dept => ({
      name: dept.name,
      count: employees.filter(emp => emp.department === dept.name).length,
      activeCount: employees.filter(emp => emp.department === dept.name && emp.status === 'active').length
    }));
  };

  const getOverallStats = () => {
    const activeCount = employees.filter(emp => emp.status === 'active').length;
    const onLeaveCount = employees.filter(emp => emp.status === 'on_leave').length;
    const inactiveCount = employees.filter(emp => emp.status === 'inactive').length;
    
    return {
      total: employees.length,
      active: activeCount,
      onLeave: onLeaveCount,
      inactive: inactiveCount,
      totalSalary: employees.reduce((sum, emp) => sum + (emp.salary || 0), 0)
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  console.log('Employees page - User state:', user);
  console.log('Employees page - User role:', user?.role);
  
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p>Please log in to access employee management.</p>
        </div>
      </div>
    );
  }

  const stats = getOverallStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage company employees and departments</p>
        </div>
        <button
          onClick={() => {
            console.log('Add Employee button clicked');
            setShowAddModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Add Employee
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'employees', label: 'All Employees', icon: '👥' },
            { id: 'departments', label: 'Departments', icon: '🏢' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={'py-2 px-1 border-b-2 font-medium text-sm ' + (
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Employee Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✓</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Employees</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏖</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">On Leave</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.onLeave}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Payroll</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ETB {stats.totalSalary.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Department Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Overview</h3>
              <div className="space-y-3">
                {getDepartmentStats().map((dept) => (
                  <div key={dept.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{dept.name}</p>
                      <p className="text-xs text-gray-500">{dept.count} employees</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-600">{dept.activeCount} active</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Hires */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Hires</h3>
              <div className="space-y-3">
                {employees
                  .filter(emp => emp.hire_date)
                  .sort((a, b) => new Date(b.hire_date).getTime() - new Date(a.hire_date).getTime())
                  .slice(0, 5)
                  .map((emp) => (
                    <div key={emp.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                        <p className="text-xs text-gray-500">{emp.position}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(emp.hire_date || '').toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          {/* Department Filter */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">All Employees</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Filter by Department:</span>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Employees Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
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
                  {getFilteredEmployees().length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <span className="text-3xl mb-2">👥</span>
                          <span>No employees found</span>
                          <span className="text-sm text-gray-400 mt-1">
                            {selectedDepartment === 'all' ? 'No employees in the system' : `No employees in ${selectedDepartment} department`}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    getFilteredEmployees().map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.employee_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.branch_name || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            employee.status === 'active' ? 'bg-green-100 text-green-800' :
                            employee.status === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {employee.status === 'active' ? 'Active' :
                             employee.status === 'on_leave' ? 'On Leave' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUpdateStatus(employee.id!, employee.status === 'active' ? 'inactive' : 'active')}
                              className="text-blue-600 hover:text-blue-900"
                              title="Toggle Status"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16m1.414 0L9.414 20H20a2 2 0 002-2V6a2 2 0 00-2-2h-7.414l-3.586-3.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(employee.id!)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Employee"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Departments</h3>
              <div className="space-y-3">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{dept.name}</p>
                      {dept.description && (
                        <p className="text-xs text-gray-500">{dept.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-600">
                        {getDepartmentStats().find(d => d.name === dept.name)?.count || 0} employees
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Department Form */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Department</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const deptData = {
                  name: formData.get('name'),
                  description: formData.get('description')
                };

                try {
                  const { error } = await supabase!
                    .from('departments')
                    .insert([deptData]);

                  if (error) throw error;
                  alertFunction('Department added successfully!');
                  fetchDepartments();
                  e.currentTarget.reset();
                } catch (error: any) {
                  console.error('Error adding department:', error);
                  alertFunction('Error adding department. Please try again.');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter department name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter department description"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Add Department
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
            <h3 className="text-lg font-bold mb-4">Add New Employee</h3>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Type *
                  </label>
                  <select
                    value={formData.job_type}
                    onChange={(e) => setFormData({...formData, job_type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="gypsum">Gypsum</option>
                    <option value="woodwork">Woodwork</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name} - {branch.location}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Add Employee
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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

export default Employees;
