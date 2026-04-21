import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSupabase } from './SupabaseContext';
import { User, UserRole } from '../types';
import { hasPermission, canAccessPage, getRoleDescription } from '../utils/accessControl';
import { ROLE_PERMISSIONS } from '../utils/accessControl';

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
            console.log('👤 NON-ADMIN USER SIGNED IN:', session.user.email);
            
            // Fetch user profile to get role and branch info
            try {
              const { data: profileData, error: profileError } = await supabase!
                .from('users')
                .select('*')
                .eq('email', session.user.email)
                .single();
              
              if (profileError) {
                console.log('❌ Profile fetch error, using default role');
                // Fallback to basic user with default role
                const basicUser: User = {
                  id: session.user.id,
                  email: session.user.email!,
                  name: session.user.email!,
                  role: UserRole.SALES_STAFF, // Default role
                  branch_id: undefined,
                  created_at: session.user.created_at,
                };
                setUser(basicUser);
              } else {
                console.log('✅ User profile found:', profileData);
                const loggedInUser: User = {
                  id: session.user.id,
                  email: session.user.email!,
                  name: profileData.name || session.user.email!,
                  role: profileData.role || UserRole.SALES_STAFF,
                  branch_id: profileData.branch_id,
                  created_at: profileData.created_at || session.user.created_at,
                };
                setUser(loggedInUser);
                console.log('✅ User set with role:', loggedInUser.role);
              }
            } catch (profileErr) {
              console.error('❌ Profile fetch exception:', profileErr);
              // Fallback to basic user
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
      
      console.log('✅ Calling Supabase auth');
      const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw error;
      console.log('✅ Login successful');
      
      // Get user profile to determine role
      if (data.session && data.user) {
        try {
          const { data: profileData, error: profileError } = await supabase!
            .from('users')
            .select('*')
            .eq('email', data.user.email!)
            .single();
          
          if (profileError) {
            console.error('❌ Profile fetch error:', profileError);
            // Fallback to basic user if profile not found
            const basicUser = {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.name || data.user.email || 'User',
              role: UserRole.SALES_STAFF, // Default role
              created_at: data.user.created_at,
            };
            setUser(basicUser);
          } else {
            console.log('✅ User profile found:', profileData);
            const loggedInUser = {
              id: data.user.id,
              email: data.user.email || '',
              name: profileData.name || data.user.email || 'User',
              role: profileData.role || UserRole.SALES_STAFF,
              branch_id: profileData.branch_id,
              created_at: profileData.created_at || data.user.created_at,
            };
            setUser(loggedInUser);
            console.log('✅ User logged in with role:', loggedInUser.role);
          }
        } catch (profileErr) {
          console.error('❌ Profile fetch error:', profileErr);
          // Fallback to basic user
          const basicUser = {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || data.user.email || 'User',
            role: UserRole.SALES_STAFF,
            created_at: data.user.created_at,
          };
          setUser(basicUser);
        }
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
    
    // Use the new access control system
    return ROLE_PERMISSIONS[user.role]?.includes(permission) || false;
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
