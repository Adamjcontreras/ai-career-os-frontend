"use client";
// Resume parsing WITHOUT any AI dependency.
// 1) extractText(file) → plain text from PDF / DOCX / TXT (all client-side)
// 2) parseResumeText(text) → structured profile via regex/heuristics
// AI is layered on top elsewhere as an optional enhancement, never required.
import mammoth from "mammoth";

/* ---------------- TEXT EXTRACTION ---------------- */
export async function extractText(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ext === "txt") {
    const t = await file.text();
    if (!t.trim()) throw new Error("EMPTY");
    return t;
  }
  if (ext === "docx") {
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!value?.trim()) throw new Error("EMPTY");
    return value;
  }
  if (ext === "pdf") {
    // pdfjs-dist runs fully in the browser — no server, no AI.
    const pdfjs = await import("pdfjs-dist");
    try {
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url").catch(() => null);
      if (worker?.default) pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      else pdfjs.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    } catch {
      pdfjs.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    }
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(" ") + "\n";
    }
    if (!text.trim()) throw new Error("EMPTY"); // likely a scanned/image PDF
    return text;
  }
  throw new Error("UNSUPPORTED");
}

/* ---------------- LOCAL HEURISTIC PARSER ---------------- */
const SKILL_DICT = [
  "JavaScript","TypeScript","Python","Java","C++","C#","Go","Ruby","PHP","Swift","Kotlin","Rust","SQL","NoSQL",
  "React","Angular","Vue","Node.js","Next.js","Django","Flask","Spring","Express",
  "AWS","Azure","GCP","Google Cloud","Docker","Kubernetes","Terraform","Linux","Windows Server",
  "Project Management","Program Management","Product Management","Agile","Scrum","Kanban","Jira",
  "Leadership","Communication","Stakeholder Management","Strategy","Operations","Budgeting",
  "Cybersecurity","Network Security","Information Security","SIEM","Splunk","Incident Response",
  "Network Operations","Networking","Cisco","Routing","Switching","Firewalls","VPN",
  "Data Analysis","Data Science","Machine Learning","Tableau","Power BI","Excel",
  "Salesforce","SAP","ServiceNow","Customer Success","Sales","Marketing","SEO",
  "Risk Management","Compliance","Auditing","Vulnerability Management","Penetration Testing",
];
const CERT_PATTERNS = [
  "Security+","Network+","A+","CISSP","CISM","CISA","CEH","CCNA","CCNP","PMP","CAPM","ITIL",
  "AWS Certified","Azure Administrator","Azure Fundamentals","Google Cloud","CompTIA","Cloud+","Linux+","PMI-ACP","Six Sigma","Scrum Master","CSM","CCSP","OSCP","Splunk Certified",
];
const CLEARANCES = [
  ["TS/SCI", /\bTS\s*\/\s*SCI\b|\btop secret\s*\/\s*sci\b|\bsci\b/i],
  ["Top Secret", /\btop secret\b|\bts\b/i],
  ["Secret", /\bsecret clearance\b|\bsecret\b/i],
  ["Public Trust", /\bpublic trust\b/i],
];
const STATE_ABBR = "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC";
// Known job-title vocabulary → only clean, title-like roles become "target roles".
const TITLE_WORDS = ["Engineer","Developer","Manager","Analyst","Architect","Administrator","Specialist","Director","Lead","Consultant","Coordinator","Scientist","Designer","Technician","Officer","Supervisor","Strategist","Advisor"];
const TITLE_PREFIX = ["Software","Senior","Principal","Staff","Product","Program","Project","Technical","Network","Cloud","Security","Cyber","Systems","Data","Information","Operations","Solutions","Business","Site Reliability","DevOps","Full Stack","Backend","Frontend","Quality","IT","Sales","Marketing","Financial","Human Resources"];
function extractTitles(text, workHistory) {
  const found = new Set();
  // 1) titles from parsed work history (most reliable)
  (workHistory || []).forEach((w) => { if (w.title && isTitleLike(w.title)) found.add(tidyTitle(w.title)); });
  // 2) scan lines for "<Prefix> <Role>" patterns
  const re = new RegExp(`\\b((?:${TITLE_PREFIX.join("|")})\\s+)?(${TITLE_WORDS.join("|")})\\b`, "g");
  let m;
  while ((m = re.exec(text)) && found.size < 8) {
    const phrase = tidyTitle((m[1] || "") + m[2]);
    if (isTitleLike(phrase)) found.add(phrase);
  }
  return [...found].slice(0, 6);
}
function isTitleLike(s) {
  if (!s) return false;
  const w = s.trim().split(/\s+/);
  if (w.length < 1 || w.length > 4) return false;        // titles are short
  if (s.length > 40) return false;
  if (/[.,;:!?@/]|\d{2,}/.test(s)) return false;          // no sentence punctuation/years
  return TITLE_WORDS.some((t) => new RegExp(`\\b${t}\\b`, "i").test(s));
}
function tidyTitle(s) {
  return s.replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}
// Military experience → civilian job titles (points 7 & 9). Improves matching for
// veterans whose resume titles ("Communications Chief") aren't civilian-searchable.
const MILITARY_MAP = [
  [/communications? (chief|sergeant|ncoic|specialist|director)|signal|s6|g6/i, ["Network Operations Manager","Technical Program Manager","Communications Systems Engineer"]],
  [/cyber|information assurance|isso|cyber operations|17[a-z]|cybersecurity/i, ["Cybersecurity Analyst","Security Operations Analyst","Information Security Engineer"]],
  [/network|ccna|systems administrat|25[a-z]|tactical network/i, ["Network Engineer","Systems Engineer","Network Administrator"]],
  [/(platoon|squad|team) (leader|sergeant)|first sergeant|operations (nco|sergeant|chief)|s3|g3/i, ["Operations Manager","Program Manager","Technical Program Manager"]],
  [/intelligence|all.source|35[a-z]|analyst/i, ["Intelligence Analyst","Data Analyst","Security Analyst"]],
  [/logistics|supply|92[a-z]|s4|g4/i, ["Operations Manager","Supply Chain Manager","Logistics Manager"]],
  [/project|program|pmp|acquisition/i, ["Program Manager","Technical Program Manager","Project Manager"]],
];
function militaryRoles(text) {
  const out = new Set();
  const isMil = /\b(ranger regiment|army|navy|air force|marine|space force|coast guard|national guard|veteran|ts\/sci|nco|noncommissioned)\b/i.test(text);
  if (!isMil) return [];
  for (const [re, roles] of MILITARY_MAP) if (re.test(text)) roles.forEach((r) => out.add(r));
  // strong default set for cleared technical veterans
  if (/ts\/sci|top secret/i.test(text)) { out.add("Defense Contractor — Technical Program Manager"); out.add("Federal Cybersecurity Analyst"); }
  return [...out].slice(0, 6);
}

const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

export function parseResumeText(text) {
  const t = text.replace(/\r/g, "");
  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);

  // Email / phone
  const email = (t.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i) || [""])[0];
  const phone = (t.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/) || [""])[0];

  // City, State — capture ONLY the city word(s) immediately before ", ST".
  // Anchor on the comma+state and walk back over 1–3 capitalized words so we don't
  // swallow preceding text like "...Engineer  Savannah, GA".
  let city = "", state = "";
  const locMatch = t.match(new RegExp(`\\b([A-Z][a-zA-Z]+(?:\\s[A-Z][a-zA-Z]+){0,2}),\\s*(${STATE_ABBR})\\b`));
  if (locMatch) {
    // Trim to the last 1–2 words before the comma (city names are short).
    const words = locMatch[1].split(/\s+/);
    city = clean(words.slice(-2).join(" "));
    // If the first of those two words looks like a non-place noun, keep just the last.
    if (words.length >= 2 && /^(Engineer|Manager|Analyst|Developer|Specialist|Resume|Experience|Skills|Summary)$/i.test(words[words.length - 2])) {
      city = words[words.length - 1];
    }
    state = locMatch[2];
  }

  // Name: first plausible person-name line near the top. Reject contact lines,
  // section headers, and lines with digits/symbols. Names are 2–4 Title-Case words.
  const HEADER_WORDS = /\b(resume|curriculum|vitae|summary|objective|experience|education|skills|contact|profile|references|certifications)\b/i;
  let name = "";
  for (const l of lines.slice(0, 8)) {
    if (l.includes("@") || /\d/.test(l) || /[|/•:]/.test(l)) continue;
    if (HEADER_WORDS.test(l)) continue;
    const words = l.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    // every word starts uppercase and is alphabetic (allow O'Brien, Anne-Marie, initials)
    const ok = words.every((w) => /^[A-Z][a-zA-Z'’.-]*$/.test(w));
    // avoid ALL-CAPS headers like "WORK EXPERIENCE"
    const allCaps = l === l.toUpperCase() && l.length > 3;
    if (ok && !allCaps) { name = clean(l); break; }
  }

  // Skills: dictionary hits (case-insensitive, word-ish boundaries)
  const lower = t.toLowerCase();
  const skills = SKILL_DICT.filter((s) => lower.includes(s.toLowerCase()));

  // Certifications: pattern hits → objects
  const certifications = [];
  for (const c of CERT_PATTERNS) {
    if (lower.includes(c.toLowerCase())) {
      const yr = (t.match(new RegExp(c.replace(/[+]/g, "\\+") + "[^\\n]{0,40}?(20\\d{2})", "i")) || [])[1] || "";
      certifications.push({ name: c, issuer: "", earned: yr, expires: "" });
    }
  }

  // Clearance
  let clearance = "";
  for (const [label, re] of CLEARANCES) { if (re.test(t)) { clearance = label; break; } }

  // Military / veteran heuristics
  const branchMatch = t.match(/\b(Army|Navy|Air Force|Marine Corps|Marines|Coast Guard|Space Force|National Guard)\b/i);
  const military = /\b(veteran|honorable discharge|active duty|deployed|military|e-[1-9]|nco|petty officer|sergeant|airman|seaman)\b/i.test(t) || !!branchMatch;
  const branch = branchMatch ? branchMatch[1] : "";

  // Education: lines mentioning a degree
  const education = [];
  const degRe = /\b(Ph\.?D|Doctorate|M\.?B\.?A|M\.?S\.?|M\.?A\.?|B\.?S\.?|B\.?A\.?|Bachelor|Master|Associate)\b/i;
  for (const l of lines) {
    if (degRe.test(l) && l.length < 140) {
      const year = (l.match(/20\d{2}|19\d{2}/) || [""])[0];
      const school = (l.match(/(University|College|Institute|Academy|School)[^,;\n]*/i) || [""])[0];
      education.push({ degree: clean(l.replace(/\s{2,}/g, " ")).slice(0, 100), school: clean(school), year });
      if (education.length >= 4) break;
    }
  }

  // Work history: lines that look like "Title — Company" or "Title at Company", with date ranges
  const workHistory = [];
  const dateRe = /((19|20)\d{2}\s*[-–—]\s*((19|20)\d{2}|present|current)|\b(19|20)\d{2}\b)/i;
  for (let i = 0; i < lines.length && workHistory.length < 6; i++) {
    const l = lines[i];
    if (!dateRe.test(l)) continue;
    if (degRe.test(l)) continue; // skip education lines
    const dates = (l.match(dateRe) || [""])[0];
    let title = "", company = "";
    const sep = l.split(/\s+(?:at|@|—|–|-|\|)\s+/);
    if (sep.length >= 2) { title = clean(sep[0]); company = clean(sep[1].replace(dateRe, "")); }
    else { title = clean(l.replace(dateRe, "")); }
    title = title.replace(/[,|•].*$/, "").slice(0, 80);
    if (title && title.length > 2) workHistory.push({ title, company: company.slice(0, 80), dates: clean(dates), highlights: [] });
  }

  const targetRoles = [...new Set([...extractTitles(t, workHistory), ...militaryRoles(t)])].slice(0, 7);

  return {
    name, email, phone, city, state, summary: "",
    skills, technicalSkills: [], certifications,
    workHistory, education, projects: [], leadership: [],
    clearance, military, veteran: military, branch, yearsServed: "",
    targetRoles,
    _source: "local", // marks that this came from local parsing (pre-AI)
  };
}

// Merge AI enhancement over a local base WITHOUT losing locally-found data.
export function mergeProfiles(base, ai) {
  if (!ai) return base;
  const pick = (a, b) => (a && (Array.isArray(a) ? a.length : String(a).trim())) ? a : b;
  return {
    ...base,
    name: pick(ai.name, base.name),
    email: pick(ai.email, base.email),
    phone: pick(ai.phone, base.phone),
    city: pick(ai.city, base.city),
    state: pick(ai.state, base.state),
    summary: pick(ai.summary, base.summary),
    skills: (ai.skills && ai.skills.length) ? Array.from(new Set([...(base.skills || []), ...ai.skills])) : base.skills,
    technicalSkills: pick(ai.technicalSkills, base.technicalSkills),
    certifications: (ai.certifications && ai.certifications.length)
      ? ai.certifications.map((c) => typeof c === "string" ? { name: c, issuer: "", earned: "", expires: "" } : c)
      : base.certifications,
    workHistory: (ai.workHistory && ai.workHistory.length) ? ai.workHistory : base.workHistory,
    education: (ai.education && ai.education.length) ? ai.education : base.education,
    clearance: pick(ai.clearance, base.clearance),
    _source: "local+ai",
  };
}
