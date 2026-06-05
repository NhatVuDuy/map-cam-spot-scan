import React, { useState, useEffect, useRef, useCallback } from "react";
import { searchAdmin } from "../../services/nominatim.js";
import { useScanner } from "../../hooks/useScanner.js";

const S = {
  root: { position: "relative" },
  inputWrap: {
    display: "flex", alignItems: "center", gap: "0",
    background: "#1e293b", border: "1px solid #334155",
    borderRadius: "4px", overflow: "hidden",
  },
  inputWrapFocused: { borderColor: "#38BDF8" },
  input: {
    flex: 1, padding: "0.38rem 0.5rem",
    background: "transparent", border: "none", outline: "none",
    color: "#e2e8f0", fontSize: "0.85rem",
  },
  clearBtn: {
    padding: "0 0.45rem", background: "transparent", border: "none",
    color: "#64748b", cursor: "pointer", fontSize: "1rem", lineHeight: 1,
  },
  spinner: { padding: "0 0.45rem", color: "#38BDF8", fontSize: "0.8rem", userSelect: "none" },

  dropdown: {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
    background: "#1e293b", border: "1px solid #334155", borderRadius: "6px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.45)", overflow: "hidden",
    maxHeight: "260px", overflowY: "auto",
  },
  item: (active) => ({
    padding: "0.5rem 0.65rem", cursor: "pointer", borderBottom: "1px solid #0f172a",
    background: active ? "#1e3a5f" : "transparent",
    display: "flex", flexDirection: "column", gap: "2px",
  }),
  itemName: { fontSize: "0.83rem", color: "#e2e8f0", fontWeight: 500 },
  itemSub:  { fontSize: "0.71rem", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  badge: (warn) => ({
    display: "inline-block",
    padding: "0 5px", borderRadius: "3px", fontSize: "0.65rem", fontWeight: 600,
    background: warn ? "rgba(251,113,133,0.18)" : "rgba(56,189,248,0.15)",
    color: warn ? "#fb7185" : "#38BDF8",
    marginLeft: "6px",
  }),
  warn: { padding: "0.35rem 0.65rem", fontSize: "0.71rem", color: "#fbbf24", background: "#1c1700" },
  empty: { padding: "0.6rem 0.65rem", fontSize: "0.8rem", color: "#475569", textAlign: "center" },
  applied: {
    marginTop: "0.35rem", padding: "0.3rem 0.5rem",
    background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)",
    borderRadius: "4px", fontSize: "0.72rem", color: "#7dd3fc",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
};

export default function AdminSearch() {
  const { setArea } = useScanner();

  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [open, setOpen]           = useState(false);
  const [focused, setFocused]     = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [applied, setApplied]     = useState(null);  // last applied result

  const abortRef  = useRef(null);
  const timerRef  = useRef(null);
  const rootRef   = useRef(null);

  // Debounced search
  const doSearch = useCallback((q) => {
    clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!q || q.trim().length < 2) {
      setResults([]); setLoading(false); setOpen(false); return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await searchAdmin(q, ctrl.signal);
        setResults(res);
        setOpen(res.length > 0);
        setActiveIdx(-1);
      } catch (err) {
        if (err.name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 380);
  }, []);

  useEffect(() => { doSearch(query); }, [query, doSearch]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applyResult = (r) => {
    setArea(r.area);
    setApplied(r);
    setOpen(false);
    setQuery(r.name);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); applyResult(results[activeIdx]); }
    if (e.key === "Escape") setOpen(false);
  };

  const clear = () => {
    setQuery(""); setResults([]); setOpen(false); setApplied(null); setActiveIdx(-1);
  };

  return (
    <div ref={rootRef} style={S.root}>
      {/* Input */}
      <div style={{ ...S.inputWrap, ...(focused ? S.inputWrapFocused : {}) }}>
        <span style={{ paddingLeft: "0.5rem", color: "#475569", fontSize: "0.85rem" }}>🔍</span>
        <input
          style={S.input}
          type="text"
          placeholder="Tìm tỉnh, quận, phường..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); if (results.length > 0) setOpen(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {loading && <span style={S.spinner}>⟳</span>}
        {query && !loading && (
          <button style={S.clearBtn} onClick={clear} title="Xóa">✕</button>
        )}
      </div>

      {/* Applied badge */}
      {applied && !open && (
        <div style={S.applied}>
          <span>
            <span style={{ color: "#38BDF8" }}>{applied.name}</span>
            {" — "}
            {applied.area.radiusM >= 1000
              ? `r = ${(applied.area.radiusM / 1000).toFixed(1)} km`
              : `r = ${applied.area.radiusM} m`}
          </span>
          {applied.tooLarge && <span style={{ color: "#fbbf24" }} title="Vùng lớn, bán kính đã giới hạn 15 km">⚠</span>}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div style={S.dropdown}>
          {results.length === 0 ? (
            <div style={S.empty}>Không tìm thấy</div>
          ) : (
            results.map((r, i) => (
              <div
                key={r.id}
                style={S.item(i === activeIdx)}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={() => applyResult(r)}
              >
                <span style={S.itemName}>
                  {r.name}
                  <span style={S.badge(r.tooLarge)}>{r.type}</span>
                  {r.tooLarge && <span style={S.badge(true)} title="Bán kính sẽ bị giới hạn 15 km">≥15 km</span>}
                </span>
                <span style={S.itemSub}>{r.displayName}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
