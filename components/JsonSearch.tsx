// components/JsonSearch.tsx
'use client';

import { useState } from "react";

type DatasetInfo = {
  name: string;
  raw: any;
};

type Props = {
  datasets: DatasetInfo[];
};

export default function JsonSearch({ datasets }: Props) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<string>("ALL"); // "ALL" or dataset name
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");

  function deepSearch(obj: any, q: string, path: string[] = []): any[] {
    let found: any[] = [];

    if (obj === null || obj === undefined) return found;

    // primitive
    if (typeof obj !== "object") {
      if (String(obj).toLowerCase().includes(q)) {
        found.push({ value: obj, path });
      }
      return found;
    }

    // array
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        found = found.concat(deepSearch(item, q, [...path, String(index)]));
      });
      return found;
    }

    // object
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (key.toLowerCase().includes(q)) {
        found.push({ value: val, path: [...path, key] });
      }
      found = found.concat(deepSearch(val, q, [...path, key]));
    }
    return found;
  }

  function handleSearch() {
    const q = query.trim().toLowerCase();
    if (!q) return;

    try {
      let allMatches: any[] = [];

      const scopedDatasets =
        scope === "ALL"
          ? datasets
          : datasets.filter((d) => d.name === scope);

      for (const ds of scopedDatasets) {
        const matches = deepSearch(ds.raw, q).map((m) => ({
          dataset: ds.name,
          ...m,
        }));
        allMatches = allMatches.concat(matches);
      }

      setResults(allMatches);
      setError("");
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  return (
    <div className="card" style={{ padding: 12, marginTop: 12 }}>
      <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>
        Search
      </label>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder='Search value or key (e.g., "jordan.kim")'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            padding: 8,
            flex: "1 1 240px",
            minWidth: 220,
            borderRadius: 999,
            border: "1px solid #64748b",
          }}
        />

        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 999,
            border: "1px solid #64748b",
            fontSize: 13,
          }}
        >
          <option value="ALL">All datasets</option>
          {datasets.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>

        <button type="button" onClick={handleSearch}>
          Search
        </button>
      </div>

      {error && (
        <div style={{ color: "red", marginTop: 8, fontSize: 12 }}>{error}</div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <strong style={{ fontSize: 13 }}>
            Found {results.length} result{results.length === 1 ? "" : "s"}
          </strong>
          <ul style={{ marginTop: 8, listStyle: "none", paddingLeft: 0 }}>
            {results.map((r, i) => (
              <li key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, marginBottom: 2 }}>
                  <strong>{r.dataset}</strong> →{" "}
                  <code>{r.path.join(" / ")}</code>
                </div>
                <pre
                  style={{
                    background: "#020617",
                    padding: 8,
                    borderRadius: 6,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    fontSize: 12,
                    overflowX: "auto",
                  }}
                >
{JSON.stringify(r.value, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
