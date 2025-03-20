import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyODQ2NTksImV4cCI6MjA1NDg2MDY1OX0.HtnIuP5YJRkzfHuHYqYyKbyIFoSHW67m2wqdVxdL8Wc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 