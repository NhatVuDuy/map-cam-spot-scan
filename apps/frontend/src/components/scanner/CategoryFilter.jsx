import React from "react";
import { useScanner } from "../../hooks/useScanner.js";
import { BLOCKS, BLOCK_KEYS, DEFAULT_BLOCKS, SQUARE_BLOCKS, CAM_TYPES, CAM_COLORS, camTotal } from "../../config/blocks.js";

const C = {
  bg: "#060d1a", card: "#0d1829", border: "#1a2e4a",
  text: "#e2e8f0", muted: "#64748b", dim: "#94a3b8",
  cyan: "#38BDF8", amber: "#FBBF24", green: "#34D399",
};

const GROUPS = [
  { label: "Giao thông",  keys: ["B01","B02","B03","B04","B05"] },
  { label: "Hẻm & Ngõ",  keys: ["B07","B07-S"] },
  { label: "Kiểm soát",   keys: ["B06"] },
  { label: "Địa điểm",    keys: ["B08","B09","B10","B11"] },
  { label: "Hạ tầng",     keys: ["B12","B13"] },
];

export default function CategoryFilter() {
  const { blocks, setBlocks, designMode, setDesignMode } = useScanner();

  function toggle(key) {
    if (blocks.includes(key)) setBlocks(blocks.filter(k => k !== key));
    else setBlocks([...blocks, key]);
  }

  return (
    <div style={{ fontSize: "0.78rem" }}>
      {/* Design mode toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem", padding: "0.4rem 0.5rem", background: C.card, borderRadius: "6px", border: `1px solid ${C.border}` }}>
        <span style={{ color: C.dim, fontSize: "0.7rem", fontWeight: 600 }}>Chế độ</span>
        <div style={{ display: "flex", gap: "2px", background: "#080f1e", borderRadius: "5px", padding: "2px" }}>
          {[{val: false, label:"Thực tế"},{val: true, label:"Thiết kế"}].map(({val, label}) => (
            <button key={label} onClick={() => setDesignMode(val)} style={{
              background: designMode === val ? `linear-gradient(135deg,${C.cyan},#A78BFA)` : "none",
              border: "none", borderRadius: "4px", padding: "3px 8px",
              color: designMode === val ? "#fff" : C.muted, fontWeight: designMode === val ? 700 : 400,
              fontSize: "0.68rem", cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Select all / none */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.5rem" }}>
        <button onClick={() => setBlocks(DEFAULT_BLOCKS)} style={{ fontSize:"0.65rem", background:"none", border:`1px solid ${C.border}`, color:C.muted, borderRadius:"3px", padding:"2px 6px", cursor:"pointer" }}>Tất cả</button>
        <button onClick={() => setBlocks([])} style={{ fontSize:"0.65rem", background:"none", border:`1px solid ${C.border}`, color:C.muted, borderRadius:"3px", padding:"2px 6px", cursor:"pointer" }}>Bỏ chọn</button>
      </div>

      {/* Groups */}
      {GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.58rem", fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem", paddingLeft: "0.1rem" }}>{group.label}</div>
          {group.keys.map(key => {
            const block = BLOCKS[key];
            const checked = blocks.includes(key);
            const total = camTotal(block);
            const isManual = block.detect === "none";
            return (
              <label key={key} style={{ display:"flex", alignItems:"flex-start", gap:"0.4rem", padding:"0.25rem 0.3rem", cursor:"pointer", borderRadius:"4px", opacity: isManual ? 0.6 : 1 }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(key)}
                  disabled={isManual}
                  style={{ marginTop:"1px", cursor: isManual ? "not-allowed" : "pointer", accentColor: block.color }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.3rem" }}>
                    <span style={{ color: block.color, fontSize: "0.7rem", flexShrink:0 }}>{SQUARE_BLOCKS.includes(key) ? "■" : "●"}</span>
                    <span style={{ fontSize:"0.65rem", fontWeight:700, color: block.color }}>{key}</span>
                    <span style={{ fontSize:"0.7rem", color: checked ? C.text : C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{block.name}</span>
                    {isManual && <span style={{ fontSize:"0.58rem", color:C.amber }}>⚠</span>}
                  </div>
                  {designMode && checked && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"2px", marginTop:"2px", paddingLeft:"0.9rem" }}>
                      {CAM_TYPES.filter(t => block.cams[t] > 0).map(t => (
                        <span key={t} style={{ fontSize:"0.55rem", background:`${CAM_COLORS[t]}18`, border:`1px solid ${CAM_COLORS[t]}44`, borderRadius:"3px", padding:"1px 4px", color:CAM_COLORS[t] }}>
                          {t}×{block.cams[t]}
                        </span>
                      ))}
                      <span style={{ fontSize:"0.55rem", color:C.muted }}>= {total}/{block.unit}</span>
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      ))}

      {designMode && (
        <div style={{ marginTop:"0.5rem", padding:"0.4rem 0.5rem", background:`${C.amber}0d`, border:`1px solid ${C.amber}33`, borderRadius:"5px", fontSize:"0.62rem", color:C.amber, lineHeight:1.5 }}>
          Chế độ Thiết kế hiển thị số lượng camera cần lắp đặt theo tiêu chuẩn cho mỗi vị trí. Chế độ Thực tế hiển thị camera phát hiện từ OSM.
        </div>
      )}
    </div>
  );
}
