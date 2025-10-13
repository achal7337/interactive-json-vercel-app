// app/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import JsonView from "@/components/JsonView";
import JsonSearch from "@/components/JsonSearch";
import FieldCascade from "@/components/FieldCascade";
import Link from 'next/link';

type Dataset = { name: string; file: string; raw: any };

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

export default function Page() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [selectedPaths, setSelectedPaths] = useState<string[][]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]); // <— from cascade
  const [includeCurrentOnSubmit, setIncludeCurrentOnSubmit] = useState(true);
  const [submittedJson, setSubmittedJson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/list', { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (alive) {
          if (j?.ok && Array.isArray(j.datasets)) {
            setDatasets(j.datasets);
            if (j.datasets.length && !selectedDataset) setSelectedDataset(j.datasets[0].file);
          } else {
            setErr(j?.error || `Failed to load datasets (HTTP ${r.status})`);
          }
        }
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Failed to load datasets');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const current = datasets.find((d) => d.file === selectedDataset) || null;

  function addPath(path: string[]) {
    if (!path || path.length === 0) return; // ignore <root>
    const key = path.join('\u0000');
    setSelectedPaths(prev => {
      const has = new Set(prev.map(p => p.join('\u0000')));
      if (has.has(key)) return prev;
      return [...prev, path];
    });
  }
  const removePath = (i: number) => setSelectedPaths(prev => prev.filter((_, idx) => idx !== i));
  const clearAll = () => setSelectedPaths([]);

  // Build a JSON from a list of paths (each path brings the entire subtree)
  function buildJsonFromPaths(paths: string[][]) {
    if (!current) return null;
    const out: any = {};
    for (const p of paths) {
      let node: any = current.raw;
      for (const seg of p) {
        const k = /^\d+$/.test(seg) ? Number(seg) : seg;
        node = node?.[k];
      }
      if (node !== undefined) setDeep(out, p, node);
    }
    return out;
  }

  // Live preview of what would be submitted (optional)
  const previewCombined = useMemo(() => {
    if (!current) return null;
    const candidate = [...selectedPaths];
    if (includeCurrentOnSubmit && currentPath.length > 0) {
      const sig = currentPath.join('\u0000');
      if (!candidate.some(p => p.join('\u0000') === sig)) candidate.push(currentPath);
    }
    if (candidate.length === 0) return null;
    return buildJsonFromPaths(candidate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, selectedPaths, currentPath, includeCurrentOnSubmit]);

  // SUBMIT: produce final JSON (includes current path if toggled)
  function handleSubmit() {
    const paths = [...selectedPaths];
    if (includeCurrentOnSubmit && currentPath.length > 0) {
      const sig = currentPath.join('\u0000');
      if (!paths.some(p => p.join('\u0000') === sig)) paths.push(currentPath);
    }
    const finalJson = buildJsonFromPaths(paths);
    setSubmittedJson(finalJson || {});
  }

  function copySubmitted() {
    if (!submittedJson) return;
    navigator.clipboard?.writeText(JSON.stringify(submittedJson, null, 2));
  }

  function downloadSubmitted() {
    if (!submittedJson) return;
    const blob = new Blob([JSON.stringify(submittedJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${current?.name || 'result'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="vstack">
      <h1 style={{ margin: 0 }}>Interactive data explorer</h1>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        Pick a dataset → drill into nested keys/indices → add selections, or just submit the current path.
        Selecting a parent includes <strong>all of its children</strong>.
      </p>

      {/* Global search across all files */}
      <JsonSearch />

      {/* Dataset selector */}
      <div className="card" style={{ padding: 12 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>Select a dataset</label>
        <select
          value={selectedDataset}
          onChange={(e) => {
            setSelectedDataset(e.target.value);
            setSelectedPaths([]);
            setCurrentPath([]);
            setSubmittedJson(null);
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

      {/* Cascading field selector */}
      {current && (
        <div className="card">
          <FieldCascade
            data={current.raw ?? {}}
            onAddPath={addPath}
            onPathChange={setCurrentPath}
          />

          {/* Submit bar */}
          <div className="hstack" style={{ gap: 12, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="hstack" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={includeCurrentOnSubmit}
                onChange={(e) => setIncludeCurrentOnSubmit(e.target.checked)}
              />
              Include current path on submit
            </label>
            <button onClick={handleSubmit}>Submit</button>
            {previewCombined && <span className="tag">Preview ready</span>}
          </div>
        </div>
      )}

      {/* Current selections */}
      <div className="card">
        <div className="hstack" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span className="tag">Selections: {selectedPaths.length}</span>
          {selectedPaths.length > 0 && (
            <button className="ghost" onClick={clearAll}>Clear all</button>
          )}
          {currentPath.length > 0 && <span className="tag">Current: {currentPath.join('.')}</span>}
        </div>
        {selectedPaths.length === 0 ? (
          <div className="tag">Use “Add selection” or toggle “Include current path” and press Submit</div>
        ) : (
          <div className="vstack" style={{ gap: 6 }}>
            {selectedPaths.map((p, i) => (
              <div key={i} className="hstack" style={{ gap: 8, alignItems: 'center' }}>
                <span className="tag">{p.join('.')}</span>
                <button className="ghost" onClick={() => removePath(i)}>✖ Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Final result after Submit */}
      {submittedJson && (
        <div className="card">
          <div className="hstack" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="tag">Final Output (submitted)</span>
            <span className="tag">{current?.file}</span>
            <button className="ghost" onClick={copySubmitted}>Copy JSON</button>
            <button className="ghost" onClick={downloadSubmitted}>Download</button>
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
