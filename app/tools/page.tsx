'use client';

import TopNav from "@/components/TopNav";
import rawTools from "@/data/tools.json";
import { useEffect, useMemo, useRef, useState } from "react";

type RawToolDef = { description: string; parameters: Record<string, string> };
type RawServerTools = Record<string, RawToolDef>;
type RawAllTools = Record<string, RawServerTools>;

type ToolDoc = {
  id: string;
  displayName: string;
  server: string;
  category: string;
  summary: string;
  fullDescription: string;
  parameters: { name: string; description: string }[];
};

const raw = rawTools as RawAllTools;

function prettyName(id: string) {
  return id.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function prettyCategory(s: string) {
  return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function buildToolsList(): ToolDoc[] {
  const result: ToolDoc[] = [];

  Object.entries(raw).forEach(([server, tools]) => {
    const category = prettyCategory(server);

    Object.entries(tools).forEach(([toolId, def]) => {
      const desc = def.description.trim();
      const firstDot = desc.indexOf(".");
      const summary = firstDot !== -1 ? desc.slice(0, firstDot + 1) : desc;

      const params = Object.entries(def.parameters).map(([name, description]) => ({
        name,
        description
      }));

      result.push({
        id: toolId,
        displayName: prettyName(toolId),
        server,
        category,
        summary,
        fullDescription: desc,
        parameters: params
      });
    });
  });

  return result.sort((a, b) => a.id.localeCompare(b.id));
}

const tools: ToolDoc[] = buildToolsList();

export default function ToolsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  const categories = ["All", ...new Set(tools.map(t => t.category))];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tools.filter(t => {
      const catMatch = category === "All" || category === t.category;
      const hay = [
        t.id,
        t.displayName,
        t.server,
        t.summary,
        t.fullDescription,
        ...t.parameters.map(p => `${p.name} ${p.description}`)
      ]
        .join(" ")
        .toLowerCase();
      return catMatch && hay.includes(q);
    });
  }, [search, category]);

  return (
    <>
      <TopNav />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        
        {/* Header */}
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 10 }}>
          Tools Documentation
        </h1>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            ref={searchRef}
            placeholder="Search tools…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #64748b",
              fontSize: 14
            }}
          />

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #64748b",
              fontSize: 14
            }}
          >
            {categories.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fill,minmax(350px,1fr))"
          }}
        >
          {filtered.map(t => {
            const open = openId === t.id;

            return (
              <div
                key={t.id}
                style={{
                  border: "1px solid #475569",
                  borderRadius: 12,
                  padding: 16,
                  backgroundColor: "rgba(255,255,255,0.03)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginBottom: 6,
                    color: "#94a3b8"
                  }}
                >
                  <span>{t.category}</span>
                  <span style={{ fontFamily: "monospace" }}>{t.id}</span>
                </div>

                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {t.displayName}
                </div>

                <div style={{ fontSize: 13, marginTop: 4, opacity: 0.8 }}>
                  {t.summary}
                </div>

                <button
                  onClick={() => setOpenId(open ? null : t.id)}
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#3b82f6",
                    background: "none",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  {open ? "Hide details ▲" : "Show details ▼"}
                </button>

                {open && (
                  <div style={{ marginTop: 12, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      Description
                    </div>
                    <div style={{ opacity: 0.9 }}>{t.fullDescription}</div>

                    <div style={{ fontWeight: 600, marginTop: 12 }}>
                      Parameters
                    </div>

                    {t.parameters.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        No parameters.
                      </div>
                    ) : (
                      <table style={{ width: "100%", marginTop: 6 }}>
                        <tbody>
                          {t.parameters.map(p => (
                            <tr key={p.name}>
                              <td
                                style={{
                                  padding: "4px 6px",
                                  width: "30%",
                                  fontFamily: "monospace",
                                  borderBottom: "1px solid #334155"
                                }}
                              >
                                {p.name}
                              </td>
                              <td
                                style={{
                                  padding: "4px 6px",
                                  borderBottom: "1px solid #334155"
                                }}
                              >
                                {p.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p style={{ opacity: 0.7, marginTop: 20 }}>No tools match search.</p>
        )}
      </div>
    </>
  );
}
