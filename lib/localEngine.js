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

/* ---------------- CAREER READINESS SCORE (no AI) ---------------- */
export function readinessLocal(p, score) {
  const skills = allSkills(p), certs = certNames(p), work = p?.workHistory || [], edu = p?.education || [];
  const resume = score?.score ?? scoreResumeLocal(p).score;
  const skillScore = Math.min(100, skills.length * 9);
  const certScore = Math.min(100, 40 + certs.length * 20);
  const eduScore = edu.length ? (/(b\.?s|b\.?a|bachelor|master|m\.?s|phd)/i.test(JSON.stringify(edu)) ? 85 : 60) : 40;
  const interviewReady = Math.min(100, 40 + work.length * 10 + (certs.length ? 10 : 0));
  const overall = Math.round(resume * 0.3 + skillScore * 0.25 + certScore * 0.2 + eduScore * 0.15 + interviewReady * 0.1);
  // biggest gap → improvement tip
  const parts = [["Resume", resume], ["Skills", skillScore], ["Certifications", certScore], ["Education", eduScore], ["Interview readiness", interviewReady]];
  const weakest = parts.slice().sort((a, b) => a[1] - b[1])[0];
  const tip = {
    "Education": "Finish or add your degree to raise your readiness fastest.",
    "Resume": "Add measurable achievements (numbers, %, $) to your bullets.",
    "Skills": "Add 5–8 more in-demand skills relevant to your target roles.",
    "Certifications": "Add an industry certification (e.g. AWS, Security+, PMP).",
    "Interview readiness": "Run mock interviews and prep STAR stories.",
  }[weakest[0]];
  return { overall, breakdown: { Resume: resume, Skills: skillScore, Certifications: certScore, Education: eduScore, "Interview readiness": interviewReady }, tip, weakest: weakest[0] };
}
// Scores a job against the profile using skill overlap, title alignment,
// clearance, certifications, and location/remote fit.
export function matchJobLocal(p, prefs, job) {
  const text = `${job.title || ""} ${job.description || ""}`.toLowerCase();
  const skills = allSkills(p);
  const targets = (prefs?.titles || []).map((t) => t.toLowerCase());

  // Honest baseline: a sparse/empty profile should NOT score high.
  const completeness =
    (skills.length >= 3 ? 1 : skills.length / 3) * 0.4 +
    ((p?.workHistory || []).length >= 1 ? 1 : 0) * 0.3 +
    (certNames(p).length >= 1 ? 1 : 0) * 0.15 +
    ((p?.education || []).length >= 1 ? 1 : 0) * 0.15;
  let score = 22 + Math.round(completeness * 22); // 22–44 base depending on how complete the profile is
  const why = [];

  // skill overlap (the biggest real signal)
  const hits = skills.filter((s) => s && text.includes(s));
  score += Math.min(28, hits.length * 5);
  if (hits.length) why.push(`Matches your ${hits.slice(0, 3).join(", ")}`);

  // title alignment
  const titleHit = targets.find((t) => t && (text.includes(t) || t.split(" ").filter((w) => w.length > 3).some((w) => (job.title || "").toLowerCase().includes(w))));
  if (titleHit) { score += 12; why.push(`Aligns with your target "${titleHit}"`); }

  // clearance
  if (p?.clearance && !/^none$/i.test(p.clearance)) {
    if (/clearance|ts\/sci|top secret|secret|public trust|cleared/i.test(text)) { score += 9; why.push(`Your ${p.clearance} clearance fits`); }
  }

  // certifications
  const certs = certNames(p).map((c) => c.toLowerCase());
  const certHit = certs.find((c) => c && text.includes(c.split(" ")[0]));
  if (certHit) { score += 7; why.push(`Your ${certHit} certification is relevant`); }

  // location / remote fit
  const loc = (job.location || "").toLowerCase();
  const remote = loc.includes("remote") || job.workType === "Remote";
  if (prefs?.remoteOnly && remote) { score += 5; why.push("Remote, as you prefer"); }
  else if (prefs?.city && loc.includes(prefs.city.toLowerCase())) { score += 5; why.push(`In ${prefs.city}`); }

  // No artificial floor — weak matches read weak (honest).
  const match = Math.max(8, Math.min(97, Math.round(score)));
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
