// Check current auth state - paste in browser console
console.log('=== CURRENT AUTH STATE ===');

// Check if user is set in AuthContext
// This might work since we're in the React app
const userElement = document.querySelector('[data-user]');
if (userElement) {
  console.log('User from DOM:', userElement.getAttribute('data-user'));
}

// Check localStorage for any auth data
console.log('LocalStorage auth keys:');
Object.keys(localStorage).forEach(key => {
  if (key.includes('auth') || key.includes('supabase')) {
    console.log(`${key}:`, localStorage.getItem(key));
  }
});

// Check session storage
console.log('SessionStorage auth keys:');
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('auth') || key.includes('supabase')) {
    console.log(`${key}:`, sessionStorage.getItem(key));
  }
});
