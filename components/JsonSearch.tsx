// components/JsonSearch.tsx
'use client';

import { useEffect, useState } from "react";

type DatasetInfo = {
  name: string;
  raw: any;
};

type Props = {
  datasets: DatasetInfo[];
};

type Theme = "light" | "dark";

export default function JsonSearch({ datasets }: Props) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<string>("ALL");
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<Theme>("light");
  const [searched, setSearched] = useState(false); // did we run at least one search?

  // Read saved theme (set by TopNav) – light by default
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("theme") as Theme | null;
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
    } else {
      setTheme("light");
    }
  }, []);

  // Deep search through any JSON value
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

    // Even if query is empty, we treat it as a search that found nothing
    if (!q) {
      setResults([]);
      setSearched(true);
      setError("");
      return;
    }

    try {
      let allMatches: any[] = [];

      const scopedDatasets =
        scope === "ALL" ? datasets : datasets.filter((d) => d.name === scope);

      for (const ds of scopedDatasets) {
        const matches = deepSearch(ds.raw, q).map((m) => ({
          dataset: ds.name,
          ...m,
        }));
        allMatches = allMatches.concat(matches);
      }

      setResults(allMatches);
      setSearched(true);
      setError("");
    } catch (err: any) {
      setError(err.message || String(err));
      setSearched(true);
      setResults([]);
    }
  }

  function handleReset() {
    setQuery("");
    setScope("ALL");
    setResults([]);
    setError("");
    setSearched(false);
  }

  // ENTER key support on the input
  function handleKeyDown(e: any) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }

  // Theme colors for result boxes
  const resultBg = theme === "dark" ? "#0f172a" : "#f1f5f9";
  const resultText = theme === "dark" ? "#e2e8f0" : "#111827";
  const resultBorder = theme === "dark" ? "#1e293b" : "#cbd5e1";

  return (
    <div className="card" style={{ padding: 12, marginTop: 12 }}>
      <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>
        Search
      </label>

      {/* Search row */}
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
          placeholder='Search e.g. "jordan.kim"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            padding: 8,
            flex: "1 1 260px",
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
          }}
        >
          <option value="ALL">All datasets</option>
          {datasets.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Buttons are side-by-side in this row */}
        <button type="button" onClick={handleSearch}>
          Search
        </button>

        <button type="button" onClick={handleReset}>
          Reset
        </button>
      </div>

      {/* Error message (only for real errors, not "no results") */}
      {error && (
        <div style={{ color: "red", marginTop: 8, fontSize: 12 }}>{error}</div>
      )}

      {/* No results message (after any search, including empty query) */}
      {searched && results.length === 0 && !error && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            background: resultBg,
            border: `1px solid ${resultBorder}`,
            color: resultText,
            fontSize: 13,
            fontStyle: "italic",
          }}
        >
          ❌ Nothing found…
          <br />
          Either the data ran away 🏃‍♂️💨 or you’re searching for your ex again.
        </div>
      )}

      {/* Results list */}
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
                    background: resultBg,
                    color: resultText,
                    border: `1px solid ${resultBorder}`,
                    padding: 10,
                    borderRadius: 8,
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
