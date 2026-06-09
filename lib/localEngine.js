"use client";
// Zero-AI engines for the core loop: resume score, salary estimate, and job match
// scoring. These always produce real numbers so the dashboard works without any
// AI credits. AI, when available, refines/explains on top of these.

const allSkills = (p) => [...(p?.skills || []), ...(p?.technicalSkills || [])].map((s) => String(s).toLowerCase());
const certNames = (p) => (p?.certifications || []).map((c) => (typeof c === "string" ? c : c?.name || "")).filter(Boolean);

/* ---------------- RESUME SCORE ---------------- */
export function scoreResumeLocal(p) {
  let score = 40;
  const strengths = [], weaknesses = [], topFixes = [];

  const skills = allSkills(p);
  const certs = certNames(p);
  const work = p?.workHistory || [];
  const edu = p?.education || [];

  if (skills.length >= 8) { score += 14; strengths.push(`${skills.length} skills listed`); }
  else if (skills.length >= 4) { score += 8; strengths.push("Good core skills"); }
  else { weaknesses.push("Few skills listed"); topFixes.push("Add 8–12 relevant skills and tools"); }

  if (work.length >= 3) { score += 14; strengths.push(`${work.length} roles of experience`); }
  else if (work.length >= 1) { score += 8; }
  else { weaknesses.push("No work history detected"); topFixes.push("Add your work experience with dates"); }

  const hasMetrics = work.some((w) => (w.highlights || []).some((h) => /\d/.test(h)));
  if (hasMetrics) { score += 8; strengths.push("Quantified achievements"); }
  else { weaknesses.push("Bullets lack measurable results"); topFixes.push("Add numbers/%/$ to your achievements"); }

  if (certs.length >= 1) { score += 8; strengths.push(`${certs.length} certification${certs.length > 1 ? "s" : ""}`); }
  else { topFixes.push("Add any certifications you hold"); }

  if (edu.length >= 1) { score += 6; strengths.push("Education listed"); }
  if (p?.clearance && !/^none$/i.test(p.clearance)) { score += 6; strengths.push(`${p.clearance} clearance`); }
  if (p?.summary && p.summary.length > 40) score += 4;
  else topFixes.push("Add a 2–3 line professional summary");

  score = Math.max(35, Math.min(96, score));
  const potentialScore = Math.min(98, score + (topFixes.length ? 8 + topFixes.length * 2 : 4));

  return {
    score, potentialScore,
    strengths: strengths.slice(0, 3),
    weaknesses: (weaknesses.length ? weaknesses : ["Tailor wording to target roles"]).slice(0, 3),
    topFixes: (topFixes.length ? topFixes : ["Mirror keywords from target job posts"]).slice(0, 3),
    _source: "local",
  };
}

/* ---------------- SALARY (heuristic, no AI) ---------------- */
// Rough US base ranges by role family (k = thousands), adjusted by signals.
const ROLE_BANDS = [
  [/principal|director|vp|head of|chief/i, [150, 230]],
  [/senior|sr\.?|lead|staff|manager/i, [115, 165]],
  [/engineer|developer|analyst|scientist|architect/i, [85, 135]],
  [/product manager|program manager|project manager|pm\b/i, [95, 150]],
  [/cyber|security|network/i, [90, 145]],
  [/specialist|coordinator|associate|administrator/i, [60, 95]],
];
const METRO_MULT = { "san francisco": 1.25, "new york": 1.2, seattle: 1.18, boston: 1.15, washington: 1.12,
  austin: 1.06, denver: 1.05, atlanta: 1.0, dallas: 1.0, chicago: 1.05, remote: 1.05 };

export function estimateSalaryLocal(p, prefs) {
  const title = ((prefs?.titles || [])[0] || (p?.workHistory || [])[0]?.title || "professional").toLowerCase();
  let band = [80, 120];
  for (const [re, b] of ROLE_BANDS) if (re.test(title)) { band = b; break; }

  const yrs = (p?.workHistory || []).length;
  const expBump = Math.min(0.25, yrs * 0.05);
  const certs = certNames(p);
  const certBump = Math.min(0.12, certs.length * 0.03);
  const cleared = p?.clearance && !/^none$/i.test(p.clearance);
  const clearBump = cleared ? (/ts\/sci|top secret/i.test(p.clearance) ? 0.18 : 0.1) : 0;

  const city = (prefs?.remoteOnly ? "remote" : (prefs?.city || "")).toLowerCase();
  const geo = METRO_MULT[city] || 1.0;

  const mult = (1 + expBump + certBump + clearBump) * geo;
  const low = Math.round(band[0] * mult);
  const high = Math.round(band[1] * mult);
  const expLow = Math.round(low + (high - low) * 0.25);
  const expHigh = Math.round(low + (high - low) * 0.7);

  const fmt = (n) => `$${n}k`;
  let verdict = "";
  const target = parseInt(String(prefs?.salaryTarget || "").replace(/[^0-9]/g, "")) || 0;
  const targetK = target > 1000 ? Math.round(target / 1000) : target;
  if (targetK) {
    if (targetK <= expHigh) verdict = `Your $${targetK}k target is within reach for ${title} roles${cleared ? " — your clearance helps" : ""}.`;
    else verdict = `$${targetK}k is above the typical range here; senior/lead${cleared ? "/cleared" : ""} roles get you there.`;
  }

  return {
    marketLow: fmt(low), expectedLow: fmt(expLow), expectedHigh: fmt(expHigh), marketHigh: fmt(high),
    potentialLow: fmt(expHigh), potentialHigh: fmt(Math.round(high * 1.12)),
    targetVerdict: verdict,
    bestTitles: [], recommendedCerts: [],
    _source: "local",
  };
}

/* ---------------- JOB MATCH SCORE (no AI) ---------------- */
// Scores a job against the profile using skill overlap, title alignment,
// clearance, certifications, and location/remote fit.
export function matchJobLocal(p, prefs, job) {
  const text = `${job.title || ""} ${job.description || ""}`.toLowerCase();
  const skills = allSkills(p);
  const targets = (prefs?.titles || []).map((t) => t.toLowerCase());

  let score = 50;
  const why = [];

  // skill overlap
  const hits = skills.filter((s) => s && text.includes(s));
  score += Math.min(24, hits.length * 4);
  if (hits.length) why.push(`Matches your ${hits.slice(0, 3).join(", ")}`);

  // title alignment
  const titleHit = targets.find((t) => t && (text.includes(t) || t.split(" ").filter((w) => w.length > 3).some((w) => (job.title || "").toLowerCase().includes(w))));
  if (titleHit) { score += 12; why.push(`Aligns with your target "${titleHit}"`); }

  // clearance
  if (p?.clearance && !/^none$/i.test(p.clearance)) {
    if (/clearance|ts\/sci|top secret|secret|public trust|cleared/i.test(text)) { score += 8; why.push(`Your ${p.clearance} clearance fits`); }
  }

  // certifications
  const certs = certNames(p).map((c) => c.toLowerCase());
  const certHit = certs.find((c) => c && text.includes(c.split(" ")[0]));
  if (certHit) { score += 6; why.push(`Your ${certHit} certification is relevant`); }

  // location / remote fit
  const loc = (job.location || "").toLowerCase();
  const remote = loc.includes("remote") || job.workType === "Remote";
  if (prefs?.remoteOnly && remote) { score += 6; why.push("Remote, as you prefer"); }
  else if (prefs?.city && loc.includes(prefs.city.toLowerCase())) { score += 6; why.push(`In ${prefs.city}`); }

  const match = Math.max(45, Math.min(97, Math.round(score)));
  // interview probability: derived, slightly below match, nudged by competitiveness signals
  const interview = Math.max(30, Math.min(92, Math.round(match - 12 + (hits.length > 4 ? 6 : 0) + (titleHit ? 4 : 0))));

  // missing skills = common JD keywords not in profile (lightweight)
  const jdWords = Array.from(new Set((text.match(/[a-z][a-z+.#]{2,}/g) || [])));
  const missing = ["AWS", "Splunk", "SIEM", "Kubernetes", "Tableau", "Agile", "Python", "SQL"]
    .filter((k) => text.includes(k.toLowerCase()) && !skills.includes(k.toLowerCase())).slice(0, 4);

  return {
    ...job,
    match, interview,
    why: why.slice(0, 4),
    strengths: why.slice(0, 4),
    missing,
    improve: missing.map((m) => `Add ${m} to your resume`),
    futureMatch: Math.min(97, match + missing.length * 4),
    _source: "local",
  };
}
