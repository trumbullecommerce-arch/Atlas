import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client for Atlas.
 * Uses the public anon key — safe to use in client components.
 * RLS policies on the Supabase side control what data is accessible.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
