import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY || '';

const SupabaseContext = createContext<{
  supabase: SupabaseClient | null;
  supabaseAdmin: SupabaseClient | null;
}>({
  supabase: null,
  supabaseAdmin: null,
});

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return context;
};

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabase] = useState(() => 
    createClient(supabaseUrl, supabaseAnonKey)
  );
  
  const [supabaseAdmin] = useState(() => {
    console.log('Supabase Service Key available:', !!supabaseServiceKey);
    console.log('Service Key length:', supabaseServiceKey?.length || 0);
    console.log('Service Key starts with:', supabaseServiceKey?.substring(0, 20) + '...');
    
    if (!supabaseServiceKey) {
      console.error('No service key found');
      return null;
    }
    
    try {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      console.log('Admin client created successfully');
      return adminClient;
    } catch (error) {
      console.error('Error creating admin client:', error);
      return null;
    }
  });

  return (
    <SupabaseContext.Provider value={{ supabase, supabaseAdmin }}>
      {children}
    </SupabaseContext.Provider>
  );
};
