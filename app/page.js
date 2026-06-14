"use client";
import { useEffect, useState } from "react";
import { auth, isConfigured } from "../lib/data";
import CareerOSApp from "../components/CareerOSApp";
import AuthScreen from "../components/AuthScreen";
import ErrorBoundary from "../components/ErrorBoundary";

const Center = ({ children }) => (
  <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center",
    fontFamily: "system-ui", color: "#18211C", padding: 24, textAlign: "center" }}>{children}</div>
);

export default function Page() {
  const [user, setUser] = useState(undefined); // undefined = checking
  const [err, setErr] = useState("");

  useEffect(() => {
    let settled = false;
    // Safety net: never let the app hang on "Loading…". If auth hasn't resolved
    // in 6s, fall through (degraded/no-auth) instead of spinning forever.
    const timer = setTimeout(() => { if (!settled) setUser(null); }, 6000);

    if (!isConfigured) {
      // No Supabase configured → skip auth entirely, render the app.
      settled = true; clearTimeout(timer); setUser(null);
      return () => clearTimeout(timer);
    }

    auth.getUser()
      .then(({ data }) => { settled = true; clearTimeout(timer); const u = data?.user || null; setUser(u);
        try { if (u) { const a = JSON.parse(sessionStorage.getItem("cos_activity")||"{}"); a.userId = u.id; sessionStorage.setItem("cos_activity", JSON.stringify(a)); } } catch {} })
      .catch((e) => { settled = true; clearTimeout(timer); console.error(e); setErr("Auth check failed — continuing without sign-in."); setUser(null); });

    const { data: sub } = auth.onChange((u) => setUser(u));
    return () => { clearTimeout(timer); sub?.subscription?.unsubscribe?.(); };
  }, []);

  if (user === undefined) return <Center>Loading…</Center>;

  // If auth is configured and nobody is signed in, show the auth screen.
  // If auth is NOT configured (or errored), skip straight into the app (no-auth mode).
  if (isConfigured && !user) return <AuthScreen onAuthed={setUser} />;

  return (
    <ErrorBoundary>
      {err && <div style={{ background: "#FBF3DF", color: "#7A5912", fontSize: 12.5, padding: "8px 14px", textAlign: "center", fontFamily: "system-ui" }}>{err}</div>}
      {!isConfigured && (
        <div style={{ background: "#E1EDF2", color: "#1E4F66", fontSize: 12.5, padding: "8px 14px", textAlign: "center", fontFamily: "system-ui" }}>
          Running without sign-in — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel to enable accounts.
        </div>
      )}
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", paddingTop: 24 }}>
        <CareerOSApp />
      </div>
    </ErrorBoundary>
  );
}
