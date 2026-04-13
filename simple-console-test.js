// Simple console test - paste this line by line in browser console
console.log('=== TESTING AUTHENTICATION ===');

// Check if app is loaded
console.log('App loaded:', typeof window !== 'undefined');

// Check localStorage for auth token
console.log('Auth token in localStorage:', localStorage.getItem('supabase.auth.token') ? 'EXISTS' : 'MISSING');

// Check if user object exists in window (might be stored globally)
console.log('Window user:', window.user ? 'EXISTS' : 'MISSING');

// Check current page URL
console.log('Current URL:', window.location.href);

// Check if React app is loaded
console.log('React app loaded:', document.querySelector('#root') ? 'YES' : 'NO');

// Try to access the app's auth context (this might not work, but worth trying)
try {
  const appElement = document.querySelector('#root');
  console.log('Root element found:', !!appElement);
} catch (error) {
  console.log('Error checking app:', error.message);
}
