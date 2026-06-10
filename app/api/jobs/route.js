import { NextResponse } from "next/server";

// Forwards job searches to the deployed backend proxy (BACKEND_JOB_URL).
// Keeping it server-side means the browser never calls external job APIs and
// the backend URL/keys stay private. Falls back to an empty result cleanly.
export async function GET(req) {
  const backend = process.env.BACKEND_JOB_URL; // e.g. https://career-os-backend.onrender.com/jobs
  if (!backend) {
    return NextResponse.json({ jobs: [], errors: ["backend_unset"], count: 0 });
  }
  const incoming = new URL(req.url);
  const target = new URL(backend);
  incoming.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  try {
    const r = await fetch(target.toString(), { cache: "no-store" });
    const data = await r.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ jobs: [], errors: ["backend_unreachable"], count: 0 });
  }
}
