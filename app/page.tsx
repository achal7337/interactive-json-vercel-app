// app/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import JsonView from "@/components/JsonView";
import JsonSearch from "@/components/JsonSearch";
import FieldCascade from "@/components/FieldCascade";

type Dataset = { name: string; file: string; raw: any };

/* ---------------- Category paths ---------------- */
const CATEGORY_PATHS: Record<string, string[][]> = {
  Conversations: [
    ["augmentation","apps","0","app_state","conversations"],
    ["augmentation","apps","1","app_state","conversations"],
    ["apps","4","app_state","conversations"],
    ["apps","5","app_state","conversations"],
  ],
  Email: [
    ["augmentation","apps","2","app_state","folders"],
    ["apps","6","app_state","folders"],
  ],
  Products: [
    ["augmentation","apps","4","app_state","products"],
    ["apps","11","app_state","products"],
  ],
  Files: [
    ["apps","1","app_state","files"],
  ],
  Apartments: [
    ["augmentation","apps","3","app_state","apartments"],
    ["apps","8","app_state","apartments"],
  ],
  Calendar: [
    ["apps","7","app_state","events"],
  ],
  City: [
    ["apps","9","app_state","crime_data"],
  ],
  Contacts: [
    ["apps","2","app_state","contacts"],
    ["apps","3","app_state","contacts"],
  ],
};

/* ---------------- helpers ---------------- */
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
function getNodeByPath(root: any, path: string[]) {
  let n = root;
  for (const seg of path) {
    const key = /^\d+$/.test(seg) ? Number(seg) : seg;
    if (n == null) return undefined;
    n = n[key];
  }
  return n;
}
function mergeCategoryNodes(nodes: any[]) {
  const existing = nodes.filter(n => n !== undefined);
  if (existing.length === 0) return undefined;
  const allArrays = existing.every(Array.isArray);
  const allObjects = existing.every(n => n && typeof n === 'object' && !Array.isArray(n));
  if (allArrays) return ([] as any[]).concat(...existing);
  if (allObjects) return Object.assign({}, ...existing);
  return existing;
}
function humanKey(name: string) {
  return name.toLowerCase();
}

export default function Page() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [selectedPaths, setSelectedPaths] = useState<string[][]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [includeCurrentOnSubmit, setIncludeCurrentOnSubmit] = useState(true);
  const [submittedJson, setSubmittedJson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryChoice, setCategoryChoice] = useState<string>(''); // used for both Add + Submit
  const [categoryResult, setCategoryResult] = useState<any | null>(null); // shown RIGHT under category box

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
    if (!path || path.length === 0) return;
    const key = path.join('\u0000');
    setSelectedPaths(prev => {
      const has = new Set(prev.map(p => p.join('\u0000')));
      if (has.has(key)) return prev;
      return [...prev, path];
    });
  }
  const removePath = (i: number) => setSelectedPaths(prev => prev.filter((_, idx) => idx !== i));
  const clearAll = () => setSelectedPaths([]);

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

  // Submit (fields + selected categories)
  function handleSubmit() {
    const paths = [...selectedPaths];
    if (includeCurrentOnSubmit && currentPath.length > 0) {
      const sig = currentPath.join('\u0000');
      if (!paths.some(p => p.join('\u0000') === sig)) paths.push(currentPath);
    }

    const base = buildJsonFromPaths(paths) || {};

    if (current && selectedCategories.length > 0) {
      for (const cat of selectedCategories) {
        const pathList = CATEGORY_PATHS[cat] || [];
        const nodes = pathList.map(p => getNodeByPath(current.raw, p));
        const merged = mergeCategoryNodes(nodes);
        if (merged !== undefined) base[humanKey(cat)] = merged;
      }
    }

    setSubmittedJson(base);
  }

  // Submit just the chosen category and show it IMMEDIATELY below the category box
  function submitCategoryInstant() {
    setCategoryResult(null);
    if (!current || !categoryChoice) return;
    const pathList = CATEGORY_PATHS[categoryChoice] || [];
    const nodes = pathList.map(p => getNodeByPath(current.raw, p));
    const merged = mergeCategoryNodes(nodes);
    if (merged !== undefined) setCategoryResult({ [humanKey(categoryChoice)]: merged });
    else setCategoryResult({});
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
        Pick a dataset → drill into nested keys/indices → add selections, <em>or</em> submit a whole category.
        Selecting a parent includes <strong>all of its children</strong>.
      </p>

      {/* Quick help */}
      <div className="card" style={{ padding: 12, marginTop: 12, background: '#0e141d', borderRadius: 10, lineHeight: 1.6 }}>
        <h3 style={{ marginTop: 0 }}>🧭 How to Use</h3>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          <li><strong>Submit category:</strong> pick a category and press <strong>Submit</strong> to see its merged JSON <em>right below</em>.</li>
          <li><strong>Add category:</strong> adds that category to the final output when you press the main <strong>Submit</strong> below.</li>
          <li>Or drill into fields with the cascade and press <strong>Submit</strong> to build a custom JSON.</li>
        </ul>
      </div>

      {/* Search */}
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
            setSelectedCategories([]);
            setCategoryChoice('');
            setCategoryResult(null);
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

      {/* Category box: Add + Submit */}
      <div className="card" style={{ padding: 12 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Category actions (combine all paths under one key)
        </label>
        <div className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select
            value={categoryChoice}
            onChange={(e) => setCategoryChoice(e.target.value)}
            style={{
              minWidth: 260,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#0e141d',
              color: 'white',
              border: '1px solid #223049',
            }}
          >
            <option value="">Choose category…</option>
            {Object.keys(CATEGORY_PATHS).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <button
            onClick={() => {
              if (!categoryChoice) return;
              setSelectedCategories(prev => prev.includes(categoryChoice) ? prev : [...prev, categoryChoice]);
            }}
          >
            Add category
          </button>

          <button onClick={submitCategoryInstant}>Submit</button>

          <button
            className="ghost"
            onClick={() => current && setCategoryResult(current.raw)}
            title="Show entire data.json right here"
          >
            View full data.json here
          </button>
        </div>

        {/* Show selected (added) categories */}
        {selectedCategories.length > 0 && (
          <div className="vstack" style={{ gap: 6, marginTop: 10 }}>
            <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="tag">Added categories: {selectedCategories.length}</span>
              <button className="ghost" onClick={() => setSelectedCategories([])}>Clear</button>
            </div>
            <div className="hstack" style={{ gap: 6, flexWrap: 'wrap' }}>
              {selectedCategories.map((c) => (
                <span key={c} className="tag" style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                  {c}
                  <button
                    className="ghost"
                    onClick={() => setSelectedCategories(prev => prev.filter(x => x !== c))}
                    title="Remove"
                  >
                    ✖
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 👇 Category result appears RIGHT UNDER the category box */}
      {categoryResult && (
        <div className="card">
          <div className="hstack" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="tag">Category result</span>
            <button className="ghost" onClick={() => setCategoryResult(null)}>Clear</button>
          </div>
          <JsonView data={categoryResult} />
          <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap', color: '#a6b3c3' }}>
{JSON.stringify(categoryResult, null, 2)}
          </pre>
        </div>
      )}


      {/* Final result (bottom) */}
      {submittedJson && (
        <div className="card">
          <div className="hstack" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="tag">Final Output</span>
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
