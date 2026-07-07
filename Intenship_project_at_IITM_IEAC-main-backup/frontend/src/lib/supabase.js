import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

let supabaseInstance;
let adminAuthClientInstance;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  adminAuthClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
} else {
  console.warn(
    'Warning: Supabase credentials are missing! Please check that VITE_SUPABASE_URL / SUPABASE_URL ' +
    'and VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY are set in your environment.'
  );

  // Return a fallback proxy stub to prevent top-level runtime crashes, keeping the UI visible
  const stub = new Proxy({}, {
    get: (target, prop) => {
      // Return a function that logs a warning and returns a resolved promise with an error
      return () => {
        console.error(`Attempted to call Supabase client method "${String(prop)}" but credentials are missing.`);
        alert('Configuration Error: Please add SUPABASE_URL and SUPABASE_ANON_KEY to your environment variables on Netlify.');
        return Promise.resolve({ data: null, error: new Error('Supabase credentials missing') });
      };
    }
  });

  supabaseInstance = stub;
  adminAuthClientInstance = stub;
}

export const supabase = supabaseInstance;
export const adminAuthClient = adminAuthClientInstance;
