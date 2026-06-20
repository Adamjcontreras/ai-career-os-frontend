import { NextResponse } from "next/server";
import { APP_VERSION, BUILD_TIME, SCHEMA_VERSION, COMMIT_SHA, COMMIT_SHORT, AI_MODEL } from "../../../lib/version";

export const runtime = "nodejs";
export const maxDuration = 60;

// Runs REAL calls against Anthropic so the diagnostics page can prove the AI path
// works end-to-end (connectivity, credits, and each engine). No fabricated results.
async function callAnthropic(key, messages, max_tokens = 200) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: AI_MODEL, max_tokens, messages }),
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: r.ok, status: r.status, data };
}

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  const out = {
    frontendVersion: APP_VERSION,
    frontendBuildTime: BUILD_TIME,
    commit: COMMIT_SHA,
    commitShort: COMMIT_SHORT,
    schemaVersion: SCHEMA_VERSION,
    aiModel: AI_MODEL,
    apiKeyTest: "pending",
    connected: false,
    creditsAvailable: null,
    lastSuccess: null,
    backendJobUrl: process.env.BACKEND_JOB_URL ? "set" : "missing",
    supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing",
    tests: { parser: { ok: false, note: "" }, coach: { ok: false, note: "" }, optimizer: { ok: false, note: "" } },
    error: "",
  };

  // 0) Backend probe — confirms the job proxy is reachable and reports its build.
  out.backend = { reachable: false, version: null, url: process.env.BACKEND_JOB_URL || "" };
  if (process.env.BACKEND_JOB_URL) {
    try {
      const base = process.env.BACKEND_JOB_URL.replace(/\/jobs\/?$/, "");
      const hr = await fetch(base + "/health");
      if (hr.ok) { const hd = await hr.json(); out.backend.reachable = true; out.backend.version = hd.version || "unknown"; out.backend.commit = hd.commitShort || hd.commit || "unknown"; }
    } catch { /* backend may be asleep on free tier */ }
  }

  if (!key) {
    out.error = "ANTHROPIC_API_KEY is not set in Vercel environment variables.";
    out.apiKeyTest = "fail (missing key)";
    return NextResponse.json(out, { status: 200 });
  }

  // 1) Connectivity + credit check (a tiny call)
  try {
    const ping = await callAnthropic(key, [{ role: "user", content: "Reply with the single word: ok" }], 10);
    if (ping.ok) { out.connected = true; out.creditsAvailable = true; out.apiKeyTest = "pass"; out.lastSuccess = new Date().toISOString(); }
    else {
      out.connected = ping.status !== 401 && ping.status !== 403;
      const msg = (ping.data?.error?.message || "").toLowerCase();
      if (ping.status === 401 || ping.status === 403) { out.error = "Invalid API key (auth failed)."; out.apiKeyTest = "fail (auth)"; }
      else if (msg.includes("credit") || msg.includes("balance")) { out.creditsAvailable = false; out.error = "Credit balance too low."; out.apiKeyTest = "fail (no credit)"; }
      else { out.error = ping.data?.error?.message || ("HTTP " + ping.status); out.apiKeyTest = "fail (" + ping.status + ")"; }
      return NextResponse.json(out, { status: 200 });
    }
  } catch (e) {
    out.error = "Network error reaching Anthropic: " + (e?.message || "unknown");
    out.apiKeyTest = "fail (network)";
    return NextResponse.json(out, { status: 200 });
  }

  // 2) Parser test — does the model return structured JSON for a tiny resume?
  try {
    const r = await callAnthropic(key, [{ role: "user", content:
      `Extract JSON {"name":"","skills":[]} from this resume. Return ONLY JSON.\nJANE DOE\nSkills: Python, SQL` }], 120);
    const txt = (r.data?.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
    out.tests.parser.ok = !!(parsed.name || (parsed.skills || []).length);
    out.tests.parser.note = out.tests.parser.ok ? `parsed name="${parsed.name}", ${parsed.skills?.length || 0} skills` : "no structured data";
  } catch (e) { out.tests.parser.note = "parse test failed: " + (e?.message || "error"); }

  // 3) Coach test — short coaching reply
  try {
    const r = await callAnthropic(key, [{ role: "user", content: "In one sentence, give a job-search tip." }], 60);
    const txt = (r.data?.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    out.tests.coach.ok = txt.trim().length > 10;
    out.tests.coach.note = out.tests.coach.ok ? txt.trim().slice(0, 80) : "empty reply";
  } catch (e) { out.tests.coach.note = "coach test failed: " + (e?.message || "error"); }

  // 4) Optimizer test — rewrite a bullet
  try {
    const r = await callAnthropic(key, [{ role: "user", content: "Rewrite stronger, one line: 'Did customer service.'" }], 60);
    const txt = (r.data?.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    out.tests.optimizer.ok = txt.trim().length > 12;
    out.tests.optimizer.note = out.tests.optimizer.ok ? txt.trim().slice(0, 80) : "empty reply";
  } catch (e) { out.tests.optimizer.note = "optimizer test failed: " + (e?.message || "error"); }

  out.lastSuccess = new Date().toISOString();
  return NextResponse.json(out, { status: 200 });
}
