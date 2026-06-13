"use client";
import { useState, useEffect } from "react";
import { activity } from "../../lib/activity";

const C = { paper:"#F4F0E7", card:"#FFFFFF", ink:"#18211C", muted:"#6C766C", line:"#ECE6DA", primary:"#0E5C4A", ok:"#1E7A4D", bad:"#B4452F" };
const fmt = (iso) => iso ? new Date(iso).toLocaleString() : "—";

function Row({ label, state, note }) {
  const color = state === true ? C.ok : state === false ? C.bad : C.muted;
  const text = state === true ? "Yes" : state === false ? "No" : (state == null ? "—" : String(state));
  return (
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, padding:"12px 0", borderBottom:`1px solid ${C.line}` }}>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700, fontSize:13.5, color:C.ink }}>{label}</div>
        {note ? <div style={{ fontSize:12, color:C.muted, marginTop:3, lineHeight:1.4, wordBreak:"break-word" }}>{note}</div> : null}
      </div>
      <span style={{ fontWeight:800, fontSize:12.5, color, whiteSpace:"nowrap", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis" }}>{text}</span>
    </div>
  );
}
function Card({ title, children }) {
  return (
    <div style={{ background:C.card, borderRadius:18, padding:"6px 18px 12px", border:`1px solid ${C.line}`, marginBottom:14 }}>
      <div style={{ fontSize:11, fontWeight:800, letterSpacing:".06em", textTransform:"uppercase", color:C.muted, padding:"12px 0 4px" }}>{title}</div>
      {children}
    </div>
  );
}

export default function Diagnostics() {
  const [d, setD] = useState(null);
  const [act, setAct] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true); setErr("");
    setAct(activity.all());
    try { const r = await fetch("/api/diagnostics"); setD(await r.json()); }
    catch { setErr("Could not reach the diagnostics endpoint."); }
    finally { setLoading(false); }
  };
  useEffect(() => { run(); }, []);

  return (
    <div style={{ minHeight:"100vh", background:C.paper, fontFamily:"'Hanken Grotesk',system-ui,sans-serif", color:C.ink, padding:"26px 18px" }}>
      <div style={{ maxWidth:480, margin:"0 auto" }}>
        <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:25, fontWeight:600, margin:"0 0 4px" }}>Admin Diagnostics</h1>
        <p style={{ color:C.muted, fontSize:13, margin:"0 0 18px" }}>Live proof of what you're running. Real calls, no mock data.</p>

        {loading && <div style={{ color:C.muted, fontSize:14, padding:"30px 0", textAlign:"center" }}>Running live tests… (~15s)</div>}
        {err && <div style={{ background:"#FBEDE9", color:C.bad, padding:"12px 14px", borderRadius:12, fontSize:13.5 }}>{err}</div>}

        {d && !loading && (
          <>
            <Card title="Build / Version">
              <Row label="Frontend version" state={d.frontendVersion || "unknown"} />
              <Row label="Frontend commit" state={d.commitShort || "unknown"} note={d.commit && d.commit.startsWith("unknown") ? "Set NEXT_PUBLIC_COMMIT_SHA in Vercel env" : d.commit} />
              <Row label="Frontend build time" state={null} note={fmt(d.frontendBuildTime)} />
              <Row label="Backend version" state={d.backend?.version || "unreachable"} />
              <Row label="Backend commit" state={d.backend?.commit || "—"} />
              <Row label="Schema version" state={d.schemaVersion || "unknown"} />
              <Row label="Anthropic model" state={null} note={d.aiModel} />
            </Card>

            <Card title="Connections">
              <Row label="Connected backend URL" state={null} note={d.backend?.url || "BACKEND_JOB_URL missing"} />
              <Row label="Backend reachable" state={!!d.backend?.reachable} note={d.backend?.reachable ? "" : "Free-tier may be asleep; re-run"} />
              <Row label="Supabase configured" state={d.supabase === "set"} />
              <Row label="Anthropic connected" state={d.connected} note={d.error && !d.connected ? d.error : ""} />
              <Row label="API key test" state={d.apiKeyTest === "pass" ? true : (d.apiKeyTest && d.apiKeyTest.startsWith("fail") ? false : null)} note={d.apiKeyTest !== "pass" ? d.apiKeyTest : ""} />
              <Row label="Credits available" state={d.creditsAvailable} note={d.creditsAvailable === false ? "Add credit at console.anthropic.com" : ""} />
            </Card>

            <Card title="AI Engine Tests (live)">
              <Row label="Resume parser test" state={d.tests?.parser?.ok} note={d.tests?.parser?.note} />
              <Row label="AI coach test" state={d.tests?.coach?.ok} note={d.tests?.coach?.note} />
              <Row label="Resume optimizer test" state={d.tests?.optimizer?.ok} note={d.tests?.optimizer?.note} />
              <Row label="Last successful AI request" state={null} note={fmt(d.lastSuccess)} />
            </Card>

            <Card title="Your Session Activity">
              <Row label="Last resume upload" state={null} note={fmt(act.upload?.at)} />
              <Row label="Last successful resume parse" state={null} note={act.parse ? `${fmt(act.parse.at)} - ${act.parse.detail}` : "-"} />
              <Row label="Last job match request" state={null} note={act.match ? `${fmt(act.match.at)} - ${act.match.detail}` : "-"} />
              <Row label="Last AI coach response" state={null} note={fmt(act.coach?.at)} />
              <Row label="Current user ID" state={null} note={act.userId || "not signed in / not captured"} />
              <Row label="Current resume ID (dashboard)" state={null} note={act.resumeId || "none loaded"} />
            </Card>
          </>
        )}

        <button onClick={run} disabled={loading}
          style={{ marginTop:4, width:"100%", padding:"13px", borderRadius:14, border:"none", background:C.primary, color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"inherit", opacity:loading?0.6:1 }}>
          {loading ? "Running..." : "Re-run diagnostics"}
        </button>
        <p style={{ color:C.muted, fontSize:11.5, textAlign:"center", marginTop:14, lineHeight:1.5 }}>
          Bookmark <b>/diagnostics</b>. Session activity reflects actions taken in this browser tab.
        </p>
      </div>
    </div>
  );
}
