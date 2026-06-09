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

const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

export function parseResumeText(text) {
  const t = text.replace(/\r/g, "");
  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);

  // Email / phone
  const email = (t.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i) || [""])[0];
  const phone = (t.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/) || [""])[0];

  // City, State (e.g. "Atlanta, GA")
  const locMatch = t.match(new RegExp(`([A-Z][a-zA-Z.\\s]+),\\s*(${STATE_ABBR})\\b`));
  const city = locMatch ? clean(locMatch[1]) : "";
  const state = locMatch ? locMatch[2] : "";

  // Name: first non-contact line near the top, 2–4 capitalized words
  let name = "";
  for (const l of lines.slice(0, 6)) {
    if (l.includes("@") || /\d{3}/.test(l)) continue;
    const words = l.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && /^[A-Z][a-zA-Z'.-]+$/.test(words[0]) && /^[A-Z]/.test(words[words.length - 1])) {
      name = clean(l); break;
    }
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

  return {
    name, email, phone, city, state, summary: "",
    skills, technicalSkills: [], certifications,
    workHistory, education, projects: [], leadership: [],
    clearance, military, veteran: military, branch, yearsServed: "",
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
