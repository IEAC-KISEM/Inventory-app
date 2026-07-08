import { createClient } from '@supabase/supabase-js';

// Fallback to your project credentials directly if environment variables are not loaded/cached
const DEFAULT_URL = 'https://cxojeukkobhkrrrcwmoe.supabase.co';
const DEFAULT_KEY = 'sb_publishable_E9dWEb7tccj3aZf8PbgLuw_-gtj8kUm';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_KEY;

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
  console.warn('Warning: Supabase client initialized as fallback stub.');
  const makeStub = () => {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'auth') {
          return new Proxy({}, {
            get: (t2, prop2) => {
              return () => {
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
