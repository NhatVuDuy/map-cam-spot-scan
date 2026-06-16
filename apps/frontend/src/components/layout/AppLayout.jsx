import React from "react";
import { useNavigate } from "react-router-dom";
import { version } from "../../../package.json";

const C = {
  bg:     "#060d1a",
  bg2:    "#0b1425",
  border: "#1e3354",
  text:   "#e2e8f0",
  muted:  "#64748b",
  dim:    "#94a3b8",
  cyan:   "#38BDF8",
};

const BUILD_DATE = typeof __BUILD_DATE__ !== "undefined" ? __BUILD_DATE__ : "";

/**
 * Shared page layout for all non-Landing pages.
 *
 * Nav bar (48px, sticky):
 *   LEFT   📹 CamSpot (→/) + "v2.x · YYYY-MM-DD" below
 *   CENTER featureName prop
 *   RIGHT  backButton | navButtons
 *
 * Usage:
 *   <AppLayout
 *     featureName="City Scan"
 *     backButton={<button onClick={() => navigate("/city")}>← Thành phố</button>}
 *     navButtons={<><button>CSV</button><button>JSON</button></>}
 *   >
 *     {page content}
 *   </AppLayout>
 */
export default function AppLayout({ featureName, backButton, navButtons, children, style = {} }) {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", ...style }}>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 200, flexShrink: 0,
        display: "grid", gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0 1rem", height: "48px",
        background: `${C.bg2}f4`,
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(14px)",
      }}>
        {/* LEFT — logo + version */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
          <span
            onClick={() => navigate("/")}
            style={{ fontSize: "1.25rem", cursor: "pointer", flexShrink: 0 }}
            title="Về trang chủ"
          >📹</span>
          <div style={{ lineHeight: 1.2, cursor: "pointer", minWidth: 0 }} onClick={() => navigate("/")}>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>CamSpot</div>
            <div style={{ fontSize: "0.58rem", color: C.muted, whiteSpace: "nowrap" }}>
              v{version}{BUILD_DATE ? ` · ${BUILD_DATE}` : ""}
            </div>
          </div>
        </div>

        {/* CENTER — feature name */}
        <div style={{
          fontSize: "0.85rem", fontWeight: 700, color: C.dim,
          whiteSpace: "nowrap", textAlign: "center", padding: "0 1rem",
        }}>
          {featureName}
        </div>

        {/* RIGHT — back + nav buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.4rem", minWidth: 0 }}>
          {backButton}
          {navButtons}
        </div>
      </nav>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Reusable nav button helpers ─────────────────────────────────── */
export function NavBtn({ children, color = C.dim, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      fontSize: "0.72rem", padding: "4px 10px", borderRadius: "6px",
      cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
      background: `${color}18`, border: `1px solid ${color}44`, color,
    }}>{children}</button>
  );
}

export function BackBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontSize: "0.72rem", padding: "4px 10px", borderRadius: "6px",
      cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
      background: "none", border: `1px solid ${C.border}`, color: C.muted,
    }}>{children}</button>
  );
}
