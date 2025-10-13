// components/JsonSearch.tsx
'use client';

import { useState } from 'react';
import JsonView from './JsonView';

type Slice = { path: string; value: unknown };
type DatasetResult =
  | { name: string; file: string; mode: 'full'; raw: unknown }
  | { name: string; file: string; mode: 'slices'; slices: Slice[] };

export default function JsonSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<DatasetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    const query = q.trim();
    setSearched(true);
    if (!query) {
      setResults([]);
      setErr(null);
      setTotalCount(0);
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
        setTotalCount(0);
      } else {
        setResults(Array.isArray(j?.datasets) ? j.datasets : []);
        setTotalCount(Number(j?.count || 0));
      }
    } catch (e: any) {
      setErr(e?.message || 'Search failed');
      setResults([]);
      setTotalCount(0);
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
          placeholder='Search value or key (e.g., "Downtown", "Rohini")'
          style={{ background:'#0e141d', border:'1px solid #223049', color:'white', padding:'8px 10px', borderRadius:10, minWidth:300 }}
        />
        <button type="submit">Search</button>
        {loading && <span className="tag">Searching…</span>}
      </form>

      {err && <div style={{ marginTop: 12 }} className="tag">Error: {err}</div>}

      {searched && !loading && !err && (
        <div style={{ marginTop: 16 }}>
          <div className="hstack" style={{ gap: 8, marginBottom: 8 }}>
            <span className="tag">Matches: {totalCount}</span>
            <span className="tag">Datasets: {results.length}</span>
          </div>

          {results.length === 0 ? (
            <div className="tag">No results for “{q}”.</div>
          ) : (
            <div className="vstack" style={{ gap: 12 }}>
              {results.map((d, i) => (
                <div key={i} className="card" style={{ marginBottom: 8 }}>
                  <div className="hstack" style={{ gap: 8, marginBottom: 8, flexWrap:'wrap' }}>
                    <span className="tag">{d.name}</span>
                    <span className="tag">{d.file}</span>
                    <span className="tag">{d.mode === 'full' ? 'full file' : 'matches'}</span>
                  </div>

                  {d.mode === 'full' ? (
                    <JsonView data={(d as any).raw} />
                  ) : (
                    <div className="vstack" style={{ gap: 10 }}>
                      {(d as any).slices.map((s: Slice, idx: number) => (
                        <div key={idx} className="card">
                          <div className="hstack" style={{ gap: 8, marginBottom: 6 }}>
                            <span className="tag">{s.path || '<root>'}</span>
                          </div>
                          <JsonView data={s.value as any} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
