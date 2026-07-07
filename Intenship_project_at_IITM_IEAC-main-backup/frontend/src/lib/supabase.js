import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Warning: Supabase credentials are missing! Please check that VITE_SUPABASE_URL / SUPABASE_URL ' +
    'and VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY are set in your environment.'
  );
}

// Reusable authenticated client for normal database calls
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Secondary client instance with persistSession: false.
// This allows the Admin to register new users (via auth sign-up)
// without signing out of the active admin session in the browser.
export const adminAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
