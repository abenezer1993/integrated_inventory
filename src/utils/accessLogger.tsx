import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';

interface LogData {
  action: string;
  resource: string;
  resource_id?: string;
  method?: string;
  details?: any;
}

export const useAccessLogger = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();

  const logAction = async (logData: LogData) => {
    try {
      // Get client IP and user agent
      const userAgent = navigator.userAgent;
      
      // For IP address, we'll use a placeholder or get from headers in backend
      const ipAddress = 'CLIENT_IP'; // This would be set by backend middleware

      const logEntry = {
        user_id: user?.id || null,
        user_name: user?.name || 'Unknown',
        user_email: user?.email || 'unknown@example.com',
        user_role: user?.role || 'unknown',
        action: logData.action,
        resource: logData.resource,
        resource_id: logData.resource_id || null,
        method: logData.method || 'MANUAL',
        ip_address: ipAddress,
        user_agent: userAgent,
        details: logData.details || null
      };

      // Insert log using service role to bypass RLS
      const { error } = await supabase!
        .from('access_logs')
        .insert(logEntry);

      if (error) {
        console.error('Failed to log access:', error);
      }
    } catch (error) {
      console.error('Access logging error:', error);
    }
  };

  return { logAction };
};

// Convenience functions for common actions
export const logUserAction = async (
  supabase: any,
  user: any,
  action: string,
  resource: string,
  resourceId?: string,
  details?: any
) => {
  try {
    const userAgent = navigator.userAgent;
    const ipAddress = 'CLIENT_IP';

    const logEntry = {
      user_id: user?.id || null,
      user_name: user?.name || 'Unknown',
      user_email: user?.email || 'unknown@example.com',
      user_role: user?.role || 'unknown',
      action,
      resource,
      resource_id: resourceId || null,
      method: 'MANUAL',
      ip_address: ipAddress,
      user_agent: userAgent,
      details: details || null
    };

    await supabase
      .from('access_logs')
      .insert(logEntry);
  } catch (error) {
    console.error('Failed to log user action:', error);
  }
};

// Action types
export const LOG_ACTIONS = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  
  // CRUD Operations
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  
  // Specific Actions
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  VIEW_PRODUCTS: 'VIEW_PRODUCTS',
  VIEW_SALES: 'VIEW_SALES',
  VIEW_INVENTORY: 'VIEW_INVENTORY',
  VIEW_EMPLOYEES: 'VIEW_EMPLOYEES',
  VIEW_BRANCHES: 'VIEW_BRANCHES',
  VIEW_MANUFACTURING: 'VIEW_MANUFACTURING',
  VIEW_ACCESS_LOGS: 'VIEW_ACCESS_LOGS',
  
  // Product Actions
  ADD_PRODUCT: 'ADD_PRODUCT',
  EDIT_PRODUCT: 'EDIT_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  
  // Sales Actions
  CREATE_SALE: 'CREATE_SALE',
  EDIT_SALE: 'EDIT_SALE',
  DELETE_SALE: 'DELETE_SALE',
  
  // Inventory Actions
  ADJUST_STOCK: 'ADJUST_STOCK',
  TRANSFER_STOCK: 'TRANSFER_STOCK',
  
  // Employee Actions
  ADD_EMPLOYEE: 'ADD_EMPLOYEE',
  EDIT_EMPLOYEE: 'EDIT_EMPLOYEE',
  DELETE_EMPLOYEE: 'DELETE_EMPLOYEE',
  
  // Manufacturing Actions
  RECORD_PRODUCTION: 'RECORD_PRODUCTION',
  
  // Branch Actions
  ADD_BRANCH: 'ADD_BRANCH',
  EDIT_BRANCH: 'EDIT_BRANCH',
  DELETE_BRANCH: 'DELETE_BRANCH',
  
  // Profile Actions
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD'
} as const;
