/**
 * Browser Supabase client for auth.
 * Uses VITE_SUPABASE_* or SUPABASE_* from env (Vite injects at build; see .env.example).
 */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export function getSession() {
  return supabase?.auth.getSession() ?? Promise.resolve({ data: { session: null }, error: null });
}

export function onAuthStateChange(callback: (event: string, session: import("@supabase/supabase-js").Session | null) => void) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
}
