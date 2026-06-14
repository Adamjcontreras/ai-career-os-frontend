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
// Domain detection so we can hard-penalize unrelated fields (e.g. a medical job
// for a cyber/comms candidate should score near zero, not 53%).
const DOMAINS = {
  tech: /\b(software|developer|engineer|cyber|security|network|cloud|systems|data|it |information technology|devops|program manager|technical|infrastructure|sre|analyst)\b/i,
  medical: /\b(medical|clinical|nurse|nursing|patient|health records|pharmacy|physician|dental|radiolog|phlebotom|caregiver|therapist)\b/i,
  legal: /\b(attorney|paralegal|legal counsel|litigation|law clerk)\b/i,
  finance: /\b(accountant|accounting|auditor|bookkeep|tax preparer|teller|loan officer)\b/i,
  trades: /\b(plumber|electrician|welder|hvac|carpenter|machinist|mechanic)\b/i,
  food: /\b(barista|server|cook|chef|cashier|bartender|dishwasher)\b/i,
  retail: /\b(retail|sales associate|store associate|merchandiser|stock)\b/i,
};
function profileDomains(p, prefs) {
  const blob = `${(prefs?.titles||[]).join(" ")} ${allSkills(p).join(" ")} ${certNames(p).join(" ")} ${(p?.workHistory||[]).map(w=>w.title).join(" ")}`;
  return Object.entries(DOMAINS).filter(([,re]) => re.test(blob)).map(([k]) => k);
}
function jobDomains(job) {
  const blob = `${job.title||""} ${job.description||""}`;
  return Object.entries(DOMAINS).filter(([,re]) => re.test(blob)).map(([k]) => k);
}

// WEIGHTED scoring: Experience 40 / Skills 30 / Certs 15 / Education 10 / Title 5,
// with a hard penalty when the job's domain doesn't overlap the candidate's.
export function matchJobLocal(p, prefs, job) {
  const text = `${job.title || ""} ${job.description || ""}`.toLowerCase();
  const skills = allSkills(p);
  const certs = certNames(p).map((c) => c.toLowerCase());
  const targets = (prefs?.titles || []).map((t) => t.toLowerCase());
  const why = [], missing = [];

  // ---- component scores (each 0..1) ----
  // Experience (40%): do the candidate's prior titles/skills appear in the JD?
  const roleWords = (p?.workHistory||[]).flatMap(w => (w.title||"").toLowerCase().split(/\s+/)).filter(x => x.length > 3);
  const roleHit = roleWords.filter(w => text.includes(w)).length;
  const yrs = (p?.workHistory||[]).length;
  const expScore = Math.min(1, roleHit * 0.25 + Math.min(0.5, yrs * 0.15));

  // Skills (30%)
  const hits = skills.filter((s) => s && text.includes(s));
  const skillScore = Math.min(1, hits.length / 6);
  if (hits.length) why.push(`${hits.length} of your skills match (${hits.slice(0,3).join(", ")})`);

  // Certifications (15%)
  const certHits = certs.filter((c) => c && text.includes(c.split(" ")[0]));
  const certScore = certs.length ? Math.min(1, certHits.length / Math.max(1, Math.min(certs.length,3))) : 0;
  certHits.forEach(c => why.push(`${c.toUpperCase()} matches a requirement`));

  // Education (10%)
  const eduScore = (p?.education||[]).length ? (/(b\.?s|b\.?a|bachelor|master|degree)/i.test(text) ? 1 : 0.5) : 0;

  // Title similarity (5%)
  const titleHit = targets.find((t) => t && (text.includes(t) || t.split(" ").filter((w)=>w.length>3).some((w)=>(job.title||"").toLowerCase().includes(w))));
  const titleScore = titleHit ? 1 : 0;
  if (titleHit) why.push(`Aligns with your target "${titleHit}"`);

  // clearance bonus (real differentiator for cleared candidates)
  let clearanceBonus = 0;
  if (p?.clearance && !/^none$/i.test(p.clearance) && /clearance|ts\/sci|top secret|secret|public trust|cleared/i.test(text)) {
    clearanceBonus = 8; why.push(`Your ${p.clearance} clearance is required/preferred`);
  }

  let score = Math.round(
    expScore*40 + skillScore*30 + certScore*15 + eduScore*10 + titleScore*5 + clearanceBonus
  );

  // ---- DOMAIN MISMATCH PENALTY ----
  const pDom = profileDomains(p, prefs), jDom = jobDomains(job);
  const overlap = jDom.some(d => pDom.includes(d));
  if (pDom.length && jDom.length && !overlap) {
    score = Math.min(score, 12); // unrelated field (e.g. medical for a cyber vet) → near zero
    why.length = 0; why.push(`Outside your field (${jDom[0]}) — low relevance`);
  }

  const match = Math.max(3, Math.min(97, score));
  // interview probability scales with match and competitiveness
  const interview = Math.max(5, Math.min(92, Math.round(match - 10 + (hits.length>4?6:0) + (clearanceBonus?5:0))));

  // missing requirements (real keywords in JD not in profile)
  ["AWS","Azure","Splunk","SIEM","Kubernetes","Tableau","Agile","Python","SQL","PMP","Scrum","Linux","Terraform"]
    .forEach((k) => { if (text.includes(k.toLowerCase()) && !skills.includes(k.toLowerCase()) && !certs.includes(k.toLowerCase())) missing.push(k); });

  return {
    ...job,
    match, interview,
    why: (why.length ? why : ["Partial match to your profile"]).slice(0, 5),
    strengths: why.slice(0, 5),
    missing: missing.slice(0, 5),
    improve: missing.slice(0, 5).map((m) => `Add ${m} to your resume`),
    futureMatch: Math.min(97, match + missing.length * 3),
    _source: "local",
  };
}
