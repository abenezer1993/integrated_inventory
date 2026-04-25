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
  const [supabase] = useState(() => {
    // Use service key for admin access, fallback to anon key
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    
    console.log('Supabase Service Key available:', !!supabaseServiceKey);
    if (supabaseServiceKey) {
      console.log('Service Key length:', supabaseServiceKey.length);
      console.log('Service Key starts with:', supabaseServiceKey.substring(0, 20) + '...');
    }
    
    if (!keyToUse) {
      console.error('No Supabase keys found');
      return null;
    }
    
    try {
      const client = createClient(supabaseUrl, keyToUse, {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        }
      });
      console.log('Supabase client created successfully');
      return client;
    } catch (error) {
      console.error('Error creating Supabase client:', error);
      return null;
    }
  });
  
  // Use single client for both regular and admin operations
  const supabaseAdmin = supabase;

  return (
    <SupabaseContext.Provider value={{ supabase, supabaseAdmin }}>
      {children}
    </SupabaseContext.Provider>
  );
};
