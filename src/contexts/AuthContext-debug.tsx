import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSupabase } from './SupabaseContext';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  isBranchManager: () => boolean;
  isSalesStaff: () => boolean;
  isWarehouseStaff: () => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: async () => {},
  loading: true,
  hasPermission: () => false,
  isAdmin: () => false,
  isBranchManager: () => false,
  isSalesStaff: () => false,
  isWarehouseStaff: () => false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { supabase } = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sessionResult = await supabase?.auth.getSession();
        
        if (sessionResult?.data?.session?.user) {
          const session = sessionResult.data.session;
          console.log('✅ Session found:', session.user.email);
          
          if (session.user.email === 'abenitak9@gmail.com') {
            console.log('🎯 ADMIN USER SIGNED IN');
            const adminUser: User = {
              id: session.user.id,
              email: session.user.email!,
              name: 'Admin User',
              role: UserRole.ADMIN,
              branch_id: '420c84a8-e559-4e3a-86ee-06bcb15baacd', // Lamberet Branch
              created_at: new Date().toISOString(),
            };
            setUser(adminUser);
          } else {
            console.log('❌ Not admin user');
            const basicUser: User = {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.email!,
              role: UserRole.SALES_STAFF,
              branch_id: undefined,
              created_at: session.user.created_at,
            };
            setUser(basicUser);
          }
        } else {
          console.log('❌ No session found');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [supabase]);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Login attempt with email:', email);
      console.log('🔐 Email validation check:', email !== 'abenitak9@gmail.com');
      
      // Only allow admin email to log in
      if (email !== 'abenitak9@gmail.com') {
        console.log('❌ EMAIL VALIDATION FAILED - BLOCKING LOGIN');
        throw new Error('Access denied. Only admin user (abenitak9@gmail.com) is allowed to access this system.');
      }
      
      console.log('✅ Email validation passed - calling Supabase');
      const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw error;
      console.log('✅ Login successful');
      
      // Manually update user state after successful login
      if (data.session && data.user) {
        const basicUser = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email || 'Admin User',
          role: 'admin' as UserRole,
          created_at: data.user.created_at,
        };
        setUser(basicUser);
        console.log('✅ User state updated manually after login');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🔐 Logging out...');
      await supabase!.auth.signOut();
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) {
      return false;
    }
    
    const permissions = {
      [UserRole.ADMIN]: [
        'manage_users', 'manage_branches', 'manage_products', 'manage_inventory', 'view_all_reports',
        'manage_sales', 'manage_purchases', 'manage_manufacturing', 'manage_expenses'
      ],
      [UserRole.BRANCH_MANAGER]: [
        'manage_branch_users', 'view_branch_reports', 'manage_branch_sales',
        'manage_branch_inventory', 'manage_branch_expenses'
      ],
      [UserRole.SALES_STAFF]: [
        'create_sales', 'view_customers', 'manage_customers', 'view_products'
      ],
      [UserRole.WAREHOUSE_STAFF]: [
        'manage_inventory', 'receive_purchases', 'manage_manufacturing', 'view_products'
      ]
    };
    
    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes(permission) || false;
  };

  const isAdmin = () => {
    return user?.role === UserRole.ADMIN;
  };

  const isBranchManager = () => {
    return user?.role === UserRole.BRANCH_MANAGER;
  };

  const isSalesStaff = () => {
    return user?.role === UserRole.SALES_STAFF;
  };

  const isWarehouseStaff = () => {
    return user?.role === UserRole.WAREHOUSE_STAFF;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      hasPermission,
      isAdmin,
      isBranchManager,
      isSalesStaff,
      isWarehouseStaff,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
