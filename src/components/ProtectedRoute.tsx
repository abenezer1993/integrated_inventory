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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requiredRole) {
    switch (requiredRole) {
      case 'admin':
        if (!isAdmin()) return <Navigate to="/dashboard" replace />;
        break;
      case 'branch_manager':
        if (!isBranchManager()) return <Navigate to="/dashboard" replace />;
        break;
      case 'sales_staff':
        if (!isSalesStaff()) return <Navigate to="/dashboard" replace />;
        break;
      case 'warehouse_staff':
        if (!isWarehouseStaff()) return <Navigate to="/dashboard" replace />;
        break;
    }
  }

  // Check permission-based access
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
