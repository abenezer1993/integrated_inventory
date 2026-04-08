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
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const getSession = async () => {
      if (!mounted) return;
      
      try {
        const sessionResult = await supabase?.auth.getSession();
        const session = sessionResult?.data.session;
        
        if (session?.user && !isAuthenticating) {
          // Add small delay to prevent rapid requests
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const profileResult = await supabase
            ?.from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          const profile = profileResult?.data;
          
          if (profile) {
            setUser({
              id: profile.id,
              email: session.user.email!,
              name: profile.name,
              role: profile.role as UserRole,
              branch_id: profile.branch_id,
              created_at: profile.created_at,
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    const subscriptionResult = supabase?.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      try {
        if (session?.user && !isAuthenticating) {
          setIsAuthenticating(true);
          
          // Add delay to prevent lock conflicts
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const profileResult = await supabase
            ?.from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          const profile = profileResult?.data;
          
          if (profile) {
            setUser({
              id: profile.id,
              email: session.user.email!,
              name: profile.name,
              role: profile.role as UserRole,
              branch_id: profile.branch_id,
              created_at: profile.created_at,
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setIsAuthenticating(false);
        if (mounted) {
          setLoading(false);
        }
      }
    });
    
    const subscription = subscriptionResult?.data.subscription;

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const login = async (email: string, password: string) => {
    setIsAuthenticating(true);
    try {
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    setIsAuthenticating(true);
    try {
      await supabase!.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    const permissions = {
      [UserRole.ADMIN]: [
        'manage_users', 'manage_branches', 'manage_products', 'view_all_reports',
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

    return permissions[user.role]?.includes(permission) || false;
  };

  const isAdmin = () => user?.role === UserRole.ADMIN;
  const isBranchManager = () => user?.role === UserRole.BRANCH_MANAGER;
  const isSalesStaff = () => user?.role === UserRole.SALES_STAFF;
  const isWarehouseStaff = () => user?.role === UserRole.WAREHOUSE_STAFF;

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
