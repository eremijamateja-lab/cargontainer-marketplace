import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Supabase mode: same project and same login as Cargontainer TMS Agency / TMS Carrier.
// Without these env values the app keeps its local email/password login (dev mode).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseMode = !!supabase;

// Where companies register (self-signup with the Marketplace product ticked).
export const AGENCY_SIGNUP_URL =
  (import.meta.env.VITE_AGENCY_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://tms-agency.cargontainer.com';

// The backend and @metagptx/web-sdk read the bearer token from localStorage 'token'.
// In Supabase mode that slot always mirrors the current Supabase access token.
function mirrorToken(accessToken: string | null | undefined) {
  try {
    if (accessToken) {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('isLougOutManual', 'false');
    } else {
      localStorage.removeItem('token');
    }
  } catch {
    // localStorage unavailable — API calls will just be unauthenticated
  }
}

/** Call once before rendering: restores (and if needed refreshes) the session, then keeps
 *  localStorage 'token' in sync with every refresh / sign-out. */
export async function initSupabaseAuth() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  mirrorToken(data.session?.access_token);
  supabase.auth.onAuthStateChange((_event, session) => {
    mirrorToken(session?.access_token);
  });
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  mirrorToken(data.session?.access_token);
  return data;
}

/** Signs out of Supabase too (no-op in local mode). Callers still clear their own state. */
export async function supabaseSignOut() {
  if (!supabase) return;
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // network error — the local session is dropped regardless
  }
  mirrorToken(null);
}
