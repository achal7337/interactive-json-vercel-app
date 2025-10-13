// components/JsonSearch.tsx
'use client';

import { useState } from 'react';
import JsonView from './JsonView';

type DatasetMatch = { name: string; file: string; raw: unknown };

export default function JsonSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<DatasetMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    const query = q.trim();
    setSearched(true);
    if (!query) {
      setResults([]);
      setErr(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (j?.ok === false) {
        setErr(j?.error || `HTTP ${r.status}`);
        setResults([]);
      } else {
        setResults(Array.isArray(j?.datasets) ? j.datasets : []);
      }
    } catch (e: any) {
      setErr(e?.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <form onSubmit={run} className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search across all JSONs (e.g., rohini)…"
          style={{ background:'#0e141d', border:'1px solid #223049', color:'white', padding:'8px 10px', borderRadius:10, minWidth:300 }}
        />
        <button type="submit">Search</button>
        {loading && <span className="tag">Searching…</span>}
      </form>

      {err && <div style={{ marginTop: 12 }} className="tag">Error: {err}</div>}

      {searched && !loading && !err && (
        <div style={{ marginTop: 16 }}>
          <div className="hstack" style={{ gap: 8, marginBottom: 8 }}>
            <span className="tag">Datasets matched: {results.length}</span>
          </div>

          {results.length === 0 ? (
            <div className="tag">No datasets contain “{q}”.</div>
          ) : (
            <div className="vstack" style={{ gap: 12 }}>
              {results.map((d, i) => (
                <div key={i} className="card" style={{ marginBottom: 8 }}>
                  <div className="hstack" style={{ gap: 8, marginBottom: 8 }}>
                    <span className="tag">{d.name}</span>
                    <span className="tag">{d.file}</span>
                  </div>
                  <JsonView data={d.raw as any} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
