import { createBrowserClient } from '@supabase/ssr';
import { Database } from './database_types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client per uso nel browser (client components)
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

