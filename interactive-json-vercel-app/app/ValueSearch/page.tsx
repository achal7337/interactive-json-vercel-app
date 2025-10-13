// app/value-search/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import JsonView from "@/components/JsonView";
import FieldCascade from "@/components/FieldCascade";
import NodeFilter from "@/components/NodeFilter";


type Dataset = { name: string; file: string; raw: any };

// tiny helper: deep set using array indices when numeric
function setDeep(target: any, path: string[], value: any) {
  let node = target;
  for (let i = 0; i < path.length; i++) {
    const raw = path[i];
    const key = /^\d+$/.test(raw) ? Number(raw) : raw;
    const last = i === path.length - 1;
    if (last) {
      node[key] = value;
    } else {
      const nextIsIndex = /^\d+$/.test(path[i + 1]);
      if (node[key] == null || typeof node[key] !== 'object') {
        node[key] = nextIsIndex ? [] : {};
      }
      node = node[key];
    }
  }
}

export default function ValueSearchPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [includeCurrentOnSubmit, setIncludeCurrentOnSubmit] = useState(true);
  const [useFilteredOnSubmit, setUseFilteredOnSubmit] = useState(true);
  const [filteredNode, setFilteredNode] = useState<any>(null);
  const [submittedJson, setSubmittedJson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // load datasets (reuses /api/list)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/list', { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        if (j?.ok && Array.isArray(j.datasets)) {
          setDatasets(j.datasets);
          if (j.datasets.length && !selectedDataset) setSelectedDataset(j.datasets[0].file);
        } else {
          setErr(j?.error || `Failed to load datasets (HTTP ${r.status})`);
        }
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Failed to load datasets');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const current = useMemo(
    () => datasets.find(d => d.file === selectedDataset) || null,
    [datasets, selectedDataset]
  );

  // Preview current node (unfiltered)
  const currentNode = useMemo(() => {
    if (!current || currentPath.length === 0) return null;
    let n: any = current.raw;
    for (const seg of currentPath) {
      const k = /^\d+$/.test(seg) ? Number(seg) : seg;
      n = n?.[k];
    }
    return n;
  }, [current, currentPath]);

  // Build final JSON on submit
  function handleSubmit() {
    if (!current) return;
    const out: any = {};

    if (includeCurrentOnSubmit && currentPath.length > 0) {
      const toPlace =
        useFilteredOnSubmit && filteredNode !== null ? filteredNode : currentNode;
      if (toPlace !== undefined) {
        setDeep(out, currentPath, toPlace);
      }
    }

    setSubmittedJson(out);
  }

  return (
    <div className="vstack">
      <h1 style={{ margin: 0 }}>Value Search (New)</h1>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        Choose a dataset → drill to a node → filter by value → Submit to return JSON.
        Selecting a parent includes <strong>all of its children</strong>, or the filtered subset.
      </p>

      {/* Dataset selector */}
      <div className="card" style={{ padding: 12 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>Select a dataset</label>
        <select
          value={selectedDataset}
          onChange={(e) => {
            setSelectedDataset(e.target.value);
            setCurrentPath([]);
            setSubmittedJson(null);
            setFilteredNode(null);
          }}
          style={{
            minWidth: 320,
            padding: '10px 12px',
            borderRadius: 12,
            background: '#0e141d',
            color: 'white',
            border: '1px solid #223049',
          }}
        >
          {loading && <option>Loading…</option>}
          {!loading && datasets.length === 0 && <option value="">No JSON files found in /data</option>}
          {!loading && datasets.map(d => (
            <option key={d.file} value={d.file}>{d.file}</option>
          ))}
        </select>
        {err && <div className="tag" style={{ marginTop: 10 }}>Error: {err}</div>}
      </div>

      {/* Cascading picker */}
      {current && (
        <div className="card">
          <FieldCascade
            data={current.raw ?? {}}
            onAddPath={(p) => setCurrentPath(p)}   // here Add selection just sets the current path
            onPathChange={setCurrentPath}
          />

          {/* Value filter for the current node */}
          {currentPath.length > 0 && currentNode !== undefined && (
            <NodeFilter
              node={currentNode}
              onFilteredChange={setFilteredNode}
              title="Filter current node by value"
            />
          )}

          {/* Submit controls */}
          <div className="hstack" style={{ gap: 12, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="hstack" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={includeCurrentOnSubmit}
                onChange={(e) => setIncludeCurrentOnSubmit(e.target.checked)}
              />
              Include current path on submit
            </label>
            <label className="hstack" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={useFilteredOnSubmit}
                onChange={(e) => setUseFilteredOnSubmit(e.target.checked)}
                disabled={!includeCurrentOnSubmit || currentPath.length === 0}
              />
              Use filtered node (if any)
            </label>
            <button onClick={handleSubmit}>Submit</button>
          </div>
        </div>
      )}

      {/* Result */}
      {submittedJson && (
        <div className="card">
          <div className="hstack" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="tag">Result JSON</span>
            <span className="tag">{current?.file}</span>
            <button
              className="ghost"
              onClick={() => navigator.clipboard?.writeText(JSON.stringify(submittedJson, null, 2))}
            >
              Copy JSON
            </button>
            <button
              className="ghost"
              onClick={() => {
                const blob = new Blob([JSON.stringify(submittedJson, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${current?.name || 'value-search'}.json`; a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download
            </button>
          </div>
          <JsonView data={submittedJson} />
          <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap', color: '#a6b3c3' }}>
{JSON.stringify(submittedJson, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
