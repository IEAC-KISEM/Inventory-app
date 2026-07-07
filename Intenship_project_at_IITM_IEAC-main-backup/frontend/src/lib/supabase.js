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

  // Return a recursive proxy stub to support chaining (e.g., supabase.auth.signInWithPassword, supabase.from().select())
  const makeStub = () => {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'auth') {
          return new Proxy({}, {
            get: (t2, prop2) => {
              return () => {
                console.error(`Attempted to call auth.${String(prop2)} but credentials are missing.`);
                alert('Configuration Error: Please add SUPABASE_URL and SUPABASE_ANON_KEY to your environment variables.');
                return Promise.resolve({ data: null, error: new Error('Supabase credentials missing') });
              };
            }
          });
        }
        if (prop === 'from') {
          return () => {
            const chainable = new Proxy({}, {
              get: () => () => chainable
            });
            return chainable;
          };
        }
        return () => {
          console.error(`Attempted to call ${String(prop)} but credentials are missing.`);
          alert('Configuration Error: Please add SUPABASE_URL and SUPABASE_ANON_KEY to your environment variables.');
          return Promise.resolve({ data: null, error: new Error('Supabase credentials missing') });
        };
      }
    });
  };

  supabaseInstance = makeStub();
  adminAuthClientInstance = makeStub();
}

export const supabase = supabaseInstance;
export const adminAuthClient = adminAuthClientInstance;
