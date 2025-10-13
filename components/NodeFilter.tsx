// components/NodeFilter.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type NodeFilterProps = {
  node: any;                               // refine this type later if you want
  onFilteredChange: (value: any) => void;  // callback with the filtered node
  title?: string;
};

export default function NodeFilter({
  node,
  onFilteredChange,
  title = 'Filter',
}: NodeFilterProps) {
  const [query, setQuery] = useState('');

  // TODO: replace with your actual filtering logic; for now just echo node
  const filtered = useMemo(() => {
    // example: if node is an object and query not empty, keep entries matching query
    if (!node || !query) return node;
    try {
      if (Array.isArray(node)) {
        return node.filter((x) => JSON.stringify(x).toLowerCase().includes(query.toLowerCase()));
      }
      if (typeof node === 'object') {
        const entries = Object.entries(node).filter(([k, v]) =>
          (k + JSON.stringify(v)).toLowerCase().includes(query.toLowerCase())
        );
        return Object.fromEntries(entries);
      }
      return String(node).toLowerCase().includes(query.toLowerCase()) ? node : node;
    } catch {
      return node;
    }
  }, [node, query]);

  useEffect(() => {
    onFilteredChange(filtered);
  }, [filtered, onFilteredChange]);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="hstack" style={{ gap: 8, alignItems: 'center' }}>
        <strong>{title}</strong>
        <input
          placeholder="type to filter…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            padding: '6px 8px',
            borderRadius: 8,
            border: '1px solid #223049',
            flex: 1,
            background: '#0e141d',
            color: 'white',
          }}
        />
      </div>
    </div>
  );
}
