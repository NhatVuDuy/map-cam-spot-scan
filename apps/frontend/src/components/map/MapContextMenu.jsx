import React, { useState, useEffect, useRef } from "react";
import { CATEGORIES } from "../../utils/categories.js";

const C = {
  bg: "#0d1829", bg2: "#0f1f35", border: "#1e3354",
  text: "#e2e8f0", muted: "#94a3b8", dim: "#475569",
  cyan: "#38BDF8", green: "#34D399", red: "#F87171",
};

const menuStyle = {
  position: "fixed",
  zIndex: 1000,
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: "8px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  minWidth: "200px",
  overflow: "hidden",
  userSelect: "none",
};

function MenuItem({ icon, label, sub, color, onClick, danger }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: "0.6rem",
        padding: "0.5rem 0.8rem", cursor: "pointer",
        background: hover ? (danger ? "#f8717118" : `${color || C.cyan}12`) : "transparent",
        transition: "background 0.1s",
      }}
    >
      <span style={{ fontSize: "1rem", width: "20px", textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.8rem", color: danger ? C.red : C.text, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: "0.67rem", color: C.muted, marginTop: "1px" }}>{sub}</div>}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: "1px", background: C.border, margin: "2px 0" }} />;
}

function CoordBadge({ lat, lng }) {
  return (
    <div style={{ padding: "0.4rem 0.8rem", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: "0.62rem", color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>Tọa độ</div>
      <div style={{ fontSize: "0.72rem", color: C.cyan, fontFamily: "monospace" }}>
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </div>
    </div>
  );
}

function AddPointForm({ lat, lng, onAdd, onCancel }) {
  const [category, setCategory] = useState("school");
  const [name, setName] = useState("");
  const catKeys = Object.keys(CATEGORIES).filter(k => k !== "intersection");

  const submit = () => {
    const cat = CATEGORIES[category];
    onAdd({
      id: `custom-${Date.now()}`,
      lat, lng,
      category,
      name: name.trim() || cat.label,
      distanceM: 0,
      score: 0,
      source: "custom",
      tags: {},
    });
  };

  return (
    <div style={{ padding: "0.6rem 0.8rem" }}>
      <div style={{ fontSize: "0.67rem", color: C.muted, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Thêm điểm thủ công
      </div>
      <input
        autoFocus
        placeholder="Tên địa điểm (tùy chọn)"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
        style={{
          width: "100%", padding: "5px 8px", marginBottom: "6px",
          background: C.bg2, border: `1px solid ${C.border}`,
          borderRadius: "5px", color: C.text, fontSize: "0.78rem", outline: "none",
        }}
      />
      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        style={{
          width: "100%", padding: "5px 8px", marginBottom: "8px",
          background: C.bg2, border: `1px solid ${C.border}`,
          borderRadius: "5px", color: C.text, fontSize: "0.78rem", outline: "none",
        }}
      >
        {catKeys.map(k => (
          <option key={k} value={k}>{CATEGORIES[k].label}</option>
        ))}
      </select>
      <div style={{ display: "flex", gap: "6px" }}>
        <button onClick={submit} style={{
          flex: 1, padding: "5px", background: `${C.cyan}22`,
          border: `1px solid ${C.cyan}55`, borderRadius: "5px",
          color: C.cyan, fontSize: "0.75rem", cursor: "pointer", fontWeight: 600,
        }}>✓ Thêm</button>
        <button onClick={onCancel} style={{
          padding: "5px 10px", background: "none",
          border: `1px solid ${C.border}`, borderRadius: "5px",
          color: C.muted, fontSize: "0.75rem", cursor: "pointer",
        }}>Hủy</button>
      </div>
    </div>
  );
}

export default function MapContextMenu({ x, y, lat, lng, onClose, onMoveCenter, onAddPoint }) {
  const [mode, setMode] = useState("menu"); // "menu" | "add"
  const ref = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  // Adjust position so menu doesn't overflow viewport
  const style = { ...menuStyle };
  const menuW = 210, menuH = mode === "add" ? 220 : 160;
  style.left = x + menuW > window.innerWidth  ? x - menuW : x;
  style.top  = y + menuH > window.innerHeight ? y - menuH : y;

  return (
    <div ref={ref} style={style}>
      <CoordBadge lat={lat} lng={lng} />

      {mode === "menu" ? (
        <>
          <MenuItem
            icon="📍"
            label="Dời tâm quét về đây"
            sub="Cập nhật tọa độ, chưa quét lại"
            color={C.cyan}
            onClick={() => { onMoveCenter(lat, lng); onClose(); }}
          />
          <Divider />
          <MenuItem
            icon="➕"
            label="Thêm điểm thủ công"
            sub="Chọn loại, thêm vào kết quả"
            color={C.green}
            onClick={() => setMode("add")}
          />
        </>
      ) : (
        <AddPointForm
          lat={lat} lng={lng}
          onAdd={(pt) => { onAddPoint(pt); onClose(); }}
          onCancel={() => setMode("menu")}
        />
      )}
    </div>
  );
}
