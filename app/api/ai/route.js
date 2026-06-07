import { NextResponse } from "next/server";

// Server-side proxy to the AI provider. The API key lives ONLY here (env var),
// never in the browser. Accepts the same body shape the app already builds.
export async function POST(req) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const body = await req.json();
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || "claude-sonnet-4-20250514",
        max_tokens: body.max_tokens || 1000,
        messages: body.messages,
        ...(body.tools ? { tools: body.tools } : {}),
      }),
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ error: "AI request failed" }, { status: 502 });
  }
}
