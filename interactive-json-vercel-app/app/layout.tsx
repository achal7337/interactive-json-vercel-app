export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>JSON Viewer & Search</title>
        <style>{`
          :root { --bg:#0b0f14; --ink:#e6eef8; --muted:#a6b3c3; --card:#121823; --accent:#5b9cff; }
          *{box-sizing:border-box}
          body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui, -apple-system, Segoe UI, Roboto}
          header{padding:14px 18px;border-bottom:1px solid #1c2633;background:var(--card)}
          .wrap{max-width:1100px;margin:0 auto;padding:18px}
          .card{background:var(--card);border:1px solid #1c2633;border-radius:16px;padding:16px;margin-bottom:18px}
          .hstack{display:flex;gap:12px;align-items:center}
          .vstack{display:flex;flex-direction:column;gap:12px}
          .tag{display:inline-flex;padding:2px 8px;border:1px solid #2a3a52;border-radius:999px;color:#9fc1ff;font-size:12px}
          button{background:var(--accent);color:white;border:0;padding:8px 12px;border-radius:10px;font-weight:600;cursor:pointer}
        `}</style>
      </head>
      <body>
        <header><div className="hstack"><strong>🔍 JSON Viewer & Search</strong></div></header>
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}
