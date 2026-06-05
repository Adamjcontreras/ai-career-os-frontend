"use client";
import { useEffect, useState } from "react";
import { auth } from "../lib/data";
import CareerOSApp from "../components/CareerOSApp";
import AuthScreen from "../components/AuthScreen";

// Gate: if logged in, render the existing app (UI untouched). Otherwise show auth.
export default function Page() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: sub } = auth.onChange((u) => setUser(u));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  if (user === undefined)
    return <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#6C766C" }}>Loading…</div>;

  if (!user) return <AuthScreen onAuthed={setUser} />;

  // Logged in → the original Career OS app, pixel-for-pixel unchanged.
  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", paddingTop: 24 }}>
      <CareerOSApp />
    </div>
  );
}
