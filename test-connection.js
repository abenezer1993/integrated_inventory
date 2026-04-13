// Test Supabase connection - paste this in browser console
console.log('=== TESTING SUPABASE CONNECTION ===');

// Test environment variables
console.log('Environment Variables:');
console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('REACT_APP_SUPABASE_ANON_KEY:', process.env.REACT_APP_SUPABASE_ANON_KEY ? '***KEY EXISTS***' : 'KEY MISSING');

// Test Supabase client creation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://tnctscamsglubhemdvqg.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: Missing environment variables');
} else {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('Supabase client created:', !!supabase);
  
  // Test simple query
  supabase.from('manufacturing_orders').select('count').then(result => {
    console.log('Test query result:', result);
    if (result.error) {
      console.error('Query error:', result.error);
    } else {
      console.log('Query success - total orders:', result.data?.[0]?.count || 0);
    }
  });
  
  // Test user session
  supabase.auth.getSession().then(session => {
    console.log('Session check:', session);
    if (session.error) {
      console.error('Session error:', session.error);
    } else {
      console.log('User authenticated:', !!session.data?.user);
      console.log('User email:', session.data?.user?.email);
    }
  });
}
