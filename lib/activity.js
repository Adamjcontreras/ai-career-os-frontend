"use client";
// Lightweight activity log so the admin diagnostics page can show real runtime
// evidence: last successful parse, job match, coach reply, upload, plus current
// user/resume IDs. Uses sessionStorage so it survives in-tab navigation to
// /diagnostics. (Not localStorage — avoids stale cross-session values.)

const KEY = "cos_activity";
const read = () => {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(sessionStorage.getItem(KEY) || "{}"); } catch { return {}; }
};
const write = (obj) => { try { sessionStorage.setItem(KEY, JSON.stringify(obj)); } catch {} };

export const activity = {
  mark(event, detail = "") {
    const a = read();
    a[event] = { at: new Date().toISOString(), detail: String(detail).slice(0, 120) };
    write(a);
  },
  set(key, value) { const a = read(); a[key] = value; write(a); },
  all() { return read(); },
};
