import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext-debug';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission,
  requiredRole 
}) => {
  const { user, loading, hasPermission, isAdmin, isBranchManager, isSalesStaff, isWarehouseStaff } = useAuth();

  // Debug logging
  console.log('ProtectedRoute - User:', user);
  console.log('ProtectedRoute - User role:', user?.role);
  console.log('ProtectedRoute - Required role:', requiredRole);
  console.log('ProtectedRoute - Required permission:', requiredPermission);
  console.log('ProtectedRoute - Is admin:', isAdmin());
  console.log('ProtectedRoute - Is branch manager:', isBranchManager());
  console.log('ProtectedRoute - Is sales staff:', isSalesStaff());
  console.log('ProtectedRoute - Has permission:', requiredPermission ? hasPermission(requiredPermission) : 'N/A');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requiredRole) {
    console.log('ProtectedRoute - Checking required role:', requiredRole);
    switch (requiredRole) {
      case 'admin':
        console.log('ProtectedRoute - Admin check, isAdmin():', isAdmin());
        if (!isAdmin()) {
          console.log('ProtectedRoute - Admin check failed, redirecting');
          return <Navigate to="/dashboard" replace />;
        }
        break;
      case 'branch_manager':
        console.log('ProtectedRoute - Branch manager check, isBranchManager():', isBranchManager());
        if (!isBranchManager()) {
          console.log('ProtectedRoute - Branch manager check failed, redirecting');
          return <Navigate to="/dashboard" replace />;
        }
        break;
      case 'sales_staff':
        console.log('ProtectedRoute - Sales staff check, isSalesStaff():', isSalesStaff());
        if (!isSalesStaff()) {
          console.log('ProtectedRoute - Sales staff check failed, redirecting');
          return <Navigate to="/dashboard" replace />;
        }
        break;
      case 'warehouse_staff':
        console.log('ProtectedRoute - Warehouse staff check, isWarehouseStaff():', isWarehouseStaff());
        if (!isWarehouseStaff()) {
          console.log('ProtectedRoute - Warehouse staff check failed, redirecting');
          return <Navigate to="/dashboard" replace />;
        }
        break;
    }
  }

  // Check permission-based access
  if (requiredPermission) {
    const hasRequiredPermission = hasPermission(requiredPermission);
    console.log('ProtectedRoute - Permission check result:', hasRequiredPermission);
    if (!hasRequiredPermission) {
      console.log('ProtectedRoute - Permission check failed, redirecting');
      return <Navigate to="/dashboard" replace />;
    }
  }

  console.log('ProtectedRoute - All checks passed, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;
