import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://huczvnplnyqiftpxvqkt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y3p2bnBsbnlxaWZ0cHh2cWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTcyMDUsImV4cCI6MjA4ODY3MzIwNX0.qrAlJtHvugq2U23ZbcJYk5kIsDBq96glxpB_JNUEpgs";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});