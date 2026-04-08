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
    
    // Simple auth initialization without complex locking
    const initializeAuth = async () => {
      try {
        console.log('=== INITIALIZING AUTH (FINAL VERSION) ===');
        
        // Use a simple approach to avoid lock issues
        const session = await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 5000); // 5 second timeout
          
          supabase?.auth.getSession().then(({ data, error }) => {
            clearTimeout(timeout);
            if (error) {
              console.error('Session error:', error);
              resolve(null);
            } else {
              resolve(data.session);
            }
          });
        }) as any;
        
        if (session?.user && mounted) {
          console.log('Session found:', session.user.email);
          console.log('Session ID:', session.user.id);
          
          // Use direct RPC call to avoid Supabase client locks
          const profile = await supabase?.rpc('get_user_profile', {
            user_id: session.user.id
          });
          
          if (profile?.error) {
            console.error('Profile RPC error:', profile.error);
            // Fallback to direct query
            try {
              const { data: fallbackProfile, error: fallbackError } = await supabase!
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (fallbackError) {
                console.error('Fallback profile error:', fallbackError);
                setUser(null);
              } else if (fallbackProfile) {
                console.log('Fallback profile found:', fallbackProfile);
                setUser({
                  id: fallbackProfile.id,
                  email: session.user.email!,
                  name: fallbackProfile.name,
                  role: fallbackProfile.role as UserRole,
                  branch_id: fallbackProfile.branch_id,
                  created_at: fallbackProfile.created_at,
                });
                console.log('=== USER SET (FALLBACK) ===');
                console.log('User role:', fallbackProfile.role);
                console.log('Is admin:', fallbackProfile.role === 'admin');
              }
            } catch (e) {
              console.error('Fallback failed:', e);
              setUser(null);
            }
          } else if (profile?.data) {
            console.log('RPC profile found:', profile.data);
            setUser({
              id: profile.data.id,
              email: session.user.email!,
              name: profile.data.name,
              role: profile.data.role as UserRole,
              branch_id: profile.data.branch_id,
              created_at: profile.data.created_at,
            });
            console.log('=== USER SET (RPC) ===');
            console.log('User role:', profile.data.role);
            console.log('Is admin:', profile.data.role === 'admin');
          } else {
            console.log('No profile found');
            setUser(null);
          }
        } else {
          console.log('No session found');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Delay initialization to avoid lock conflicts
    const timeoutId = setTimeout(() => {
      if (mounted) {
        initializeAuth();
      }
    }, 2000);

    // Simple auth state change listener
    const { data: { subscription } } = supabase?.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in:', session.user.email);
          
          // Use same profile fetching logic
          try {
            const { data: profile, error } = await supabase!
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (error) {
              console.error('Profile fetch error:', error);
              setUser(null);
            } else if (profile) {
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
              console.log('Is admin:', profile.role === 'admin');
            }
          } catch (e) {
            console.error('Sign-in profile fetch failed:', e);
            setUser(null);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
        }
      }
    ) || { data: { subscription: null } };

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
