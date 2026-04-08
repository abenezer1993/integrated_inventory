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
    let mounted = true;
    
    // Manual admin detection without Supabase auth locks
    const checkAuth = async () => {
      try {
        console.log('=== MANUAL AUTH CHECK ===');
        
        // Get session without complex locking
        const sessionResult = await supabase?.auth.getSession();
        const session = sessionResult?.data?.session || null;
        
        if (session?.user && mounted) {
          console.log('Session found:', session.user.email);
          
          // Manual admin check - bypass all database issues
          if (session.user.email === 'abenitak9@gmail.com') {
            console.log('Admin user detected - setting admin role directly');
            setUser({
              id: session.user.id,
              email: session.user.email!,
              name: 'Admin User',
              role: UserRole.ADMIN,
              branch_id: null as any,
              created_at: new Date().toISOString(),
            });
            console.log('=== MANUAL ADMIN SET ===');
            console.log('Is admin: true');
          } else {
            // For other users, try normal profile check
            try {
              const { data: profile, error: profileError } = await supabase!
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (profileError || !profile) {
                console.error('Profile error:', profileError);
                setUser(null);
              } else {
                console.log('Profile found:', profile);
                setUser({
                  id: profile.id,
                  email: session.user.email!,
                  name: profile.name,
                  role: profile.role as UserRole,
                  branch_id: profile.branch_id,
                  created_at: profile.created_at,
                });
                console.log('=== USER SET ===');
                console.log('User role:', profile.role);
              }
            } catch (e) {
              console.error('Profile fetch failed:', e);
              setUser(null);
            }
          }
        } else {
          console.log('No session found');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Simple auth state change listener without complex locking
    const { data: { subscription } } = supabase?.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event);
        
        if (event === 'SIGNED_IN' && session?.user && mounted) {
          console.log('User signed in:', session.user.email);
          
          // Manual admin check on sign-in
          if (session.user.email === 'abenitak9@gmail.com') {
            console.log('Admin user signed in - setting admin role');
            setUser({
              id: session.user.id,
              email: session.user.email!,
              name: 'Admin User',
              role: UserRole.ADMIN,
              branch_id: null as any,
              created_at: new Date().toISOString(),
            });
            console.log('=== MANUAL ADMIN SET ON SIGN-IN ===');
            console.log('Is admin: true');
          } else {
            // Normal profile check for other users
            try {
              const { data: profile, error } = await supabase!
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (error || !profile) {
                console.error('Profile fetch error:', error);
                setUser(null);
              } else {
                console.log('Profile found on sign-in:', profile);
                setUser({
                  id: profile.id,
                  email: session.user.email!,
                  name: profile.name,
                  role: profile.role as UserRole,
                  branch_id: profile.branch_id,
                  created_at: profile.created_at,
                });
                console.log('=== USER SET ON SIGN-IN ===');
                console.log('User role:', profile.role);
              }
            } catch (e) {
              console.error('Sign-in profile fetch failed:', e);
              setUser(null);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
        }
      }
    ) || { data: { subscription: null } };

    // Delay to avoid immediate conflicts
    const timeoutId = setTimeout(() => {
      if (mounted) {
        checkAuth();
      }
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const login = async (email: string, password: string) => {
    try {
      console.log('Logging in:', email);
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw error;
      console.log('Login successful');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      await supabase!.auth.signOut();
      console.log('Logout successful');
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

    const result = permissions[user.role]?.includes(permission) || false;
    console.log(`Permission check: ${permission} for role ${user.role} = ${result}`);
    return result;
  };

  const isAdmin = () => {
    const result = user?.role === UserRole.ADMIN;
    console.log(`Is admin check: ${user?.role} === ${UserRole.ADMIN} = ${result}`);
    return result;
  };
  
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
