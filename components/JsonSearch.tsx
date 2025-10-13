'use client';
import { useState } from 'react';
import JsonView from './JsonView';

export default function JsonSearch() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setHits(data.hits || []);
    setLoading(false);
  }

  return (
    <div className="card">
      <form onSubmit={search} className="hstack" style={{ gap: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." style={{ background:'#0e141d', color:'white', border:'1px solid #223049', borderRadius:8, padding:'8px 10px', minWidth:280 }} />
        <button type="submit">Search</button>
        {loading && <span className="tag">Searching...</span>}
      </form>
      {hits.length > 0 && (
        <div style={{ marginTop:12 }}>
          {hits.map((h,i)=>(<div key={i} className="card"><div className="hstack"><span className="tag">{h.dataset}</span><span className="tag">{h.path}</span></div><JsonView data={h.value} /></div>))}
        </div>
      )}
    </div>
  );
}
