import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext-debug';
import { useSupabase } from '../contexts/SupabaseContext';

interface AccessLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  action: string;
  resource: string;
  resource_id: string;
  method: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  details?: any;
}

const AccessLogs: React.FC = () => {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: '',
    user: '',
    date: '',
    limit: 50
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    totalCount: 0
  });

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLogs();
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [pagination.page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const offset = (pagination.page - 1) * filter.limit;
      
      // First, get total count
      let countQuery = supabase!
        .from('access_logs')
        .select('*', { count: 'exact', head: true });

      // Apply filters to count query
      if (filter.action) {
        countQuery = countQuery.ilike('action', `%${filter.action}%`);
      }
      if (filter.user) {
        countQuery = countQuery.ilike('user_name', `%${filter.user}%`);
      }
      if (filter.date) {
        const startDate = new Date(filter.date);
        const endDate = new Date(filter.date);
        endDate.setHours(23, 59, 59, 999);
        countQuery = countQuery.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
      }

      const { count: totalCount, error: countError } = await countQuery;
      if (countError) throw countError;

      // Then get paginated data
      let query = supabase!
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + filter.limit - 1);

      // Apply filters to data query
      if (filter.action) {
        query = query.ilike('action', `%${filter.action}%`);
      }
      if (filter.user) {
        query = query.ilike('user_name', `%${filter.user}%`);
      }
      if (filter.date) {
        const startDate = new Date(filter.date);
        const endDate = new Date(filter.date);
        endDate.setHours(23, 59, 59, 999);
        query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setLogs(data || []);
      setPagination(prev => ({
        ...prev,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / filter.limit)
      }));
    } catch (error: any) {
      console.error('Error fetching access logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return 'bg-green-100 text-green-800';
      case 'update':
      case 'edit':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'login':
        return 'bg-purple-100 text-purple-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return '➕';
      case 'update':
      case 'edit':
        return '✏️';
      case 'delete':
        return '🗑️';
      case 'login':
        return '🔑';
      case 'logout':
        return '🚪';
      default:
        return '📝';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportLogs = () => {
    const csv = [
      ['Date', 'User', 'Action', 'Resource', 'IP Address', 'User Agent'],
      ...logs.map(log => [
        formatDate(log.created_at),
        log.user_name,
        log.action,
        log.resource,
        log.ip_address,
        log.user_agent
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Logs</h1>
        <p className="text-gray-600">Monitor and track all system activities</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Filter
            </label>
            <input
              type="text"
              value={filter.action}
              onChange={(e) => setFilter({...filter, action: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Filter by action..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Filter
            </label>
            <input
              type="text"
              value={filter.user}
              onChange={(e) => setFilter({...filter, user: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Filter by user..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Filter
            </label>
            <input
              type="date"
              value={filter.date}
              onChange={(e) => setFilter({...filter, date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limit
            </label>
            <select
              value={filter.limit}
              onChange={(e) => setFilter({...filter, limit: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setFilter({ action: '', user: '', date: '', limit: 50 })}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
          >
            Clear Filters
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={fetchLogs}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Refresh
            </button>
            <button
              onClick={exportLogs}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm">📊</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Total Logs</p>
              <p className="text-lg font-bold text-blue-600">{logs.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-sm">👥</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Active Users</p>
              <p className="text-lg font-bold text-green-600">
                {new Set(logs.map(log => log.user_id)).size}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-sm">🔥</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Today's Activity</p>
              <p className="text-lg font-bold text-purple-600">
                {logs.filter(log => 
                  new Date(log.created_at).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-sm">⚡</span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Actions/Min</p>
              <p className="text-lg font-bold text-orange-600">
                {logs.length > 0 ? 
                  (logs.length / Math.max(1, (Date.now() - new Date(logs[logs.length - 1].created_at).getTime()) / 60000)).toFixed(1)
                  : 0
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading access logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No access logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                        <div className="text-xs text-gray-500">{log.user_email}</div>
                        <div className="text-xs text-gray-400 capitalize">{log.user_role}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        <span className="mr-1">{getActionIcon(log.action)}</span>
                        {log.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{log.resource}</div>
                        {log.resource_id && (
                          <div className="text-xs text-gray-500">ID: {log.resource_id}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.ip_address}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={log.user_agent}>
                        {log.user_agent}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-lg p-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * filter.limit) + 1} to{' '}
              {Math.min(pagination.page * filter.limit, pagination.totalCount)} of{' '}
              {pagination.totalCount} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        pagination.page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessLogs;
