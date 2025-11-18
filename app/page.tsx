// app/page.tsx
'use client';

import { useMemo, useState } from 'react';
import JsonView from "@/components/JsonView";
import JsonSearch from "@/components/JsonSearch";
import FieldCascade from "@/components/FieldCascade";

type Dataset = { name: string; file: string; raw: any };

/* ---------------- Load all datasets ---------------- */
import linearData from "@/data/linear_data.json";
import zendeskData from "@/data/zendesk_data.json";
import quickbooksData from "@/data/quickbooks_data.json";
import crmData from "@/data/crm_data.json";
import emailData from "@/data/email_data.json";
import calendarData from "@/data/calendar_data.json";

const BUILT_IN_DATASETS: Dataset[] = [
  { name: "LINEAR", file: "linear_data.json", raw: linearData },
  { name: "ZENDESK", file: "zendesk_data.json", raw: zendeskData },
  { name: "QUICKBOOKS", file: "quickbooks_data.json", raw: quickbooksData },
  { name: "CRM", file: "crm_data.json", raw: crmData },
  { name: "EMAIL", file: "email_data.json", raw: emailData },
  { name: "CALENDAR", file: "calendar_data.json", raw: calendarData },
];

/* ---------------- CATEGORY DEFINITIONS ---------------- */
const CATEGORY_PATHS_BY_DATASET: Record<string, Record<string, string[][]>> = {
  LINEAR: {
    Users: [["users"]],
    Teams: [["teams"]],
    "Team memberships": [["team_memberships"]],
    Projects: [["projects"]],
    Issues: [["issues"]],
    Comments: [["comments"]],
  },
  ZENDESK: {
    Users: [["users"]],
    Tickets: [["tickets"]],
    Tags: [["tags"]],
    Comments: [["comments"]],
  },
  QUICKBOOKS: {
    Customers: [["customers"]],
    Items: [["items"]],
    Vendors: [["vendors"]],
    Accounts: [["accounts"]],
    Invoices: [["invoices"]],
    Bills: [["bills"]],
  },
  CRM: {
    Contacts: [["contacts"]],
    Companies: [["companies"]],
    Deals: [["deals"]],
    Leads: [["leads"]],
    Engagements: [["engagements"]],
  },
  EMAIL: {
    "User email": [["user_email"]],
    "View limit": [["view_limit"]],
    Folders: [["folders"]],
  },
  CALENDAR: {
    Events: [["events"]],
  },
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
  const allObjects = existing.every(
    n => n && typeof n === 'object' && !Array.isArray(n)
  );
  if (allArrays) return ([] as any[]).concat(...existing);
  if (allObjects) return Object.assign({}, ...existing);
  return existing;
}

function humanKey(name: string) {
  return name.toLowerCase();
}

/* ---------------- COMPONENT ---------------- */
export default function Page() {
  const [datasets] = useState<Dataset[]>(BUILT_IN_DATASETS);
  const [selectedDataset, setSelectedDataset] = useState<string>(
    BUILT_IN_DATASETS[0].file
  );

  const [selectedPaths, setSelectedPaths] = useState<string[][]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [includeCurrentOnSubmit, setIncludeCurrentOnSubmit] = useState(true);
  const [submittedJson, setSubmittedJson] = useState<any | null>(null);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryChoice, setCategoryChoice] = useState('');
  const [categoryResult, setCategoryResult] = useState<any | null>(null);
  const [subCategoryChoice, setSubCategoryChoice] = useState('');

  const current =
    datasets.find(d => d.file === selectedDataset) || datasets[0];
  const currentCategoryMap =
    CATEGORY_PATHS_BY_DATASET[current.name] || {};

  /* category root */
  const categoryRoot = useMemo(() => {
    if (!categoryChoice) return null;
    const paths = currentCategoryMap[categoryChoice] || [];
    const nodes = paths.map(p => getNodeByPath(current.raw, p));
    return mergeCategoryNodes(nodes);
  }, [categoryChoice, current, currentCategoryMap]);

  /* subcategories */
  const subCategoryOptions = useMemo(() => {
    if (
      !categoryRoot ||
      Array.isArray(categoryRoot) ||
      typeof categoryRoot !== 'object'
    )
      return [];
    return Object.keys(categoryRoot);
  }, [categoryRoot]);

  /* builder */
  function buildJsonFromPaths(paths: string[][]) {
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

  /* preview */
  const previewCombined = useMemo(() => {
    const paths = [...selectedPaths];
    if (includeCurrentOnSubmit && currentPath.length > 0) {
      const sig = currentPath.join('\u0000');
      if (!paths.some(p => p.join('\u0000') === sig)) paths.push(currentPath);
    }
    if (paths.length === 0) return null;
    return buildJsonFromPaths(paths);
  }, [selectedPaths, currentPath, includeCurrentOnSubmit]);

  /* reset helper */
  function handleReset() {
    setSelectedPaths([]);
    setCurrentPath([]);
    setSubmittedJson(null);
    setSelectedCategories([]);
    setCategoryChoice('');
    setSubCategoryChoice('');
    setCategoryResult(null);
  }

  /* submit category preview */
  function submitCategoryInstant() {
    if (!categoryChoice) return;
    const paths = currentCategoryMap[categoryChoice] || [];

    if (subCategoryChoice && subCategoryOptions.includes(subCategoryChoice)) {
      const nodes = paths.map(p =>
        getNodeByPath(current.raw, [...p, subCategoryChoice])
      );
      const merged = mergeCategoryNodes(nodes);
      setCategoryResult({
        [humanKey(`${categoryChoice}.${subCategoryChoice}`)]: merged,
      });
      return;
    }

    const nodes = paths.map(p => getNodeByPath(current.raw, p));
    const merged = mergeCategoryNodes(nodes);
    setCategoryResult({ [humanKey(categoryChoice)]: merged });
  }

  /* main submit (bottom Final Output) */
  function handleSubmit() {
    const paths = [...selectedPaths];
    if (includeCurrentOnSubmit && currentPath.length > 0) {
      const sig = currentPath.join('\u0000');
      if (!paths.some(p => p.join('\u0000') === sig)) paths.push(currentPath);
    }

    const base = buildJsonFromPaths(paths) || {};

    for (const cat of selectedCategories) {
      const p = currentCategoryMap[cat] || [];
      const nodes = p.map(path => getNodeByPath(current.raw, path));
      const merged = mergeCategoryNodes(nodes);
      if (merged !== undefined) base[humanKey(cat)] = merged;
    }

    setSubmittedJson(base);
  }

  function addPath(path: string[]) {
    const key = path.join('\u0000');
    setSelectedPaths(prev => {
      if (prev.some(p => p.join('\u0000') === key)) return prev;
      return [...prev, path];
    });
  }

  function copySubmitted() {
    if (!submittedJson) return;
    navigator.clipboard?.writeText(JSON.stringify(submittedJson, null, 2));
  }

  function downloadSubmitted() {
    if (!submittedJson) return;
    const blob = new Blob([JSON.stringify(submittedJson, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${current.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------------- RENDER ---------------- */
  return (
    <div className="vstack">
      <h1 style={{ margin: 0 }}>Interactive data explorer</h1>

      {/* Search bar */}
      <JsonSearch />

      {/* Dataset selector + Reset */}
      <div className="card" style={{ padding: 12, marginTop: 12 }}>
        <label
          style={{ display: 'block', marginBottom: 8 }}
        >
          Select a dataset
        </label>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <select
            value={selectedDataset}
            onChange={e => {
              setSelectedDataset(e.target.value);
              handleReset();
            }}
          >
            {datasets.map(d => (
              <option key={d.file} value={d.file}>
                {d.name}
              </option>
            ))}
          </select>

          <button type="button" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>

      {/* Category box */}
      <div className="card" style={{ padding: 12, marginTop: 12 }}>
        <label
          style={{ display: 'block', marginBottom: 8 }}
        >
          Category actions
        </label>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Category select */}
          <select
            value={categoryChoice}
            onChange={e => {
              setCategoryChoice(e.target.value);
              setSubCategoryChoice('');
              setCategoryResult(null);
            }}
          >
            <option value="">Choose category…</option>
            {Object.keys(currentCategoryMap).map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Subcategory dropdown */}
          {subCategoryOptions.length > 0 && (
            <select
              value={subCategoryChoice}
              onChange={e => setSubCategoryChoice(e.target.value)}
            >
              <option value="">All subcategories…</option>
              {subCategoryOptions.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              if (!categoryChoice) return;
              setSelectedCategories(prev =>
                prev.includes(categoryChoice) ? prev : [...prev, categoryChoice]
              );
            }}
            disabled={!categoryChoice}
          >
            Add category
          </button>

          <button
            type="button"
            onClick={submitCategoryInstant}
            disabled={!categoryChoice}
          >
            Submit
          </button>
        </div>

        {/* Selected categories tags */}
        {selectedCategories.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ marginBottom: 6 }}>
              Added categories: {selectedCategories.length}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {selectedCategories.map(c => (
                <span
                  key={c}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '2px 8px',
                    borderRadius: 999,
                    border: '1px solid #444',
                    fontSize: 12,
                  }}
                >
                  {c}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCategories(prev =>
                        prev.filter(x => x !== c)
                      )
                    }
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category preview */}
      {categoryResult && (
        <div className="card" style={{ marginTop: 12, padding: 12 }}>
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                border: '1px solid #444',
                fontSize: 12,
              }}
            >
              Category result
            </span>
            <button
              type="button"
              onClick={() => setCategoryResult(null)}
            >
              Clear
            </button>
          </div>
          <JsonView data={categoryResult} />
          <pre
            style={{
              marginTop: 12,
              whiteSpace: 'pre-wrap',
              fontSize: 12,
            }}
          >
{JSON.stringify(categoryResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Final result (bottom) */}
      {submittedJson && (
        <div className="card" style={{ marginTop: 12, padding: 12 }}>
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                border: '1px solid #444',
                fontSize: 12,
              }}
            >
              Final Output
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                border: '1px solid #444',
                fontSize: 12,
              }}
            >
              {current.file}
            </span>
            <button type="button" onClick={copySubmitted}>
              Copy JSON
            </button>
            <button type="button" onClick={downloadSubmitted}>
              Download
            </button>
          </div>
          <JsonView data={submittedJson} />
          <pre
            style={{
              marginTop: 12,
              whiteSpace: 'pre-wrap',
              fontSize: 12,
            }}
          >
{JSON.stringify(submittedJson, null, 2)}
          </pre>
        </div>
      )}

      {/* FieldCascade section */}
      <div className="card" style={{ marginTop: 12, padding: 12 }}>
        <FieldCascade
          data={current.raw}
          onAddPath={addPath}
          onPathChange={setCurrentPath}
        />
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={includeCurrentOnSubmit}
              onChange={e => setIncludeCurrentOnSubmit(e.target.checked)}
            />
            Include current path on submit
          </label>
          <button
            type="button"
            onClick={() => setSelectedPaths([])}
          >
            Clear selected paths
          </button>
          <button
            type="button"
            onClick={handleSubmit}
          >
            Submit (build final JSON)
          </button>
        </div>
      </div>
    </div>
  );
}
