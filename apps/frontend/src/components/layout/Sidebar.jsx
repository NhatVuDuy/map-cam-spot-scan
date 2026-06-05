import React from "react";
import SourceSelector from "../scanner/SourceSelector.jsx";
import AdminSearch from "../scanner/AdminSearch.jsx";
import BoundarySelector from "../scanner/BoundarySelector.jsx";
import AreaSelector from "../scanner/AreaSelector.jsx";
import CategoryFilter from "../scanner/CategoryFilter.jsx";
import ScanButton from "../scanner/ScanButton.jsx";

const S = {
  sidebar: {
    width: "290px", flexShrink: 0, background: "#1e293b",
    borderRight: "1px solid #334155", display: "flex", flexDirection: "column",
    overflowY: "auto", padding: "0.75rem", gap: "0.75rem",
  },
  section: { background: "#0f172a", borderRadius: "6px", padding: "0.75rem" },
  title: {
    fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem",
  },
  subTitle: {
    fontSize: "0.68rem", color: "#475569", fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.06em",
    margin: "0.6rem 0 0.35rem",
  },
  divider: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    margin: "0.55rem 0", color: "#334155", fontSize: "0.68rem",
  },
  dividerLine: { flex: 1, height: "1px", background: "#1e293b" },
  dividerText: { color: "#334155", whiteSpace: "nowrap" },
};

export default function Sidebar() {
  return (
    <aside style={S.sidebar}>
      <div style={S.section}>
        <div style={S.title}>Nguồn dữ liệu</div>
        <SourceSelector />
      </div>

      <div style={S.section}>
        <div style={S.title}>Khu vực quét</div>

        {/* Ranh giới hành chính HCM */}
        <div style={S.subTitle}>Ranh giới hành chính</div>
        <BoundarySelector />

        <div style={S.divider}>
          <span style={S.dividerLine} />
          <span style={S.dividerText}>hoặc tìm theo tên</span>
          <span style={S.dividerLine} />
        </div>

        {/* Nominatim search */}
        <AdminSearch />

        <div style={S.divider}>
          <span style={S.dividerLine} />
          <span style={S.dividerText}>hoặc nhập thủ công</span>
          <span style={S.dividerLine} />
        </div>

        {/* Manual lat/lng + radius */}
        <AreaSelector />
      </div>

      <div style={S.section}>
        <div style={S.title}>Loại địa điểm</div>
        <CategoryFilter />
      </div>

      <ScanButton />
    </aside>
  );
}
