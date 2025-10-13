// app/api/search/route.ts
import { loadAll } from "../../../lib/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Walk the JSON and collect minimal "slices" for matches.
// Heuristic: if a primitive or key matches inside an array item -> return that array item;
// otherwise return the immediate parent object.
type Slice = { path: string; value: unknown };

function searchSlices(root: unknown, query: string): Slice[] {
  const term = query.toLowerCase();
  const slices: Slice[] = [];
  const seen = new Set<string>();

  const matchPrim = (v: unknown) =>
    v != null && String(v).toLowerCase().includes(term);

  function addSlice(path: string, value: unknown) {
    const sig = path; // dedupe by path
    if (!seen.has(sig)) {
      seen.add(sig);
      slices.push({ path, value });
    }
  }

  function walk(node: any, path: (string | number)[], parent: any, parentPath: (string | number)[]) {
    if (node == null) return;

    if (Array.isArray(node)) {
      node.forEach((v, i) => {
        // If the array item itself matches as a primitive (rare), return the item.
        if (!Array.isArray(v) && typeof v !== "object" && matchPrim(v)) {
          addSlice([...path, i].join("."), v);
        }
        walk(v, [...path, i], node, path);
      });
      return;
    }

    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        const keyMatches = k.toLowerCase().includes(term);
        const valueIsPrimitive = v == null || typeof v !== "object";

        // If key matches:
        //  - If value is an object/array, return that value (it's a logical subtree)
        //  - Else return the parent object (so you see the field in context)
        if (keyMatches) {
          if (v && typeof v === "object") {
            addSlice([...path, k].join("."), v);
          } else {
            addSlice(path.join("."), node);
          }
        }

        // If primitive value matches:
        //  - If parent is an array -> return the array item (minimal useful unit)
        //  - Else return the immediate parent object
        if (valueIsPrimitive && matchPrim(v)) {
          if (Array.isArray(parent)) {
            const idx = Number(path[path.length - 1]); // index of this item in parent array
            addSlice(parentPath.concat(idx).join("."), parent[idx]);
          } else {
            addSlice(path.join("."), node);
          }
        }

        walk(v as any, [...path, k], node, path);
      }
      return;
    }

    // Primitive node (root primitive) case
    if (matchPrim(node)) addSlice(path.join("."), node);
  }

  walk(root as any, [], null, []);
  return slices;
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) {
    return new Response(JSON.stringify({ ok: true, query: q, count: 0, datasets: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const all = await loadAll();

    // Collect slices per dataset
    const perDataset = all.map(ds => {
      const slices = searchSlices(ds.raw, q);
      return { ds, slices };
    }).filter(x => x.slices.length > 0);

    const totalMatches = perDataset.reduce((n, x) => n + x.slices.length, 0);

    const payload = perDataset.map(({ ds, slices }) => {
      // If there is exactly one match across ALL datasets -> return FULL file
      if (totalMatches === 1) {
        return { name: ds.name, file: ds.file, mode: "full" as const, raw: ds.raw };
      }
      // Otherwise return only the minimal slices for this dataset
      return {
        name: ds.name,
        file: ds.file,
        mode: "slices" as const,
        slices, // [{ path, value }]
      };
    });

    return new Response(JSON.stringify({
      ok: true,
      query: q,
      count: totalMatches,
      datasets: payload,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
