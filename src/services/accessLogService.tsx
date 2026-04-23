import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext-debug';

class AccessLogService {
  private supabase: any;
  private user: any;

  constructor(supabase: any, user: any) {
    this.supabase = supabase;
    this.user = user;
  }

  private async logAction(action: string, resource: string, resourceId?: string, details?: any) {
    try {
      if (!this.supabase || !this.user) return;

      const logEntry = {
        user_id: this.user.id,
        user_name: this.user.name || 'Unknown',
        user_email: this.user.email || 'unknown@example.com',
        user_role: this.user.role || 'unknown',
        action,
        resource,
        resource_id: resourceId || null,
        method: 'CLIENT',
        ip_address: 'CLIENT_IP', // Would be set by backend middleware
        user_agent: navigator.userAgent,
        details: details || null
      };

      // Use service role to bypass RLS
      const { error } = await this.supabase
        .from('access_logs')
        .insert(logEntry);

      if (error) {
        console.error('Failed to log access:', error);
      }
    } catch (error) {
      console.error('Access logging error:', error);
    }
  }

  // Page view logging
  logPageView(pageName: string) {
    this.logAction('VIEW', 'PAGE', pageName, {
      url: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  }

  // Product actions
  logProductCreate(productId: string, productName: string) {
    this.logAction('CREATE', 'PRODUCT', productId, {
      product_name: productName
    });
  }

  logProductUpdate(productId: string, productName: string) {
    this.logAction('UPDATE', 'PRODUCT', productId, {
      product_name: productName
    });
  }

  logProductDelete(productId: string, productName: string) {
    this.logAction('DELETE', 'PRODUCT', productId, {
      product_name: productName
    });
  }

  // Sale actions
  logSaleCreate(saleId: string, totalAmount: number) {
    this.logAction('CREATE', 'SALE', saleId, {
      total_amount: totalAmount
    });
  }

  logSaleUpdate(saleId: string, totalAmount: number) {
    this.logAction('UPDATE', 'SALE', saleId, {
      total_amount: totalAmount
    });
  }

  // Inventory actions
  logInventoryAdjustment(inventoryId: string, adjustmentType: string, quantity: number) {
    this.logAction('ADJUST', 'INVENTORY', inventoryId, {
      adjustment_type: adjustmentType,
      quantity: quantity
    });
  }

  logInventoryTransfer(inventoryId: string, fromBranch: string, toBranch: string) {
    this.logAction('TRANSFER', 'INVENTORY', inventoryId, {
      from_branch: fromBranch,
      to_branch: toBranch
    });
  }

  // Employee actions
  logEmployeeCreate(employeeId: string, employeeName: string) {
    this.logAction('CREATE', 'EMPLOYEE', employeeId, {
      employee_name: employeeName
    });
  }

  logEmployeeUpdate(employeeId: string, employeeName: string) {
    this.logAction('UPDATE', 'EMPLOYEE', employeeId, {
      employee_name: employeeName
    });
  }

  logEmployeeDelete(employeeId: string, employeeName: string) {
    this.logAction('DELETE', 'EMPLOYEE', employeeId, {
      employee_name: employeeName
    });
  }

  // Manufacturing actions
  logManufacturingRecord(orderId: string, productName: string, quantity: number) {
    this.logAction('CREATE', 'MANUFACTURING_ORDER', orderId, {
      product_name: productName,
      quantity: quantity
    });
  }

  // Branch actions
  logBranchCreate(branchId: string, branchName: string) {
    this.logAction('CREATE', 'BRANCH', branchId, {
      branch_name: branchName
    });
  }

  logBranchUpdate(branchId: string, branchName: string) {
    this.logAction('UPDATE', 'BRANCH', branchId, {
      branch_name: branchName
    });
  }

  // Profile actions
  logProfileUpdate() {
    this.logAction('UPDATE', 'USER_PROFILE', this.user.id, {
      updated_fields: ['name', 'email', 'password']
    });
  }

  // Authentication actions
  logLogin() {
    this.logAction('LOGIN', 'AUTH', this.user.id, {
      login_time: new Date().toISOString()
    });
  }

  logLogout() {
    this.logAction('LOGOUT', 'AUTH', this.user.id, {
      logout_time: new Date().toISOString()
    });
  }

  // User management actions
  logUserCreate(userId: string, userEmail: string, userRole: string) {
    this.logAction('CREATE', 'USER', userId, {
      user_email: userEmail,
      user_role: userRole
    });
  }

  logUserUpdate(userId: string, userEmail: string, userRole: string) {
    this.logAction('UPDATE', 'USER', userId, {
      user_email: userEmail,
      user_role: userRole
    });
  }

  logUserDelete(userId: string, userEmail: string) {
    this.logAction('DELETE', 'USER', userId, {
      user_email: userEmail
    });
  }
}

// Hook for using the service
export const useAccessLogService = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();

  if (!supabase || !user) {
    return null;
  }

  return new AccessLogService(supabase, user);
};

export default AccessLogService;
