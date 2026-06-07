"use client";
import { createBrowserClient } from "@supabase/ssr";

// Whether Supabase env vars are present. NEXT_PUBLIC_* are inlined at build time.
export const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Browser-side Supabase client. NEVER throws on missing config — returns null so
// the app can render in a degraded (no-auth) mode instead of hanging on "Loading…".
let _client = null;
export function createClient() {
  if (!SUPABASE_CONFIGURED) return null;
  if (_client) return _client;
  try {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  } catch (e) {
    console.error("[CareerOS] Supabase init failed:", e);
    _client = null;
  }
  return _client;
}
