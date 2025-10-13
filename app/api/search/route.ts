// app/api/search/route.ts
import { loadAll } from "../../../lib/load";  // relative import only

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Recursively check if query string appears anywhere
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
        if (String(k).toLowerCase().includes(term)) return true;
        if (visit(v)) return true;
      }
      return false;
    }

    return matchPrim(x);
  };

  return visit(node);
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q)
    return new Response(JSON.stringify({ ok: true, query: q, count: 0, datasets: [] }), {
      headers: { "Content-Type": "application/json" },
    });

  try {
    const all = await loadAll();
    const matched = all
      .filter((ds) => containsDeep(ds.raw, q))
      .map((ds) => ({ name: ds.name, file: ds.file, raw: ds.raw }));

    return new Response(
      JSON.stringify({
        ok: true,
        query: q,
        count: matched.length,
        datasets: matched,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: String(err?.message || err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
