'use client';
import { useEffect, useMemo, useState } from 'react';

export type NodeFilterProps = {
  node: any;
  onFilteredChange: (value: any) => void;
  title?: string;
};

export function NodeFilter({ node, onFilteredChange, title = 'Filter' }: NodeFilterProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => node, [node, query]);
  useEffect(() => { onFilteredChange(filtered); }, [filtered, onFilteredChange]);
  return (/* ...same JSX as above... */);
}
