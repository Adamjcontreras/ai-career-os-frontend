// Version + build identity. The git commit hash is injected AT BUILD TIME by the
// host (the code can't know its own hash) — Vercel and Render both expose it.
//   Vercel:  VERCEL_GIT_COMMIT_SHA  → exposed to the app as NEXT_PUBLIC_COMMIT_SHA
//   (set NEXT_PUBLIC_COMMIT_SHA = $VERCEL_GIT_COMMIT_SHA in Vercel env, or it
//    falls back to the system var at build).
export const APP_VERSION = "v9.0.2-jobs-fix";
export const BUILD_TIME = new Date().toISOString(); // build/deploy time
export const SCHEMA_VERSION = "2026-06-13";

// Commit hash: prefer an explicit public var, fall back to Vercel's system var.
export const COMMIT_SHA =
  process.env.NEXT_PUBLIC_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  "unknown (set NEXT_PUBLIC_COMMIT_SHA in Vercel)";

export const COMMIT_SHORT = COMMIT_SHA.slice(0, 7);
export const FRONTEND_VERSION = APP_VERSION;
export const AI_MODEL = "claude-sonnet-4-6"; // the model the app calls
