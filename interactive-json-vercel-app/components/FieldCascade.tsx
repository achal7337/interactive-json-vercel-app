// components/FieldCascade.tsx
'use client';

import { useMemo, useState, useEffect } from 'react';

type JSONValue =
  | null
  | string
  | number
  | boolean
  | JSONValue[]
  | { [k: string]: JSONValue };

const isObj = (v: any): v is Record<string, JSONValue> =>
  v && typeof v === 'object' && !Array.isArray(v);
const isArr = (v: any): v is JSONValue[] => Array.isArray(v);

function getAtPath(root: JSONValue, parts: string[]): JSONValue {
  let node: any = root;
  for (const seg of parts) {
    if (node == null) return undefined as any;
    const key = isArr(node) && /^\d+$/.test(seg) ? Number(seg) : seg;
    node = node[key as any];
  }
  return node as JSONValue;
}

function optionsFor(node: JSONValue): string[] {
  if (isObj(node)) return Object.keys(node);
  if (isArr(node)) return node.map((_, i) => String(i));
  return [];
}

export default function FieldCascade({
  data,
  onAddPath,
  onPathChange, // <— NEW: bubbles current path up to page
}: {
  data: JSONValue;
  onAddPath: (path: string[]) => void;
  onPathChange?: (path: string[]) => void;
}) {
  const root: JSONValue =
    data && (isObj(data) || isArr(data)) ? data : ({} as any);

  const [path, setPath] = useState<string[]>([]);

  useEffect(() => {
    onPathChange?.(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // Rebuild levels whenever the path changes
  const levels = useMemo(() => {
    const lvls: { node: JSONValue; options: string[] }[] = [];
    let node: JSONValue = root;
    lvls.push({ node, options: optionsFor(node) }); // level 0 (root)
    for (let i = 0; i < path.length; i++) {
      node = getAtPath(root, path.slice(0, i + 1));
      lvls.push({ node, options: optionsFor(node) });
    }
    return lvls;
  }, [root, path]);

  const currentNode = getAtPath(root, path);
  const displayPath = path.length ? path.join('.') : '<root>';

  return (
    <div className="vstack" style={{ gap: 12 }}>
      {/* Header / status */}
      <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span className="tag">Path: {displayPath}</span>
        <span className="tag">
          Type: {isArr(currentNode) ? 'array' : isObj(currentNode) ? 'object' : typeof currentNode}
        </span>
        <span className="tag">
          Options here: {optionsFor(currentNode).length}
        </span>
        {path.length > 0 && (
          <button className="ghost" onClick={() => setPath((p) => p.slice(0, -1))}>
            ⬅ Back
          </button>
        )}
        <button
          onClick={() => onAddPath(path)}
          title="Add current path (includes all children)"
          disabled={path.length === 0}   // avoid adding raw <root>
        >
          ➕ Add selection
        </button>
      </div>

      {/* Cascading selects */}
      <div className="vstack" style={{ gap: 10 }}>
        {levels.map((lvl, i) => {
          const selected = path[i] ?? '';
          const label = i === 0 ? 'Level 0 (root) keys / indices' : `Level ${i} keys / indices`;
          const opts = lvl.options;
          return (
            <div key={i} className="hstack" style={{ gap: 10, alignItems: 'center' }}>
              <label style={{ minWidth: 220, color: 'var(--muted)' }}>{label}</label>
              <select
                value={selected}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = [...path.slice(0, i), val].filter(Boolean);
                  setPath(next);
                }}
                style={{
                  minWidth: 360,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: '#0e141d',
                  color: 'white',
                  border: '1px solid #223049',
                }}
              >
                <option value="">{opts.length ? 'Choose…' : '(no keys here)'}</option>
                {opts.map((opt) => (
                  <option key={`${i}:${opt}`} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
