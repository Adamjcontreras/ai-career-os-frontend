import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // allow longer resume-parsing calls

// Server-side proxy to Anthropic. The API key lives ONLY here (never in the browser).
// Surfaces the REAL upstream error so the frontend/debug can show what actually failed.
export async function POST(req) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("[CareerOS/api/ai] ANTHROPIC_API_KEY is not set in the environment.");
    return NextResponse.json(
      { error: "AI not configured", detail: "ANTHROPIC_API_KEY is missing in Vercel env vars." },
      { status: 503 }
    );
  }

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Bad request body" }, { status: 400 }); }

  // Detect PDF document blocks so we can send the PDF beta header when needed.
  const hasPdf = JSON.stringify(body?.messages || []).includes('"media_type":"application/pdf"');

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
  };
  if (hasPdf) headers["anthropic-beta"] = "pdfs-2024-09-25";

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: body.model || "claude-sonnet-4-6",
        max_tokens: body.max_tokens || 1000,
        messages: body.messages,
        ...(body.tools ? { tools: body.tools } : {}),
      }),
    });

    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok) {
      // Log full upstream error to Vercel function logs, and pass a readable
      // message back so the client debug panel can show the true cause.
      console.error("[CareerOS/api/ai] upstream", r.status, text.slice(0, 500));
      const msg = data?.error?.message || data?.error?.type || ("Upstream HTTP " + r.status);
      return NextResponse.json({ error: msg, status: r.status }, { status: r.status });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    console.error("[CareerOS/api/ai] fetch failed:", e?.message);
    return NextResponse.json({ error: "AI request failed: " + (e?.message || "network") }, { status: 502 });
  }
}
