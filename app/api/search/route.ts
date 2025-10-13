// app/api/search/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
// NOTE: use a RELATIVE import (avoid "@/lib/..." alias issues)
import { loadAll } from "../../../lib/load";

type Hit = { dataset: string; file: string; path: string; value: unknown };

function findMatches(root: unknown, query: string, dataset: string, file: string): Hit[] {
  const q = query.toLowerCase();
  const hits: Hit[] = [];

  const isObject = (v: any) => v && typeof v === "object" && !Array.isArray(v);
  const matchesPrimitive = (v: any) =>
    v !== null && v !== undefined && String(v).toLowerCase().includes(q);

  function walk(node: any, path: string) {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, path ? `${path}.${i}` : String(i)));
      return;
    }
    if (isObject(node)) {
      const keyMatch = Object.keys(node).some((k) => k.toLowerCase().includes(q));
      if (keyMatch) hits.push({ dataset, file, path, value: node });
      for (const [k, v] of Object.entries(node)) {
        const childPath = path ? `${path}.${k}` : k;
        if (!isObject(v) && !Array.isArray(v) && matchesPrimitive(v)) {
          hits.push({ dataset, file, path: childPath, value: v });
        }
        walk(v, childPath);
      }
      return;
    }
    if (matchesPrimitive(node)) hits.push({ dataset, file, path, value: node });
  }

  walk(root, "");
  return hits;
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ ok: true, query: q, hits: [] });

  try {
    const datasets = await loadAll();
    const hits = datasets.flatMap((ds) => findMatches(ds.raw, q, ds.name, ds.file));
    return NextResponse.json({ ok: true, query: q, count: hits.length, hits });
  } catch (err: any) {
    console.error("search failed:", err?.message || err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 200 });
  }
}
