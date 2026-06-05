"use client";
import { useState } from "react";
import { auth } from "../lib/data";

// Sign in / sign up. Styled to match the app's palette so the entry feels native.
export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      if (mode === "signup") {
        const { data, error } = await auth.signUp(email, password);
        if (error) throw error;
        if (data.user && !data.session) setNotice("Check your email to confirm your account, then sign in.");
        else if (data.user) onAuthed(data.user);
      } else {
        const { data, error } = await auth.signIn(email, password);
        if (error) throw error;
        onAuthed(data.user);
      }
    } catch (e) { setError(e.message || "Something went wrong."); }
    finally { setBusy(false); }
  };

  const C = {
    wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Hanken Grotesk',system-ui,sans-serif", background: "#F4F0E7", padding: 20 },
    card: { width: "100%", maxWidth: 380, background: "#fff", borderRadius: 24, padding: 28, boxShadow: "0 20px 60px -24px rgba(0,0,0,.3)" },
    logo: { width: 56, height: 56, borderRadius: 17, background: "#0E5C4A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontWeight: 800, fontSize: 22 },
    h: { fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 600, textAlign: "center", margin: "0 0 4px", color: "#18211C" },
    sub: { textAlign: "center", color: "#6C766C", fontSize: 14, margin: "0 0 22px" },
    input: { width: "100%", fontSize: 15, padding: "13px 14px", border: "1.5px solid #ECE6DA", borderRadius: 13, marginBottom: 11, outline: "none", boxSizing: "border-box" },
    btn: { width: "100%", fontWeight: 700, fontSize: 15, border: "none", borderRadius: 13, padding: 14, background: "#0E5C4A", color: "#fff", cursor: "pointer" },
    link: { background: "none", border: "none", color: "#0E5C4A", fontWeight: 700, cursor: "pointer", fontSize: 13.5 },
    err: { background: "#FAE7DC", color: "#C0492E", padding: "10px 12px", borderRadius: 11, fontSize: 13, marginBottom: 11 },
    ok: { background: "#E4EFE9", color: "#0E5C4A", padding: "10px 12px", borderRadius: 11, fontSize: 13, marginBottom: 11 },
  };

  return (
    <div style={C.wrap}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Hanken+Grotesk:wght@400;600;700;800&display=swap" />
      <div style={C.card}>
        <div style={C.logo}>OS</div>
        <h1 style={C.h}>AI Career OS</h1>
        <p style={C.sub}>{mode === "signup" ? "Create your account" : "Welcome back"}</p>
        {error && <div style={C.err}>{error}</div>}
        {notice && <div style={C.ok}>{notice}</div>}
        <input style={C.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={C.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <button style={{ ...C.btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13.5, color: "#6C766C" }}>
          {mode === "signup" ? "Already have an account? " : "New here? "}
          <button style={C.link} onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setNotice(""); }}>
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
