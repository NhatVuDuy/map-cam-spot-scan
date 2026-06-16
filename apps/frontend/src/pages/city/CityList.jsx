import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout, { NavBtn } from "../../components/layout/AppLayout.jsx";
import { getCities, addCity, deleteCity, seedBuiltInCities, getScanFilesByCity } from "../../utils/cityDB.js";

const C = {
  bg: "#060d1a", card: "#0d1829", card2: "#0f1f35", border: "#1a2e4a",
  cyan: "#38BDF8", violet: "#A78BFA", green: "#34D399", amber: "#FBBF24", red: "#F87171",
  text: "#e2e8f0", muted: "#64748b", dim: "#94a3b8",
};

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 32) || `city-${Date.now()}`;
}

/* ── Add City Modal ──────────────────────────────────────────────── */
function AddCityModal({ onClose, onAdd }) {
  const [name, setName]           = useState("");
  const [file, setFile]           = useState(null);
  const [parsed, setParsed]       = useState(null);
  const [parseErr, setParseErr]   = useState("");
  const [loading, setLoading]     = useState(false);

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setParsed(null);
    setParseErr("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        const features = json.features || [];
        // Accept both gis.vn format (ten_xa/ma_xa) and type='ward'
        const wards = features.filter(f => {
          const p = f.properties || {};
          return p.type === "ward" || p.ten_xa || p.ma_xa || p.Ten_xa || p.MaTT;
        });
        if (wards.length === 0) { setParseErr("Không tìm thấy dữ liệu phường/xã. Hãy tải file từ gis.vn hoặc file có type='ward'."); return; }
        // Normalize gis.vn features to have type='ward'
        const normalized = { ...json, features: features.map(f => {
          const p = f.properties || {};
        if (!p.type && (p.ten_xa || p.ma_xa)) return { ...f, properties: { ...p, type: "ward", name: p.ten_xa, code: p.ma_xa, wardCode: p.ma_xa } };
          return f;
        }) };
        setParsed({ geojsonData: normalized, wardCount: wards.length });
        if (!name) setName(f.name.replace(/\.[^.]+$/, "").replace(/-/g, " "));
      } catch {
        setParseErr("File JSON không hợp lệ.");
      }
    };
    reader.readAsText(f);
  }

  async function handleAdd() {
    if (!name.trim() || !parsed) return;
    setLoading(true);
    const id = slugify(name);
    await onAdd({ id, name: name.trim(), geojsonPath: null, geojsonData: parsed.geojsonData, wardCount: parsed.wardCount });
    setLoading(false);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "1.75rem", width: "100%", maxWidth: "480px", margin: "1rem" }}>
        <div style={{ fontWeight: 800, fontSize: "1rem", color: C.text, marginBottom: "1.25rem" }}>Thêm thành phố mới</div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: "0.35rem" }}>File GeoJSON ranh giới phường</label>
          <input type="file" accept=".geojson,.json" onChange={handleFile} style={{ fontSize: "0.8rem", color: C.dim, width: "100%" }} />
          {parseErr && <div style={{ fontSize: "0.72rem", color: C.red, marginTop: "0.35rem" }}>❌ {parseErr}</div>}
          {parsed && <div style={{ fontSize: "0.72rem", color: C.green, marginTop: "0.35rem" }}>✓ Hợp lệ — {parsed.wardCount} phường/xã</div>}
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: "0.35rem" }}>Tên thành phố</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="VD: Hà Nội, Đà Nẵng..."
            style={{ width: "100%", background: C.card2, border: `1px solid ${C.border}`, borderRadius: "7px", padding: "0.5rem 0.75rem", color: C.text, fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: "7px", padding: "0.5rem 1rem", color: C.muted, cursor: "pointer", fontSize: "0.82rem" }}>Hủy</button>
          <button onClick={handleAdd} disabled={!parsed || !name.trim() || loading} style={{
            background: `linear-gradient(135deg,${C.cyan},${C.violet})`, border: "none", borderRadius: "7px",
            padding: "0.5rem 1.25rem", color: "#fff", fontWeight: 700, fontSize: "0.82rem",
            cursor: parsed && name.trim() ? "pointer" : "not-allowed", opacity: parsed && name.trim() ? 1 : 0.5,
          }}>{loading ? "Đang thêm..." : "Thêm thành phố"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── City Card ───────────────────────────────────────────────────── */
function CityCard({ city, scanCount, onOpen, onDelete }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.cyan}`,
      borderRadius: "12px", padding: "1.25rem 1.4rem",
      display: "flex", flexDirection: "column", gap: "0.6rem",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: C.text }}>{city.name}</div>
          <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: "0.15rem" }}>
            {city.wardCount} phường/xã · {city.geojsonPath ? "Built-in" : "GeoJSON tải lên"}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {!city.geojsonPath && (
            <button onClick={onDelete} title="Xóa thành phố" style={{
              background: `${C.red}18`, border: `1px solid ${C.red}33`, borderRadius: "5px",
              padding: "3px 7px", color: C.red, cursor: "pointer", fontSize: "0.7rem",
            }}>🗑</button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.65rem", background: `${C.violet}18`, border: `1px solid ${C.violet}44`, borderRadius: "100px", padding: "2px 8px", color: C.violet }}>
          {scanCount} lần quét
        </span>
        {city.id === "hcm" && (
          <span style={{ fontSize: "0.62rem", color: C.green }}>✓ Mặc định</span>
        )}
      </div>

      <button onClick={onOpen} style={{
        background: `linear-gradient(135deg,${C.cyan},${C.violet})`, border: "none",
        borderRadius: "8px", padding: "0.55rem", width: "100%",
        color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
      }}>🗺 Mở City Scan →</button>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function CityList() {
  const navigate = useNavigate();
  const [cities, setCities]       = useState([]);
  const [scanCounts, setScanCounts] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading]     = useState(true);

  async function load() {
    setLoading(true);
    await seedBuiltInCities();
    const list = await getCities();
    setCities(list);
    // Load scan counts per city
    const counts = {};
    await Promise.all(list.map(async c => {
      const files = await getScanFilesByCity(c.id);
      counts[c.id] = files.length;
    }));
    setScanCounts(counts);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(cityData) {
    await addCity(cityData);
    await load();
  }

  async function handleDelete(id) {
    if (!confirm("Xóa thành phố này và tất cả dữ liệu quét?")) return;
    await deleteCity(id);
    await load();
  }

  return (
    <AppLayout
      featureName="City Scan"
      navButtons={
        <>
          <NavBtn color={C.amber} onClick={() => setShowModal(true)}>+ Thêm thành phố</NavBtn>
          <NavBtn color={C.cyan} onClick={() => navigate("/scan")}>🔍 Quét vùng</NavBtn>
        </>
      }
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.25rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: C.text, marginBottom: "0.4rem" }}>Chọn thành phố</div>
          <div style={{ fontSize: "0.82rem", color: C.dim }}>
            Quét toàn bộ phường/xã của thành phố để phân tích phân bổ camera. Kết quả lưu theo từng lần quét.
          </div>
        </div>

        {loading ? (
          <div style={{ color: C.muted, fontSize: "0.85rem" }}>Đang tải...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {cities.map(city => (
              <CityCard
                key={city.id}
                city={city}
                scanCount={scanCounts[city.id] || 0}
                onOpen={() => navigate(`/city/${city.id}`)}
                onDelete={() => handleDelete(city.id)}
              />
            ))}
            {/* Add new card */}
            <div
              onClick={() => setShowModal(true)}
              style={{
                background: C.card, border: `2px dashed ${C.border}`, borderRadius: "12px",
                padding: "1.25rem 1.4rem", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "0.5rem",
                cursor: "pointer", minHeight: "150px",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.cyan}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
            >
              <div style={{ fontSize: "1.75rem" }}>+</div>
              <div style={{ fontSize: "0.82rem", color: C.muted, textAlign: "center" }}>Thêm thành phố<br />(tải lên GeoJSON)</div>
            </div>
          </div>
        )}
      </div>

      {showModal && <AddCityModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
    </AppLayout>
  );
}
