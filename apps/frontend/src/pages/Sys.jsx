import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/* ─── palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg:     "#060d1a",
  bg2:    "#0b1425",
  card:   "#0d1829",
  card2:  "#0f1f35",
  border: "#1a2e4a",
  border2:"#1e3a56",
  cyan:   "#38BDF8",
  violet: "#A78BFA",
  green:  "#34D399",
  amber:  "#FBBF24",
  pink:   "#F472B6",
  red:    "#F87171",
  text:   "#e2e8f0",
  muted:  "#64748b",
  dim:    "#94a3b8",
};

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function Tag({ children, color = C.cyan }) {
  return (
    <span style={{
      display: "inline-block",
      fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em",
      textTransform: "uppercase", padding: "3px 9px",
      borderRadius: "100px", border: `1px solid ${color}44`,
      background: `${color}14`, color,
    }}>{children}</span>
  );
}

function SectionTitle({ tag, title, sub }) {
  return (
    <div style={{ marginBottom: "2.5rem" }}>
      <Tag>{tag}</Tag>
      <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0.5rem 0 0.3rem", color: C.text }}>{title}</h2>
      {sub && <p style={{ color: C.muted, fontSize: "0.85rem" }}>{sub}</p>}
    </div>
  );
}

/* ─── layer box ───────────────────────────────────────────────────────────── */
function LayerBox({ title, color, icon, modules = [], note }) {
  return (
    <div style={{
      border: `1px solid ${color}44`,
      borderLeft: `3px solid ${color}`,
      borderRadius: "10px",
      background: `${color}08`,
      padding: "1.25rem 1.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
        <span style={{ fontWeight: 700, color, fontSize: "0.9rem" }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {modules.map((m) => (
          <span key={m} style={{
            fontSize: "0.75rem", padding: "4px 10px",
            background: `${color}18`, border: `1px solid ${color}30`,
            borderRadius: "6px", color: C.dim, fontFamily: "monospace",
          }}>{m}</span>
        ))}
      </div>
      {note && <div style={{ marginTop: "0.75rem", fontSize: "0.76rem", color: C.muted, borderTop: `1px solid ${color}20`, paddingTop: "0.6rem" }}>{note}</div>}
    </div>
  );
}

/* ─── flow arrow ──────────────────────────────────────────────────────────── */
function Arrow({ label, color = C.dim, vertical = false }) {
  if (vertical) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0.5rem 0", gap: "2px" }}>
      <div style={{ width: "1px", height: "20px", background: color }} />
      <div style={{ fontSize: "0.68rem", color: C.muted, background: C.bg, padding: "1px 6px", borderRadius: "4px", border: `1px solid ${C.border}` }}>{label}</div>
      <div style={{ fontSize: "0.9rem", color }}>↓</div>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: C.muted }}>
      <div style={{ height: "1px", width: "24px", background: color }} />
      <span style={{ fontSize: "0.68rem" }}>{label}</span>
      <span style={{ fontSize: "0.9rem", color }}>→</span>
    </div>
  );
}

/* ─── file row ────────────────────────────────────────────────────────────── */
function FileRow({ path, desc, badge, badgeColor = C.dim, inputs = [], outputs = [] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderBottom: `1px solid ${C.border}22`,
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.65rem 1.25rem", cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = `${C.cyan}08`}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <span style={{ color: C.muted, fontSize: "0.75rem", marginRight: "0.2rem" }}>{open ? "▼" : "▶"}</span>
        <code style={{ fontSize: "0.8rem", color: C.cyan, fontFamily: "monospace", flex: 1 }}>{path}</code>
        {badge && (
          <span style={{
            fontSize: "0.6rem", padding: "2px 8px", borderRadius: "100px",
            background: `${badgeColor}18`, border: `1px solid ${badgeColor}33`,
            color: badgeColor, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>{badge}</span>
        )}
        <span style={{ fontSize: "0.78rem", color: C.dim }}>{desc}</span>
      </div>
      {open && (
        <div style={{ padding: "0.75rem 1.25rem 0.75rem 3rem", background: `${C.bg2}`, borderTop: `1px solid ${C.border}22` }}>
          {inputs.length > 0 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.68rem", color: C.violet, fontWeight: 700, marginRight: "0.5rem" }}>INPUT</span>
              {inputs.map(i => <code key={i} style={{ fontSize: "0.72rem", color: C.dim, marginRight: "0.4rem", background: `${C.violet}14`, padding: "2px 6px", borderRadius: "4px" }}>{i}</code>)}
            </div>
          )}
          {outputs.length > 0 && (
            <div>
              <span style={{ fontSize: "0.68rem", color: C.green, fontWeight: 700, marginRight: "0.5rem" }}>OUTPUT</span>
              {outputs.map(o => <code key={o} style={{ fontSize: "0.72rem", color: C.dim, marginRight: "0.4rem", background: `${C.green}14`, padding: "2px 6px", borderRadius: "4px" }}>{o}</code>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── scan flow diagram ───────────────────────────────────────────────────── */
function ScanFlowDiagram() {
  const steps = [
    { label: "User Input",        sub: "lat/lng/radius\nboundary GeoJSON\ncategories",   color: C.amber,  icon: "👤" },
    { label: "scanStore.runScan()",sub: "Zustand action\n+ progress callbacks",           color: C.cyan,   icon: "🏪" },
    { label: "browserScan()",     sub: "buildOverpassQuery()\nfetchOverpass() x3 fallback", color: C.violet, icon: "📡" },
    { label: "Overpass API",      sub: "nodes + ways JSON\n(center / geom tags)",         color: C.green,  icon: "🌐" },
    { label: "normalizeElements()", sub: "classify tags\nextract coords",                 color: C.cyan,   icon: "⚙️" },
    { label: "Spatial Filter",    sub: "withinRadius()\npointInPolygon()\ndedup 20m",     color: C.violet, icon: "🔍" },
    { label: "detectIntersections()", sub: "node-sharing O(n)\nshape: quad/tri/alley/minor\nhasSignal check",  color: C.pink,   icon: "🔀" },
    { label: "planAllCameras()", sub: "CAM1 (đường dài)\nCAM2/2.1/2.2/2.3 (giao lộ)\nCAM_alley (đầu hẻm)", color: C.green, icon: "📷" },
    { label: "scorePoints()",    sub: "priority score\n→ sort desc → slice(maxResults)",  color: C.amber,  icon: "📊" },
    { label: "MapView + Table",  sub: "MapLibre layers\nresultsTable rows\ncameras-symbol", color: C.cyan, icon: "🗺️" },
  ];

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: "1rem" }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", minWidth: "120px",
          }}>
            <div style={{
              border: `1px solid ${s.color}55`,
              background: `${s.color}10`,
              borderRadius: "10px",
              padding: "0.75rem 0.5rem",
              textAlign: "center",
              width: "108px",
            }}>
              <div style={{ fontSize: "1.2rem", marginBottom: "0.3rem" }}>{s.icon}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: s.color, marginBottom: "0.3rem", lineHeight: 1.2 }}>{s.label}</div>
              <div style={{ fontSize: "0.62rem", color: C.muted, whiteSpace: "pre-line", lineHeight: 1.4 }}>{s.sub}</div>
            </div>
            <div style={{ fontSize: "0.6rem", color: C.muted, marginTop: "0.4rem" }}>Step {i + 1}</div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ display: "flex", alignItems: "center", marginTop: "1.8rem", color: C.muted, flexShrink: 0 }}>
              <div style={{ width: "16px", height: "1px", background: C.border2 }} />
              <span style={{ fontSize: "0.9rem" }}>›</span>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─── overpass query diagram ──────────────────────────────────────────────── */
function QueryDiagram() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
      <div style={{ background: C.card2, border: `1px solid ${C.violet}44`, borderRadius: "10px", padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.violet, marginBottom: "0.75rem" }}>BLOCK 1 — POIs</div>
        <pre style={{ fontSize: "0.71rem", color: C.dim, margin: 0, lineHeight: 1.6, fontFamily: "monospace", overflowX: "auto" }}>{`[out:json][timeout:50];
(
  node["amenity"~"school|..."](bbox);
  way["leisure"~"park|..."](bbox);
  ...
)->.pois;
.pois out center tags;`}</pre>
        <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: C.muted }}>
          → Trả về <code style={{ color: C.violet }}>center.lat/lon</code> duy nhất cho mỗi POI (node hoặc way). Không cần full geometry.
        </div>
      </div>
      <div style={{ background: C.card2, border: `1px solid ${C.cyan}44`, borderRadius: "10px", padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.cyan, marginBottom: "0.75rem" }}>BLOCK 2 — Roads</div>
        <pre style={{ fontSize: "0.71rem", color: C.dim, margin: 0, lineHeight: 1.6, fontFamily: "monospace", overflowX: "auto" }}>{`way["highway"~"trunk|primary|
  secondary|residential|
  living_street|service"
](bbox)->.roads;
.roads out geom tags;`}</pre>
        <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: C.muted }}>
          → Trả về <code style={{ color: C.cyan }}>geometry[]</code> — mảng tọa độ đầy đủ mọi node. Bắt buộc cho node-sharing algorithm.
        </div>
      </div>
    </div>
  );
}

/* ─── main ────────────────────────────────────────────────────────────────── */
export default function Sys() {
  const navigate = useNavigate();

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>

      {/* nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "52px",
        background: `${C.bg2}f0`, borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, fontSize: "0.85rem" }}>← Home</button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1rem" }}>📐</span>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>System Architecture</span>
          </div>
        </div>
        <button onClick={() => navigate("/map")} style={{
          background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
          border: "none", borderRadius: "8px",
          padding: "0.4rem 1.1rem",
          color: "#fff", fontWeight: 700, fontSize: "0.8rem",
          cursor: "pointer",
        }}>Open Scanner →</button>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "3rem 2rem" }}>

        {/* ── LAYER OVERVIEW ─────────────────────────────────────────────── */}
        <SectionTitle tag="Overview" title="Kiến trúc phân lớp" sub="Toàn bộ tính năng chính chạy trên browser — backend là optional." />

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "3.5rem" }}>
          <LayerBox
            title="🌐 External APIs"
            icon=""
            color={C.green}
            modules={["Overpass API (overpass-api.de, kumi.systems, private.coffee)", "Nominatim API (geocoding VN)", "OpenStreetMap tile server"]}
            note="Tất cả 3 Overpass endpoint được thử tuần tự (fallback). Nominatim chỉ dùng cho AdminSearch. CORS được hỗ trợ mặc định."
          />

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", color: C.muted, fontSize: "0.78rem" }}>
            <div style={{ height: "1px", flex: 1, background: C.border }} />
            fetch() / CORS
            <div style={{ height: "1px", flex: 1, background: C.border }} />
          </div>

          <LayerBox
            title="Browser Service Layer"
            icon="🛰️"
            color={C.cyan}
            modules={["browserScan.js", "nominatim.js", "boundarySearch.js", "api.js (backend fallback)"]}
            note="browserScan.js là entry point chính: build query → fetch Overpass → normalize → gọi algorithm layer → trả kết quả về store."
          />

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", color: C.muted, fontSize: "0.78rem" }}>
            <div style={{ height: "1px", flex: 1, background: C.border }} />
            pure functions
            <div style={{ height: "1px", flex: 1, background: C.border }} />
          </div>

          <LayerBox
            title="Algorithm Layer"
            icon="⚙️"
            color={C.violet}
            modules={["classifier.js", "intersection.js", "cameraPlacement.js", "spatialFilter.js", "pointInPolygon.js", "geo.js", "bearing.js"]}
            note="Tất cả pure functions — không có I/O, không có side effects. cameraPlacement.js lên sơ đồ CAM1/CAM2/CAM_alley; bearing.js tính góc/offset theo Haversine."
          />

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", color: C.muted, fontSize: "0.78rem" }}>
            <div style={{ height: "1px", flex: 1, background: C.border }} />
            Zustand store
            <div style={{ height: "1px", flex: 1, background: C.border }} />
          </div>

          <LayerBox
            title="State Layer"
            icon="🏪"
            color={C.amber}
            modules={["scanStore.js (Zustand)", "opfs.js (IndexedDB)", "sessionFile.js"]}
            note="Single source of truth: area, categories, boundary, points, roads, cameras, rawIntersections, intersectionOverrides, sessionFilename, sessionDisplayName, sessions[]. runScan() là orchestrator chính; saveToSystem/loadFromSystem/deleteFromSystem quản lý dự án qua IndexedDB."
          />

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", color: C.muted, fontSize: "0.78rem" }}>
            <div style={{ height: "1px", flex: 1, background: C.border }} />
            React props / hooks
            <div style={{ height: "1px", flex: 1, background: C.border }} />
          </div>

          <LayerBox
            title="UI Layer (React components)"
            icon="🖥️"
            color={C.pink}
            modules={["Landing.jsx", "Scanner.jsx", "Sys.jsx", "Header.jsx", "Sidebar.jsx", "MapView.jsx", "ResultsTable.jsx", "Legend.jsx", "AreaSelector.jsx", "BoundarySelector.jsx", "AdminSearch.jsx", "CategoryFilter.jsx", "ScanButton.jsx", "SessionsDrawer.jsx", "ConfirmDialog.jsx", "MapContextMenu.jsx"]}
            note="MapView dùng maplibregl trực tiếp (không dùng React wrapper). SessionsDrawer quản lý danh sách dự án IndexedDB. Mọi interaction update store → re-render chỉ components liên quan."
          />
        </div>

        {/* ── SCAN FLOW ──────────────────────────────────────────────────── */}
        <SectionTitle tag="Data Flow" title="Luồng xử lý một lần quét" sub="Từ lúc user nhấn Scan đến lúc marker hiện trên map." />
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: "12px", padding: "1.75rem",
          overflowX: "auto", marginBottom: "3.5rem",
        }}>
          <ScanFlowDiagram />

          <div style={{ marginTop: "1.5rem", padding: "1rem", background: C.bg2, borderRadius: "8px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.amber, marginBottom: "0.5rem" }}>⚡ Key insight: tại sao cần 2 output block?</div>
            <div style={{ fontSize: "0.78rem", color: C.dim, lineHeight: 1.7 }}>
              <strong style={{ color: C.text }}>POIs</strong>: dùng <code style={{ color: C.cyan }}>out center tags</code> — Overpass trả về 1 điểm centroid, đủ để pin marker trên map. <br />
              <strong style={{ color: C.text }}>Roads</strong>: dùng <code style={{ color: C.cyan }}>out geom tags</code> — Overpass trả về <em>toàn bộ</em> mảng node của mỗi way (<code>geometry[]</code>). Nếu dùng center tags, roads chỉ có 1 điểm → không thể so sánh node-sharing → intersection detection fail hoàn toàn.
            </div>
          </div>
        </div>

        {/* ── OVERPASS QUERY ─────────────────────────────────────────────── */}
        <SectionTitle tag="Overpass QL" title="Cấu trúc query Overpass" sub="Query được build tự động trong buildOverpassQuery() theo categories user chọn." />
        <div style={{ marginBottom: "3.5rem" }}>
          <QueryDiagram />
        </div>

        {/* ── INTERSECTION ALGORITHM ─────────────────────────────────────── */}
        <SectionTitle tag="Algorithm" title="Node-sharing intersection detection" sub="O(n) time complexity — phát hiện ngã ba/ngã tư/đầu hẻm từ ways OSM." />
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "3.5rem",
        }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.cyan, marginBottom: "0.75rem" }}>Bước 1 — Build nodeMap</div>
            <pre style={{ fontSize: "0.71rem", color: C.dim, margin: 0, lineHeight: 1.7, fontFamily: "monospace" }}>{`for each way in ways:
  for each node in way.geometry:
    key = lat.toFixed(5) + lon.toFixed(5)
    nodeMap[key].wayIds.add(way.id)
// precision ≈ 1.1m tại xích đạo`}</pre>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.violet, marginBottom: "0.75rem" }}>Bước 2 — Filter intersections</div>
            <pre style={{ fontSize: "0.71rem", color: C.dim, margin: 0, lineHeight: 1.7, fontFamily: "monospace" }}>{`for each node in nodeMap:
  if wayIds.size >= 2:
    dist = haversine(center, node)
    if dist <= radiusM:
      name = wayCount>=4 ? "Ngã tư lớn"
           : wayCount==3 ? "Ngã ba"
           :               "Giao cắt"`}</pre>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.green, marginBottom: "0.75rem" }}>Input</div>
            <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.78rem", color: C.dim, lineHeight: 1.8 }}>
              <li><code>ways[]</code> — mỗi way có <code>id</code> + <code>geometry: [{"{lat,lon}"}]</code></li>
              <li><code>center</code> — <code>{"{ lat, lng }"}</code></li>
              <li><code>radiusM</code> — bán kính lọc (metres)</li>
            </ul>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.amber, marginBottom: "0.75rem" }}>Output</div>
            <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.78rem", color: C.dim, lineHeight: 1.8 }}>
              <li><code>IntersectionPoint[]</code> sorted by wayCount desc</li>
              <li>Fields: <code>id, lat, lng, category, name, wayCount, distanceM, source</code></li>
              <li>Tối đa 300 points (cap)</li>
            </ul>
          </div>
        </div>

        {/* ── FILE MAP ───────────────────────────────────────────────────── */}
        <SectionTitle tag="Source Map" title="Bản đồ file source" sub="Click vào file để xem input/output. Monorepo: apps/frontend + apps/backend." />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "3.5rem" }}>

          {/* services */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "0.75rem 1.25rem", borderBottom: `1px solid ${C.border}`, fontSize: "0.72rem", fontWeight: 700, color: C.cyan }}>📂 services/</div>
            <FileRow path="browserScan.js" badge="core" badgeColor={C.cyan} desc="Orchestrator quét browser-side"
              inputs={["area {lat,lng,radiusM}", "categories[]", "boundary GeoJSON?"]}
              outputs={["{points[], roads[], meta}"]} />
            <FileRow path="nominatim.js" badge="api" badgeColor={C.green} desc="Nominatim geocoding VN"
              inputs={["query string"]}
              outputs={["AdminResult[] {name,lat,lng,radiusM}"]} />
            <FileRow path="boundarySearch.js" badge="local" badgeColor={C.violet} desc="Search GeoJSON ranh giới"
              inputs={["query string"]}
              outputs={["Feature[] (GeoJSON)"]} />
            <FileRow path="api.js" badge="optional" badgeColor={C.muted} desc="Backend API adapter (fallback)"
              inputs={["scan params"]}
              outputs={["scan result (từ Express)"]} />
          </div>

          {/* algorithms */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "0.75rem 1.25rem", borderBottom: `1px solid ${C.border}`, fontSize: "0.72rem", fontWeight: 700, color: C.violet }}>📂 algorithms/</div>
            <FileRow path="intersection.js" badge="key" badgeColor={C.pink} desc="Node-sharing giao lộ + phân loại shape"
              inputs={["ways[] (geom)", "center", "radiusM", "signalNodes[]"]}
              outputs={["IntersectionPoint[] {shape, armBearings, armClasses, hasSignal}"]} />
            <FileRow path="cameraPlacement.js" badge="key" badgeColor={C.green} desc="Lên sơ đồ camera từ giao lộ + đường dài"
              inputs={["intersections[]", "ways[]", "signalNodes[]", "center", "radiusM"]}
              outputs={["Camera[] {id, lat, lng, bearing, type}"]} />
            <FileRow path="classifier.js" badge="pure" badgeColor={C.dim} desc="OSM tags → category"
              inputs={["tags {amenity, leisure, …}"]}
              outputs={["category string | null"]} />
            <FileRow path="spatialFilter.js" badge="pure" badgeColor={C.dim} desc="Filter, dedup, score"
              inputs={["points[]", "center", "radiusM"]}
              outputs={["filtered+scored points[]"]} />
          </div>

          {/* utils */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "0.75rem 1.25rem", borderBottom: `1px solid ${C.border}`, fontSize: "0.72rem", fontWeight: 700, color: C.green }}>📂 utils/</div>
            <FileRow path="geo.js" badge="pure" badgeColor={C.dim} desc="haversine, getBBox, circleGeoJSON"
              inputs={["lat, lng, radiusM"]}
              outputs={["bbox[], distance, GeoJSON Feature"]} />
            <FileRow path="bearing.js" badge="pure" badgeColor={C.dim} desc="bearingBetween, offsetPoint, interpolateAlong"
              inputs={["lat1,lng1,lat2,lng2 hoặc bearing+dist"]}
              outputs={["bearing °", "{lat,lng} điểm offset"]} />
            <FileRow path="pointInPolygon.js" badge="pure" badgeColor={C.dim} desc="Ray-casting PIP + geometryBBox"
              inputs={["[lng,lat]", "GeoJSON geometry"]}
              outputs={["boolean", "[minLng,minLat,maxLng,maxLat]"]} />
            <FileRow path="opfs.js" badge="storage" badgeColor={C.amber} desc="IndexedDB: lưu/đọc/xóa/đổi tên dự án"
              inputs={["filename, state, displayName"]}
              outputs={["SessionMeta[] / saved filename"]} />
            <FileRow path="sessionFile.js" badge="io" badgeColor={C.dim} desc="Import/export file JSON ngoài hệ thống"
              inputs={["File object"]}
              outputs={["parsed session state"]} />
            <FileRow path="categories.js" badge="config" badgeColor={C.muted} desc="Category metadata (màu, icon)"
              inputs={[]}
              outputs={["CATEGORIES constant"]} />
          </div>

          {/* store + components */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "0.75rem 1.25rem", borderBottom: `1px solid ${C.border}`, fontSize: "0.72rem", fontWeight: 700, color: C.amber }}>📂 store/ & pages/</div>
            <FileRow path="store/scanStore.js" badge="zustand" badgeColor={C.amber} desc="Global state + runScan + session actions"
              inputs={["user actions"]}
              outputs={["points, roads, cameras, rawIntersections, intersectionOverrides, sessions[], …"]} />
            <FileRow path="sessions/SessionsDrawer.jsx" badge="ui" badgeColor={C.violet} desc="Quản lý dự án IndexedDB (open/rename/export/delete)"
              inputs={["sessions[] từ store"]}
              outputs={["calls loadFromSystem / renameInSystem / deleteFromSystem / exportFromSystem"]} />
            <FileRow path="pages/Scanner.jsx" badge="route /map" badgeColor={C.cyan} desc="Layout: Header + Sidebar + Map + Table"
              inputs={[]}
              outputs={[]} />
            <FileRow path="pages/Landing.jsx" badge="route /" badgeColor={C.violet} desc="Landing page, stats, CTA"
              inputs={[]}
              outputs={[]} />
            <FileRow path="pages/Sys.jsx" badge="route /sys" badgeColor={C.pink} desc="Architecture page (this page)"
              inputs={[]}
              outputs={[]} />
          </div>
        </div>

        {/* ── MAP LAYER ─────────────────────────────────────────────────── */}
        <SectionTitle tag="MapLibre" title="MapView: layers & sources" sub="Tất cả layers được khai báo trong map.on('load') và update qua setData()." />

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", overflow: "hidden", marginBottom: "3.5rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bg2 }}>
                {["Source ID", "Layer ID", "Type", "Dữ liệu", "Điều kiện"].map(h => (
                  <th key={h} style={{ padding: "0.7rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: C.dim, textAlign: "left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["radius",          "radius-fill / radius-line",        "fill + line", "circleGeoJSON(center, radiusM)",              "boundary == null"],
                ["boundary",        "boundary-fill / boundary-line",    "fill + line", "boundary.geometry (Polygon)",                 "boundary != null"],
                ["roads",           "road-layer",                       "line",        "ways[].geometry → [lng,lat][]",               "always"],
                ["points",          "points-halo",                      "circle",      "points[] GeoJSON",                            "POIs only (filter ≠ intersection)"],
                ["points",          "points-circle",                    "circle",      "points[] GeoJSON",                            "POIs only"],
                ["points",          "points-selected",                  "circle",      "selectedPoint.id filter",                     "highlight #FACC15"],
                ["points",          "points-label",                     "symbol",      "name field",                                  "zoom ≥ 14, POIs only"],
                ["points",          "intersections-minor",              "circle",      "category=intersection, shape=minor",          "circle sized by roadClass"],
                ["points",          "intersections-symbol",             "symbol",      "category=intersection, shape≠minor",          "ix-quad/ix-tri/ix-alley icons, icon-rotate=alleyBearing"],
                ["points",          "intersections-signal",             "circle",      "shape≠minor, hasSignal=true",                 "dot vàng #FBBF24"],
                ["points",          "intersections-label",              "symbol",      "name field",                                  "zoom ≥ 15, intersections only"],
                ["cameras",         "cameras-symbol",                   "symbol",      "cameras[] GeoJSON",                           "cam-icon-{type}, icon-anchor=bottom, icon-rotate=bearing"],
              ].map(([src, layer, type, data, cond]) => (
                <tr key={layer} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "0.6rem 1rem" }}><code style={{ fontSize: "0.73rem", color: C.cyan }}>{src}</code></td>
                  <td style={{ padding: "0.6rem 1rem" }}><code style={{ fontSize: "0.73rem", color: C.violet }}>{layer}</code></td>
                  <td style={{ padding: "0.6rem 1rem" }}><Tag color={C.dim}>{type}</Tag></td>
                  <td style={{ padding: "0.6rem 1rem", fontSize: "0.75rem", color: C.dim }}>{data}</td>
                  <td style={{ padding: "0.6rem 1rem", fontSize: "0.75rem", color: C.muted }}>{cond}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── CAMERA PLACEMENT ───────────────────────────────────────────── */}
        <SectionTitle tag="Algorithm" title="Camera Placement (cameraPlacement.js)" sub="Lên sơ đồ đặt camera tự động dựa trên loại giao lộ và đường dài." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "3.5rem" }}>
          {[
            { type: "CAM1",        color: C.cyan,   title: "Đường dài > 1km",          desc: "Đặt 1 cam/3km dọc đường, lọc theo bán kính quét. type: cam1" },
            { type: "CAM2 / 2.2",  color: C.amber,  title: "Giao lộ lớn + đèn",        desc: "3 cam/nhánh: 2 outbound+inbound (right lane) + 1 outbound (left lane). type: cam2 / cam22" },
            { type: "CAM2.1/2.3",  color: C.pink,   title: "Giao lộ lớn không đèn",    desc: "2 cam/nhánh tại cùng điểm, tips chạm nhau (icon-anchor: bottom). type: cam21 / cam23" },
            { type: "CAM_alley",   color: C.green,  title: "Đầu hẻm",                  desc: "2 cam tại miệng hẻm (5m vào trong), inbound + outbound. type: cam_alley" },
            { type: "Alley arm",   color: C.violet, title: "Xác định hướng hẻm",       desc: "Priority: user override (alleyArmBearing) → mixed road class (minClass) → T-junction branch → fallback armBearings[0]." },
            { type: "Back-to-back",color: C.dim,    title: "Tips-touch icon layout",    desc: "icon-anchor: bottom → 2 cam cùng anchor xoay ngược nhau, bases nhìn ra ngoài, tips chạm nhau." },
          ].map(({ type, color, title, desc }) => (
            <div key={type} style={{ background: C.card, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: "10px", padding: "1rem 1.25rem" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color, marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{type}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.text, marginBottom: "0.4rem" }}>{title}</div>
              <div style={{ fontSize: "0.75rem", color: C.dim, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* ── SESSION MANAGEMENT ─────────────────────────────────────────── */}
        <SectionTitle tag="Storage" title="Quản lý dự án (IndexedDB)" sub="Lưu/đọc kết quả scan và overrides vào trình duyệt — không cần backend, không cần HTTPS." />
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "1.5rem", marginBottom: "3.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[
              { action: "saveToSystem(name)",      color: C.cyan,   desc: "Lưu đè nếu đã có sessionFilename, tạo mới nếu chưa. Header chip: ○ → ●." },
              { action: "saveSessionAs(name)",     color: C.violet, desc: "Luôn tạo dự án mới, không đè file cũ." },
              { action: "loadFromSystem(file)",    color: C.green,  desc: "Đọc session từ IndexedDB, khôi phục toàn bộ state kể cả intersectionOverrides." },
              { action: "loadExternalFile(file)",  color: C.amber,  desc: "Load file JSON bên ngoài. Không tự thêm vào IDB, user cần bấm Lưu." },
              { action: "deleteFromSystem(file)",  color: C.red,    desc: "Xóa session khỏi IDB, xóa sessionFilename nếu đang mở." },
              { action: "renameInSystem(old, new)",color: C.pink,   desc: "Đổi tên session trong IDB và cập nhật sessionFilename nếu đang mở." },
            ].map(({ action, color, desc }) => (
              <div key={action} style={{ background: C.bg2, border: `1px solid ${color}22`, borderRadius: "8px", padding: "0.85rem 1rem" }}>
                <code style={{ fontSize: "0.75rem", color, display: "block", marginBottom: "0.4rem" }}>{action}</code>
                <div style={{ fontSize: "0.76rem", color: C.dim, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: C.bg2, borderRadius: "6px", border: `1px solid ${C.border}`, fontSize: "0.76rem", color: C.muted, lineHeight: 1.7 }}>
            <strong style={{ color: C.text }}>Scan flow:</strong> Mỗi lần quét xóa <code>sessionFilename → null</code> (unsaved ○) nhưng giữ <code>sessionDisplayName</code> để user biết đang ở dự án nào.
          </div>
        </div>

        {/* ── DEPLOY ─────────────────────────────────────────────────────── */}
        <SectionTitle tag="CI/CD" title="Build & Deploy pipeline" sub=".github/workflows/deploy.yml — trigger: push to main." />
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: "10px", padding: "1.5rem", marginBottom: "3.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            {[
              { label: "push to main", icon: "⬆️", color: C.amber },
              { label: "npm ci\n(frontend workspace)", icon: "📦", color: C.cyan },
              { label: "vite build\n→ dist/", icon: "🔨", color: C.violet },
              { label: "upload-pages-artifact\n(dist/)", icon: "📤", color: C.green },
              { label: "deploy-pages\nGitHub Pages", icon: "🌐", color: C.pink },
            ].map((s, i) => (
              <React.Fragment key={i}>
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  background: `${s.color}0e`, border: `1px solid ${s.color}33`,
                  borderRadius: "8px", padding: "0.75rem 1rem", minWidth: "120px",
                  textAlign: "center",
                }}>
                  <span style={{ fontSize: "1.3rem", marginBottom: "0.3rem" }}>{s.icon}</span>
                  <span style={{ fontSize: "0.68rem", color: s.color, fontWeight: 700, whiteSpace: "pre-line", lineHeight: 1.4 }}>{s.label}</span>
                </div>
                {i < 4 && <span style={{ color: C.muted, fontSize: "1.2rem" }}>→</span>}
              </React.Fragment>
            ))}
          </div>
          <div style={{ marginTop: "1.25rem", padding: "0.75rem 1rem", background: C.bg2, borderRadius: "6px", border: `1px solid ${C.border}`, fontSize: "0.76rem", color: C.muted, lineHeight: 1.7 }}>
            <strong style={{ color: C.text }}>Lưu ý:</strong> Chỉ frontend được deploy lên GitHub Pages. Backend (Express + PostGIS) là optional — chạy qua Docker Compose nếu cần. App hoạt động hoàn toàn không cần backend (browser-side scan).
          </div>
        </div>

        {/* bottom nav */}
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", paddingTop: "1rem" }}>
          <button onClick={() => navigate("/")} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: "8px", padding: "0.6rem 1.5rem",
            color: C.dim, cursor: "pointer", fontSize: "0.85rem",
          }}>← Home</button>
          <button onClick={() => navigate("/map")} style={{
            background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
            border: "none", borderRadius: "8px",
            padding: "0.6rem 1.5rem",
            color: "#fff", fontWeight: 700, fontSize: "0.85rem",
            cursor: "pointer",
          }}>Open Scanner →</button>
        </div>

      </div>
    </div>
  );
}
