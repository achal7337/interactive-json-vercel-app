// lib/load.ts
import fs from "fs";
import path from "path";

export type Dataset = { name: string; file: string; raw: any };

// tolerant JSON: strips BOM, // and /* */ comments, and trailing commas.
// if still invalid, tries NDJSON (one JSON per line). On failure, we skip the file.
function stripBom(s: string) {
  return s.replace(/^\uFEFF/, "");
}
function stripCommentsAndTrailingCommas(s: string) {
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");            // /* ... */
  s = s.replace(/(^|[^:])\/\/.*$/gm, "$1");          // // ...
  s = s.replace(/,\s*([}\]])/g, "$1");               // trailing commas
  return s;
}
function parseTolerant(raw: string) {
  const cleaned = stripCommentsAndTrailingCommas(stripBom(raw).trim());
  try {
    return JSON.parse(cleaned);
  } catch {
    // NDJSON fallback
    const lines = cleaned
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//"));
    if (lines.length > 1) {
      return lines.map((l) => JSON.parse(l));
    }
    // rethrow original parse error
    return JSON.parse(cleaned);
  }
}

export async function loadAll(): Promise<Dataset[]> {
  const dir = path.join(process.cwd(), "data");

  // If /data doesn't exist, don't crash — just return empty list.
  if (!fs.existsSync(dir)) {
    console.warn(`[loadAll] data directory not found at: ${dir}`);
    return [];
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".json"));

  const out: Dataset[] = [];
  for (const file of files) {
    const full = path.join(dir, file);
    let text: string;
    try {
      text = fs.readFileSync(full, "utf-8");
    } catch (e) {
      console.warn(`[loadAll] cannot read ${file}: ${(e as Error).message}`);
      continue;
    }

    try {
      const json = parseTolerant(text);
      out.push({ name: file.replace(/\.json$/i, ""), file, raw: json });
    } catch (e) {
      console.warn(`[loadAll] skipping bad JSON ${file}: ${(e as Error).message}`);
    }
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}
