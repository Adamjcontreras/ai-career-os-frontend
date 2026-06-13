"use client";
import { useEffect } from "react";
import { applications, savedMatches, coach, settings, resumes } from "./data";

// usePersistence — wires the existing in-memory app state to Supabase with no UI
// changes. Call it from inside CareerOSApp, passing the relevant state + setters.
// It (a) hydrates from the DB on mount, and (b) writes through on change.
//
// Integration is intentionally additive: the app keeps working exactly as-is even
// if these calls fail (offline / not configured) — they just no-op.
export function usePersistence({
  tracker, setTracker,
  prefs, setPrefs,
  profile, setProfile,
}) {
  // hydrate on mount
  useEffect(() => {
    (async () => {
      try {
        const [apps, s, active] = await Promise.all([
          applications.list(), settings.get(), resumes.active(),
        ]);
        if (apps?.length) setTracker(apps.map(mapAppRow));
        if (s) setPrefs((p) => ({ ...p, titles: s.titles || p.titles, city: s.city || p.city, state: s.state || p.state, radius: s.radius || p.radius, remoteOnly: s.remote_only ?? p.remoteOnly, workTypes: s.work_types || p.workTypes, salaryTarget: s.salary_target || p.salaryTarget }));
        if (active?.parsed) setProfile((pr) => pr || active.parsed);
      } catch { /* not configured / offline → app still works in-memory */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // write settings through when prefs change
  useEffect(() => {
    if (!prefs) return;
    settings.save({
      titles: prefs.titles, city: prefs.city, state: prefs.state, radius: String(prefs.radius),
      remote_only: prefs.remoteOnly, work_types: prefs.workTypes, salary_target: prefs.salaryTarget,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(prefs)]);
}

function mapAppRow(r) {
  return {
    id: r.id, title: r.title, company: r.company, location: r.location,
    workType: r.work_type, salary: r.salary, source: r.source, applyUrl: r.apply_url,
    match: r.match_score, interview: r.interview_prob, stage: r.stage,
    savedAt: r.created_at?.slice(0, 10), appliedAt: r.applied_at, ...r.job_payload,
  };
}

// Re-export the write helpers so CareerOSApp can persist individual actions:
//   import { persist } from "../lib/usePersistence";
//   persist.application(job, "Applied");
export const persist = {
  application: (job, stage) => applications.upsert(job, stage).catch(() => {}),
  setStage: (id, stage) => applications.setStage(id, stage).catch(() => {}),
  savedMatch: (job) => savedMatches.add(job).catch(() => {}),
  coach: (role, content) => coach.add(role, content).catch(() => {}),
  resume: (payload) => resumes.saveParsed(payload).then((r) => {
    try { const id = r?.data?.id; if (id && typeof window !== "undefined") { const a = JSON.parse(sessionStorage.getItem("cos_activity")||"{}"); a.resumeId = id; sessionStorage.setItem("cos_activity", JSON.stringify(a)); } } catch {}
    return r;
  }).catch(() => {}),
};
