// app/golden/page.tsx
"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import TopNav from "@/components/TopNav";
import goldenRaw from "@/data/golden_examples.json";

type GoldenExample = {
  PROMPT?: any;
  RUBRIC?: any;
  RUBRICS?: any;
  TRAJECTORY?: any;
  GTFA?: any;
  CONTEXT?: any;
  NOTES?: any;
  ERRORS?: any;
  TAGS?: any;
  TITLE?: any;
  CATEGORY?: any;
  SERVER?: any;
  TOOL?: any;
  ID?: any;
  TASK_ID?: any;
  GTFA_SHORT?: any;
  HINT?: any;
  [key: string]: any;
};

const GOLDEN_EXAMPLES = goldenRaw as GoldenExample[];

/* ---------- helpers ---------- */

function toDisplay(value: any, fallback = ""): string {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function short(value: any, len = 140): string {
  const text = toDisplay(value);
  if (!text) return "";
  if (text.length <= len) return text;
  return text.slice(0, len) + "…";
}

function safeLower(value: any): string {
  return toDisplay(value).toLowerCase();
}

/* shared “code box” styles */
const codeBoxStyle: CSSProperties = {
  whiteSpace: "pre-wrap",
  borderRadius: 0,
  border: "none",
  padding: 12,
  maxHeight: 400,
  overflow: "auto",
  fontSize: 12,
  lineHeight: 1.45,
};

/* section box + header styles */
const sectionBoxStyle: CSSProperties = {
  borderRadius: 12,
  border: "1px solid #1e293b33",
  overflow: "hidden",
};

const sectionHeaderStyle: CSSProperties = {
  padding: "6px 10px",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  background: "rgba(251,146,60,0.92)", // orange bar
  color: "#111827",
  borderBottom: "1px solid rgba(194,65,12,0.85)",
};

const sectionBodyStyle: CSSProperties = {
  padding: 0,
};

const RUBRIC_HEIGHT = 320;

/* ---------- rubric + trajectory renderers ---------- */

function renderRubric(rubricRaw: any) {
  const commonStyle: CSSProperties = {
    ...codeBoxStyle,
    height: RUBRIC_HEIGHT,
    maxHeight: RUBRIC_HEIGHT,
    overflow: "auto",
    fontSize: 14, // bigger font for rubric
    lineHeight: 1.55,
  };

  // structured rubric array: [{ id, text, category, type, target }]
  if (
    Array.isArray(rubricRaw) &&
    rubricRaw.length > 0 &&
    typeof rubricRaw[0] === "object" &&
    rubricRaw[0] !== null &&
    "text" in rubricRaw[0]
  ) {
    return (
      <div style={commonStyle}>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          {rubricRaw.map((r: any, i: number) => (
            <li key={r.id ?? i} style={{ marginBottom: 10 }}>
              <div style={{ marginBottom: 3 }}>
                {r.text ?? "(no text)"}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  opacity: 0.8,
                }}
              >
                {r.category && <span>Category: {r.category} </span>}
                {r.type && <span>• Type: {r.type} </span>}
                {r.target && <span>• Target: {r.target}</span>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // fallback: plain string / anything else
  return (
    <pre style={commonStyle}>{toDisplay(rubricRaw, "(no RUBRICS)")}</pre>
  );
}

function getTrajectory(ex: GoldenExample) {
  const raw =
    ex.TRAJECTORY ??
    (ex as any)["GOLDEN TRAJECTORY"] ??
    (ex as any)["GOLDEN_TRAJECTORY"] ??
    (ex as any)["GOLDEN-TRAJECTORY"];
  return raw;
}

function renderTrajectory(raw: any) {
  if (!raw) {
    return (
      <pre style={{ ...codeBoxStyle, maxHeight: 500 }}>
        (no GOLDEN TRAJECTORY)
      </pre>
    );
  }

  let steps = raw;

  if (typeof raw === "string") {
    try {
      steps = JSON.parse(raw);
    } catch {
      return (
        <pre style={{ ...codeBoxStyle, maxHeight: 500 }}>
          {toDisplay(raw)}
        </pre>
      );
    }
  }

  if (!Array.isArray(steps)) {
    return (
      <pre style={{ ...codeBoxStyle, maxHeight: 500 }}>
        {toDisplay(raw)}
      </pre>
    );
  }

  const TOOL_COLORS = [
    { bg: "#dbeafe", border: "#1d4ed8" }, // blue
    { bg: "#dcfce7", border: "#16a34a" }, // green
    { bg: "#fee2e2", border: "#dc2626" }, // red
    { bg: "#fef3c7", border: "#d97706" }, // amber
    { bg: "#ede9fe", border: "#7c3aed" }, // purple
  ];

  return (
    <div style={{ ...codeBoxStyle, maxHeight: 500 }}>
      {steps.map((s: any, i: number) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div
            style={{
              fontWeight: 700,
              marginBottom: 6,
              fontSize: 13,
            }}
          >
            STEP {s.step ?? i + 1} — {s.role ?? "unknown"}
          </div>

          {s.content && (
            <pre
              style={{
                background: "transparent",
                padding: 6,
                borderLeft: "3px solid #64748b55",
                margin: "4px 0 8px 0",
                whiteSpace: "pre-wrap",
                fontSize: 12,
              }}
            >
              {toDisplay(s.content)}
            </pre>
          )}

          {Array.isArray(s.tool_calls) && s.tool_calls.length > 0 && (
            <>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                TOOL CALLS:
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {s.tool_calls.map((t: any, j: number) => {
                  const palette =
                    TOOL_COLORS[j % TOOL_COLORS.length];
                  const fnName = t.function?.name ?? "(no name)";
                  const args = toDisplay(t.function?.arguments);

                  return (
                    <div
                      key={j}
                      style={{
                        padding: 8,
                        borderRadius: 10,
                        background: palette.bg,
                        border: `1px solid ${palette.border}`,
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "#1e293b",
                          color: "#ffffffff",
                          fontSize: 11,
                          marginBottom: 6,
                        }}
                      >
                        {fnName}
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          background: "transparent",
                          padding: 0,
                          whiteSpace: "pre-wrap",
                          fontSize: 12,
                          color: "#111",
                        }}
                      >
                        {args}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- page ---------- */

export default function GoldenPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [serverFilter, setServerFilter] = useState<string>("all");
  const [toolFilter, setToolFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<number[]>([]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    GOLDEN_EXAMPLES.forEach((ex) => ex.CATEGORY && s.add(String(ex.CATEGORY)));
    return Array.from(s).sort();
  }, []);

  const servers = useMemo(() => {
    const s = new Set<string>();
    GOLDEN_EXAMPLES.forEach((ex) => ex.SERVER && s.add(String(ex.SERVER)));
    return Array.from(s).sort();
  }, []);

  const tools = useMemo(() => {
    const s = new Set<string>();
    GOLDEN_EXAMPLES.forEach((ex) => ex.TOOL && s.add(String(ex.TOOL)));
    return Array.from(s).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return GOLDEN_EXAMPLES.filter((ex) => {
      if (categoryFilter !== "all" && String(ex.CATEGORY) !== categoryFilter)
        return false;
      if (serverFilter !== "all" && String(ex.SERVER) !== serverFilter)
        return false;
      if (toolFilter !== "all" && String(ex.TOOL) !== toolFilter) return false;

      if (!q) return true;

      const rubricRaw = ex.RUBRIC ?? ex.RUBRICS;
      const trajectoryRaw = getTrajectory(ex);

      const haystack = [
        ex.TITLE,
        ex.PROMPT,
        rubricRaw,
        trajectoryRaw,
        ex.GTFA,
        ex.CONTEXT,
        ex.NOTES,
        ex.ERRORS,
        ex.TAGS,
        ex.CATEGORY,
        ex.SERVER,
        ex.TOOL,
        ex.ID,
        ex.TASK_ID,
        ex.GTFA_SHORT,
        ex.HINT,
      ]
        .map(safeLower)
        .join(" | ");

      return haystack.includes(q);
    });
  }, [search, categoryFilter, serverFilter, toolFilter]);

  function toggleExpand(idx: number) {
    setExpanded((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  }

  function resetFilters() {
    setSearch("");
    setCategoryFilter("all");
    setServerFilter("all");
    setToolFilter("all");
  }

  function expandAll() {
    setExpanded(filtered.map((_, idx) => idx));
  }

  function collapseAll() {
    setExpanded([]);
  }

  return (
    <>
      <TopNav />

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: 20 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Golden examples library</h1>
            <p style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>
              Stacked view of PROMPT, GTFA, GOLDEN TRAJECTORY and RUBRICS
              for training / QC.
            </p>
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, alignSelf: "flex-end" }}>
            Total: <strong>{GOLDEN_EXAMPLES.length}</strong> examples
          </div>
        </div>

        {/* Controls card */}
        <div className="card" style={{ padding: 12, marginTop: 8 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search PROMPT / GTFA / TRAJECTORY / RUBRICS (e.g. "tool selection")'
              style={{
                flex: "1 1 260px",
                minWidth: 220,
                padding: 8,
                borderRadius: 999,
                border: "1px solid #64748b",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ opacity: 0.8 }}>
                Showing <strong>{filtered.length}</strong> /{" "}
                <strong>{GOLDEN_EXAMPLES.length}</strong>
              </span>
              <button type="button" onClick={expandAll}>
                Expand all
              </button>
              <button type="button" onClick={collapseAll}>
                Collapse all
              </button>
              <button type="button" onClick={resetFilters}>
                Reset filters
              </button>
            </div>
          </div>

          {/* Filters row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 10,
              fontSize: 12,
            }}
          >
            <div style={{ minWidth: 150 }}>
              <div style={{ marginBottom: 4, opacity: 0.8 }}>Category</div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: 6,
                  borderRadius: 999,
                  border: "1px solid #64748b",
                }}
              >
                <option value="all">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: 150 }}>
              <div style={{ marginBottom: 4, opacity: 0.8 }}>Server</div>
              <select
                value={serverFilter}
                onChange={(e) => setServerFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: 6,
                  borderRadius: 999,
                  border: "1px solid #64748b",
                }}
              >
                <option value="all">All</option>
                {servers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: 150 }}>
              <div style={{ marginBottom: 4, opacity: 0.8 }}>Tool</div>
              <select
                value={toolFilter}
                onChange={(e) => setToolFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: 6,
                  borderRadius: 999,
                  border: "1px solid #64748b",
                }}
              >
                <option value="all">All</option>
                {tools.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div
            className="card"
            style={{ padding: 16, marginTop: 12, fontSize: 13 }}
          >
            No golden examples match these filters.
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
              Try loosening filters — or accept that this prompt belongs in the
              “do not use” museum 🏺
            </div>
          </div>
        ) : null}

        {/* Golden list */}
        {filtered.map((ex, idx) => {
          const isOpen = expanded.includes(idx);

          const rubricRaw = ex.RUBRIC ?? ex.RUBRICS;
          const trajectoryRaw = getTrajectory(ex);

          const title =
            toDisplay(ex.TITLE) ||
            toDisplay(ex.CATEGORY) ||
            toDisplay(ex.TOOL) ||
            `Golden #${idx + 1}`;

          const subtitle =
            short(ex.GTFA_SHORT) ||
            short(ex.PROMPT) ||
            short(ex.GTFA) ||
            "(no summary)";

          const tags =
            toDisplay(ex.TAGS)
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean) || [];

          return (
            <div
              key={idx}
              className="card"
              style={{ padding: 14, marginTop: 12 }}
            >
              {/* Summary header */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: "1 1 260px", minWidth: 240 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {title}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.9,
                      marginBottom: 6,
                    }}
                  >
                    {subtitle}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      fontSize: 11,
                      opacity: 0.9,
                    }}
                  >
                    {ex.CATEGORY && (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: "1px solid #47556966",
                        }}
                      >
                        {toDisplay(ex.CATEGORY)}
                      </span>
                    )}
                    {ex.SERVER && (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: "1px solid #47556966",
                        }}
                      >
                        {toDisplay(ex.SERVER)}
                      </span>
                    )}
                    {ex.TOOL && (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: "1px solid #47556966",
                        }}
                      >
                        {toDisplay(ex.TOOL)}
                      </span>
                    )}
                    {ex.TASK_ID && (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: "1px solid #47556933",
                        }}
                      >
                        task: {toDisplay(ex.TASK_ID)}
                      </span>
                    )}
                    {tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: "1px solid #47556933",
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(idx)}
                >
                  {isOpen ? "Collapse" : "Expand"}
                </button>
              </div>

              {/* Expanded stacked view */}
              {isOpen && (
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    fontSize: 12,
                  }}
                >
                  {/* PROMPT */}
                  <div style={sectionBoxStyle}>
                    <div style={sectionHeaderStyle}>PROMPT</div>
                    <div style={sectionBodyStyle}>
                      <pre style={codeBoxStyle}>
                        {toDisplay(ex.PROMPT, "(no PROMPT)")}
                      </pre>
                    </div>
                  </div>

                  {/* GTFA */}
                  <div style={sectionBoxStyle}>
                    <div style={sectionHeaderStyle}>GTFA</div>
                    <div style={sectionBodyStyle}>
                      <pre style={codeBoxStyle}>
                        {toDisplay(ex.GTFA, "(no GTFA)")}
                      </pre>
                    </div>
                  </div>

                  {/* GOLDEN TRAJECTORY */}
                  <div style={sectionBoxStyle}>
                    <div style={sectionHeaderStyle}>GOLDEN TRAJECTORY</div>
                    <div style={sectionBodyStyle}>
                      {renderTrajectory(trajectoryRaw)}
                    </div>
                  </div>

                  {/* RUBRICS */}
                  <div style={sectionBoxStyle}>
                    <div style={sectionHeaderStyle}>RUBRICS</div>
                    <div style={sectionBodyStyle}>
                      {renderRubric(rubricRaw)}
                    </div>
                  </div>

                  {/* NOTES / ERRORS / HINT (optional) */}
                  {(ex.NOTES || ex.ERRORS || ex.HINT) && (
                    <div style={sectionBoxStyle}>
                      <div style={sectionHeaderStyle}>
                        NOTES / ERRORS / HINT
                      </div>
                      <div style={sectionBodyStyle}>
                        <pre
                          style={{
                            ...codeBoxStyle,
                            maxHeight: 220,
                          }}
                        >
                          {[
                            ex.NOTES && `NOTES:\n${toDisplay(ex.NOTES)}`,
                            ex.ERRORS &&
                              `\n\nERRORS:\n${toDisplay(ex.ERRORS)}`,
                            ex.HINT && `\n\nHINT:\n${toDisplay(ex.HINT)}`,
                          ]
                            .filter(Boolean)
                            .join("")}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* CONTEXT (optional) */}
                  {ex.CONTEXT && (
                    <div style={sectionBoxStyle}>
                      <div style={sectionHeaderStyle}>CONTEXT</div>
                      <div style={sectionBodyStyle}>
                        <pre
                          style={{
                            ...codeBoxStyle,
                            maxHeight: 220,
                          }}
                        >
                          {toDisplay(ex.CONTEXT)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
