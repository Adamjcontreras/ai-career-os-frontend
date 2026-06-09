"use client";
import { createClient, SUPABASE_CONFIGURED } from "./supabaseClient";

// Thin data-access layer over Supabase. All calls run as the logged-in user;
// RLS guarantees a user can only read/write their own rows.
// db may be null if Supabase isn't configured — every helper degrades gracefully.
const db = createClient();
export const isConfigured = SUPABASE_CONFIGURED && !!db;

/* ---------------- auth (null-safe) ---------------- */
export const auth = {
  configured: isConfigured,
  signUp: (email, password) => db ? db.auth.signUp({ email, password }) : Promise.resolve({ data: null, error: { message: "Auth not configured" } }),
  signIn: (email, password) => db ? db.auth.signInWithPassword({ email, password }) : Promise.resolve({ data: null, error: { message: "Auth not configured" } }),
  signOut: () => db ? db.auth.signOut() : Promise.resolve({ error: null }),
  getUser: () => db ? db.auth.getUser() : Promise.resolve({ data: { user: null } }),
  onChange: (cb) => db ? db.auth.onAuthStateChange((_e, session) => cb(session?.user || null)) : { data: { subscription: { unsubscribe() {} } } },
};

/* ---------------- settings ---------------- */
export const settings = {
  async get() {
    if(!db) return null;
    const { data } = await db.from("user_settings").select("*").single();
    return data;
  },
  async save(patch) {
    if(!db) return;
    const { data: u } = await db.auth.getUser();
    return db.from("user_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", u.user.id);
  },
};

/* ---------------- resumes ---------------- */
export const resumes = {
  async uploadFile(file) {
    if(!db) return null;
    const { data: u } = await db.auth.getUser();
    const path = `${u.user.id}/${Date.now()}_${file.name}`;
    const { error } = await db.storage.from("resumes").upload(path, file);
    if (error) throw error;
    return path;
  },
  async saveParsed({ filePath, fileName, parsed, score }) {
    if(!db) return null;
    const { data: u } = await db.auth.getUser();
    await db.from("resumes").update({ is_active: false }).eq("user_id", u.user.id);
    return db.from("resumes").insert({
      user_id: u.user.id, file_path: filePath, file_name: fileName, parsed,
      score: score?.score, potential: score?.potentialScore,
      strengths: score?.strengths, weaknesses: score?.weaknesses, top_fixes: score?.topFixes,
      is_active: true,
    }).select().single();
  },
  async active() {
    if(!db) return null;
    const { data } = await db.from("resumes").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();
    return data;
  },
};

/* ---------------- applications (CRM) ---------------- */
export const applications = {
  list: async () => (!db ? [] : (await db.from("applications").select("*").order("created_at", { ascending: false })).data) || [],
  async upsert(job, stage = "Saved") {
    if(!db) return null;
    const { data: u } = await db.auth.getUser();
    return db.from("applications").insert({
      user_id: u.user.id, title: job.title, company: job.company, location: job.location,
      work_type: job.workType, salary: job.salary, source: job.source, apply_url: job.applyUrl,
      match_score: job.match, interview_prob: job.interview, stage,
      applied_at: stage === "Applied" ? new Date().toISOString().slice(0, 10) : null,
      job_payload: job,
    }).select().single();
  },
  setStage: (id, stage) => !db ? null : db.from("applications").update({
    stage, updated_at: new Date().toISOString(),
    ...(stage === "Applied" ? { applied_at: new Date().toISOString().slice(0, 10) } : {}),
    ...(stage === "Interview Scheduled" ? { interview_at: new Date().toISOString().slice(0, 10) } : {}),
  }).eq("id", id),
};

/* ---------------- saved matches ---------------- */
export const savedMatches = {
  list: async () => (!db ? [] : (await db.from("saved_matches").select("*").order("created_at", { ascending: false })).data) || [],
  async add(job) {
    if(!db) return null;
    const { data: u } = await db.auth.getUser();
    return db.from("saved_matches").insert({ user_id: u.user.id, job_payload: job, match_score: job.match });
  },
  remove: (id) => !db ? null : db.from("saved_matches").delete().eq("id", id),
};

/* ---------------- coach history ---------------- */
export const coach = {
  history: async () => (!db ? [] : (await db.from("coach_messages").select("*").order("created_at", { ascending: true })).data) || [],
  async add(role, content) {
    if(!db) return null;
    const { data: u } = await db.auth.getUser();
    return db.from("coach_messages").insert({ user_id: u.user.id, role, content });
  },
};
