// components/TopNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';

type Theme = 'light' | 'dark';

export default function TopNav() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>('dark');

  // Load initial theme
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('theme') as Theme | null;
    let initial: Theme;

    if (stored === 'light' || stored === 'dark') {
      initial = stored;
    } else {
      const prefersDark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      initial = prefersDark ? 'dark' : 'light';
    }

    setTheme(initial);
    applyTheme(initial);
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    applyTheme(theme);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  function applyTheme(t: Theme) {
    const body = document.body;
    if (!body) return;

    // Page background + base text
    if (t === 'dark') {
      body.style.backgroundColor = '#0f172a';
      body.style.color = '#e5e7eb';
    } else {
      body.style.backgroundColor = '#f3f4f6';
      body.style.color = '#111827';
    }

    // All cards
    const cards = document.querySelectorAll<HTMLElement>('.card');
    cards.forEach(card => {
      if (t === 'dark') {
        card.style.backgroundColor = '#111827';
        card.style.border = '1px solid #1e293b';
        card.style.borderRadius = '12px';
        card.style.color = '#e5e7eb';
      } else {
        card.style.backgroundColor = '#ffffff';
        card.style.border = '1px solid #d1d5db';
        card.style.borderRadius = '12px';
        card.style.color = '#111827';
      }
    });

    // Inputs / selects / textareas
    const inputs = document.querySelectorAll<HTMLElement>('input, select, textarea');
    inputs.forEach(el => {
      if (t === 'dark') {
        el.style.backgroundColor = '#020617';
        el.style.color = '#e5e7eb';
        el.style.border = '1px solid #1e293b';
      } else {
        el.style.backgroundColor = '#ffffff';
        el.style.color = '#111827';
        el.style.border = '1px solid #cbd5e1';
      }
    });

    // Generic buttons (outside top nav)
    const buttons = document.querySelectorAll<HTMLButtonElement>('button');
    buttons.forEach(btn => {
      // leave nav buttons alone (we style them inline below)
      if (btn.dataset.nav === 'topnav') return;

      btn.style.borderRadius = '999px';
      btn.style.padding = '4px 12px';
      btn.style.fontSize = '13px';
      btn.style.fontWeight = '500';
      btn.style.border = 'none';
      btn.style.cursor = 'pointer';

      if (t === 'dark') {
        btn.style.backgroundColor = '#2563eb';
        btn.style.color = '#e5e7eb';
      } else {
        btn.style.backgroundColor = '#2563eb';
        btn.style.color = '#ffffff';
      }
    });
  }

  const isHome = pathname === '/';
  const isTools = pathname?.startsWith('/tools');

  // NAV STYLES
  const navWrapper: CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    borderBottom: '1px solid rgba(148,163,184,0.25)',
    backdropFilter: 'blur(10px)',
    backgroundColor:
      theme === 'dark'
        ? 'rgba(15,23,42,0.9)'
        : 'rgba(255,255,255,0.9)',
  };

  const navInner: CSSProperties = {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const titleStyle: CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    textDecoration: 'none',
    color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
  };

  const btnBase: CSSProperties = {
    padding: '6px 14px',
    borderRadius: 9999,
    fontSize: 14,
    fontWeight: 500,
    border: '1px solid transparent',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  };

  const inactive: CSSProperties = {
    backgroundColor: 'transparent',
    color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
    borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
  };

  const active: CSSProperties = {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    borderColor: '#1d4ed8',
  };

  const toggleBtn: CSSProperties = {
    padding: '4px 12px',
    borderRadius: 999,
    border: `1px solid ${theme === 'dark' ? '#475569' : '#cbd5e1'}`,
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
  };

  return (
    <div style={navWrapper}>
      <nav style={navInner}>
        <Link href="/" style={titleStyle}>
          Agent Environment
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/"
            style={{
              ...btnBase,
              ...(isHome ? active : inactive),
            }}
          >
            Home
          </Link>

          <Link
            href="/tools"
            style={{
              ...btnBase,
              ...(isTools ? active : inactive),
            }}
          >
            Tools
          </Link>

          <Link
            href="/golden-examples"
            style={{
              ...btnBase,
              ...(isTools ? active : inactive),
            }}
          >
            Golden Examples
          </Link>


          <button
            type="button"
            data-nav="topnav"
            onClick={() =>
              setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
            }
            style={toggleBtn}
          >
            {theme === 'light' ? '🌞 Light' : '🌙 Dark'}
          </button>
        </div>
      </nav>
    </div>
  );
}
