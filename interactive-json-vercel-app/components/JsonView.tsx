'use client';
import { useState, memo } from 'react';

type JSONValue = null | string | number | boolean | JSONValue[] | { [k: string]: JSONValue };

export default function JsonView({ data }: { data: JSONValue }) {
  return (
    <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13 }}>
      <TreeNode name={undefined} value={data} level={0} />
    </div>
  );
}

const TreeNode = memo(function TreeNode({ name, value, level }: { name?: string; value: JSONValue; level: number }) {
  const isObj = value && typeof value === 'object' && !Array.isArray(value);
  const isArr = Array.isArray(value);
  const [open, setOpen] = useState(level < 1);

  if (isObj) {
    const keys = Object.keys(value as Record<string, JSONValue>);
    return (
      <div>
        <Row level={level} onToggle={() => setOpen(!open)} open={open} name={name} type="object" count={keys.length} />
        {open && (
          <div style={{ marginLeft: 14, borderLeft: '1px solid #263445', paddingLeft: 10 }}>
            {keys.map((k) => (
              <TreeNode key={k} name={k} value={(value as any)[k]} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isArr) {
    return (
      <div>
        <Row level={level} onToggle={() => setOpen(!open)} open={open} name={name} type="array" count={(value as any[]).length} />
        {open && (
          <div style={{ marginLeft: 14, borderLeft: '1px solid #263445', paddingLeft: 10 }}>
            {(value as any[]).map((v, i) => (
              <TreeNode key={i} name={String(i)} value={v} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '2px 0' }}>
      <KeyName name={name} /> <Primitive value={value} />
    </div>
  );
});

function Row({ onToggle, open, name, type, count }: { onToggle: () => void; open: boolean; name?: string; type: 'object' | 'array'; count: number }) {
  return (
    <div style={{ padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
      <button onClick={onToggle} style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid #2a3a52', background: '#0e141d', color: '#9fc1ff', cursor: 'pointer' }}>
        {open ? '−' : '+'}
      </button>
      <KeyName name={name} />
      <span style={{ color: '#8fb0ff' }}>{type === 'object' ? '{ }' : '[ ]'} <span style={{ color: '#7b8aa5' }}>({count})</span></span>
    </div>
  );
}

function KeyName({ name }: { name?: string }) {
  return name ? <span style={{ color: '#d1dcff' }}>{name}:</span> : null;
}

function Primitive({ value }: { value: JSONValue }) {
  const t = typeof value;
  if (value === null) return <span style={{ color: '#a6b3c3' }}>null</span>;
  if (t === 'string') return <span style={{ color: '#b7f5c8' }}>&quot;{value as string}&quot;</span>;
  if (t === 'number') return <span style={{ color: '#ffcf7c' }}>{String(value)}</span>;
  if (t === 'boolean') return <span style={{ color: '#ff9db5' }}>{String(value)}</span>;
  return <span>{String(value)}</span>;
}
