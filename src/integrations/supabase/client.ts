// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://iquqsfeolgnnycszixue.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdXFzZmVvbGdubnljc3ppeHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzNzQ3NTMsImV4cCI6MjA1NDk1MDc1M30.yxMj-AaDfXwrFTMhJ-TA_5okeZtq9lvxL77xkzCNPW8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);