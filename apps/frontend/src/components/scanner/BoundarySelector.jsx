import React, { useState, useEffect, useRef } from "react";
import { loadBoundaries, searchBoundaries, featureToArea } from "../../services/boundarySearch.js";
import useScanStore from "../../store/scanStore.js";

const LEVEL_LABEL = { district: "Quận/Huyện", ward: "Phường/Xã" };
const LEVEL_COLOR = { district: "#38BDF8", ward: "#A78BFA" };

const S = {
  root: { position: "relative" },
  inputWrap: (focused) => ({
    display: "flex", alignItems: "center",
    background: "#1e293b", border: `1px solid ${focused ? "#38BDF8" : "#334155"}`,
    borderRadius: "4px", overflow: "hidden", transition: "border-color 0.15s",
  }),
  icon: { paddingLeft: "0.5rem", color: "#475569", fontSize: "0.85rem", userSelect: "none" },
  input: {
    flex: 1, padding: "0.38rem 0.5rem", background: "transparent",
    border: "none", outline: "none", color: "#e2e8f0", fontSize: "0.85rem",
  },
  clearBtn: { padding: "0 0.45rem", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.95rem" },
  dropdown: {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
    background: "#1e293b", border: "1px solid #334155", borderRadius: "6px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)", maxHeight: "240px", overflowY: "auto",
  },
  item: (active) => ({
    padding: "0.45rem 0.65rem", cursor: "pointer", borderBottom: "1px solid #0f172a",
    background: active ? "#1e3a5f" : "transparent",
    display: "flex", flexDirection: "column", gap: "2px",
  }),
  itemTop: { display: "flex", alignItems: "center", gap: "6px" },
  itemName: { fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 500 },
  badge: (level) => ({
    fontSize: "0.62rem", padding: "1px 5px", borderRadius: "3px", fontWeight: 600,
    background: `${LEVEL_COLOR[level] || "#64748b"}22`,
    color: LEVEL_COLOR[level] || "#64748b",
    flexShrink: 0,
  }),
  itemSub: { fontSize: "0.7rem", color: "#64748b" },
  empty: { padding: "0.6rem 0.65rem", fontSize: "0.8rem", color: "#475569", textAlign: "center" },
  loading: { padding: "0.6rem 0.65rem", fontSize: "0.8rem", color: "#64748b", textAlign: "center" },
  applied: {
    marginTop: "0.35rem", padding: "0.3rem 0.55rem",
    background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)",
    borderRadius: "4px", fontSize: "0.72rem", color: "#c4b5fd",
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px",
  },
  appliedClose: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.85rem", padding: 0 },
};

export default function BoundarySelector() {
  const setArea     = useScanStore((s) => s.setArea);
  const setBoundary = useScanStore((s) => s.setBoundary);
  const boundary    = useScanStore((s) => s.boundary);

  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState([]);
  const [features,  setFeatures]  = useState([]);
  const [open,      setOpen]      = useState(false);
  const [focused,   setFocused]   = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loadErr,   setLoadErr]   = useState(null);

  const rootRef = useRef(null);

  // Load boundary file once
  useEffect(() => {
    loadBoundaries()
      .then(setFeatures)
      .catch(() => setLoadErr("Không tải được dữ liệu ranh giới"));
  }, []);

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const found = searchBoundaries(features, query);
    setResults(found);
    setOpen(found.length > 0);
    setActiveIdx(-1);
  }, [query, features]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const apply = (feature) => {
    setBoundary(feature);
    setArea(featureToArea(feature));
    setQuery(feature.properties.name);
    setOpen(false);
  };

  const clear = () => {
    setBoundary(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleKey = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); apply(results[activeIdx]); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={rootRef} style={S.root}>
      <div style={S.inputWrap(focused)}>
        <span style={S.icon}>🗺</span>
        <input
          style={S.input}
          type="text"
          placeholder={loadErr || "Tìm phường, quận... (HCM)"}
          value={query}
          disabled={!!loadErr}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); if (results.length > 0) setOpen(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKey}
          autoComplete="off"
        />
        {query && <button style={S.clearBtn} onMouseDown={clear} title="Xóa">✕</button>}
      </div>

      {/* Applied badge */}
      {boundary && !open && (
        <div style={S.applied}>
          <span>
            <span style={S.badge(boundary.properties.level)}>{LEVEL_LABEL[boundary.properties.level]}</span>
            {" "}<strong>{boundary.properties.name}</strong>
            {boundary.properties.parent && `, ${boundary.properties.parent}`}
          </span>
          <button style={S.appliedClose} onClick={clear} title="Bỏ chọn ranh giới">✕</button>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div style={S.dropdown}>
          {results.length === 0
            ? <div style={S.empty}>Không tìm thấy</div>
            : results.map((f, i) => {
                const p = f.properties;
                return (
                  <div
                    key={`${p.code || p.name}-${i}`}
                    style={S.item(i === activeIdx)}
                    onMouseEnter={() => setActiveIdx(i)}
                    onMouseDown={() => apply(f)}
                  >
                    <div style={S.itemTop}>
                      <span style={S.itemName}>{p.name}</span>
                      <span style={S.badge(p.level)}>{LEVEL_LABEL[p.level] || p.level}</span>
                    </div>
                    {p.parent && <span style={S.itemSub}>{p.parent} · {p.city || "TP. Hồ Chí Minh"}</span>}
                  </div>
                );
              })
          }
        </div>
      )}
    </div>
  );
}
