import { createClient } from '@supabase/supabase-js'

// Fallback hardcoded — Supabase anon key is safe to expose publicly by design
// (security comes from RLS policies, not key secrecy). This guarantees the
// client always initializes correctly regardless of CI/build env var injection.
const FALLBACK_URL = 'https://szcaggkwvtghgravfqrs.supabase.co'
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Y2FnZ2t3dnRnaGdyYXZmcXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDE0MjksImV4cCI6MjA5NTgxNzQyOX0.wNrjiQBaqQHCTdizbEz4gf1jLMSWZCAFIJXfxfGJe-g'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || FALLBACK_URL
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || FALLBACK_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
