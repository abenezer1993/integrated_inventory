import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const authInitialized = useRef(false);
  const sessionCheckTimeout = useRef<NodeJS.Timeout>();

  // Debounced session check to prevent lock conflicts
  const checkSession = useRef(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (!supabase || authInitialized.current) return;
          
          try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
              // Add delay to prevent lock conflicts
              await new Promise(resolve => setTimeout(resolve, 300));
              
              const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

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
            console.error('Session check error:', error);
            setUser(null);
          } finally {
            setLoading(false);
            authInitialized.current = true;
          }
        }, 500);
      };
    })()
  ).current;

  useEffect(() => {
    let mounted = true;
    
    // Initial session check with delay
    if (!authInitialized.current) {
      sessionCheckTimeout.current = setTimeout(() => {
        if (mounted) {
          checkSession();
        }
      }, 100);
    }

    // Set up auth state listener with debouncing
    const { data: { subscription } } = supabase?.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted || !authInitialized.current) return;
        
        // Debounce rapid auth state changes
        clearTimeout(sessionCheckTimeout.current);
        
        sessionCheckTimeout.current = setTimeout(async () => {
          try {
            if (session?.user) {
              // Add delay to prevent lock conflicts
              await new Promise(resolve => setTimeout(resolve, 300));
              
              const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

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
            setUser(null);
          }
        }, 300);
      }
    ) || { data: { subscription: null } };

    return () => {
      mounted = false;
      clearTimeout(sessionCheckTimeout.current);
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const login = async (email: string, password: string) => {
    try {
      // Clear any existing timeout
      clearTimeout(sessionCheckTimeout.current);
      
      // Add delay before login to prevent lock conflicts
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear any existing timeout
      clearTimeout(sessionCheckTimeout.current);
      
      // Add delay before logout to prevent lock conflicts
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await supabase!.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
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
