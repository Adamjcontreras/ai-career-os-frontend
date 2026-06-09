"use client";
import { createBrowserClient } from "@supabase/ssr";

// Normalize the Supabase URL to ONLY the base project origin.
// Supabase builds its own paths (/auth/v1/signup, /rest/v1, ...). If the env var
// accidentally includes a path (e.g. ".../auth/v1" or a trailing "/signup"),
// auth fails with "Invalid path specified in request URL". This strips any path,
// query, or trailing slash so only https://PROJECT_ID.supabase.co remains.
function normalizeUrl(raw) {
  if (!raw) return "";
  try {
    const u = new URL(raw.trim());
    return `${u.protocol}//${u.host}`; // origin only — no path/query/hash
  } catch {
    return raw.trim().replace(/\/+$/, "");
  }
}

const RAW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const URL_BASE = normalizeUrl(RAW_URL);
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_CONFIGURED = !!URL_BASE && !!ANON;

if (typeof window !== "undefined" && RAW_URL && URL_BASE !== RAW_URL.replace(/\/+$/, "")) {
  console.warn("[CareerOS] NEXT_PUBLIC_SUPABASE_URL had extra path/slash; using base origin:", URL_BASE);
}

// Returns a client, or null if unconfigured. NEVER throws (keeps app from hanging).
let _client = null;
export function createClient() {
  if (!SUPABASE_CONFIGURED) return null;
  if (_client) return _client;
  try {
    _client = createBrowserClient(URL_BASE, ANON);
  } catch (e) {
    console.error("[CareerOS] Supabase init failed:", e);
    _client = null;
  }
  return _client;
}
