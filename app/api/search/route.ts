// app/api/search/route.ts
// Fallback: provide a lightweight NextResponse.json when 'next/server' types are unavailable.
function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const status = init?.status ?? 200;
  return new Response(JSON.stringify(body), { status, headers });
}
const NextResponse = { json: jsonResponse };

import { loadAll } from "../../../lib/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function containsDeep(node: unknown, q: string): boolean {
  const term = q.toLowerCase();

  const matchPrim = (v: unknown) =>
    v != null && String(v).toLowerCase().includes(term);

  const visit = (x: any): boolean => {
    if (x == null) return false;

    if (Array.isArray(x)) {
      return x.some((v) => visit(v));
    }

    if (typeof x === "object") {
      for (const [k, v] of Object.entries(x)) {
        if (String(k).toLowerCase().includes(term)) return true; // key match
        if (visit(v)) return true;                               // nested value match
      }
      return false;
    }

    return matchPrim(x); // primitive
  };

  return visit(node);
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ ok: true, query: q, count: 0, datasets: [] });

  try {
    const all = await loadAll();
    const matched = all
      .filter(ds => containsDeep(ds.raw, q))
      .map(ds => ({ name: ds.name, file: ds.file, raw: ds.raw }));

    return NextResponse.json({
      ok: true,
      query: q,
      count: matched.length,
      datasets: matched,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
