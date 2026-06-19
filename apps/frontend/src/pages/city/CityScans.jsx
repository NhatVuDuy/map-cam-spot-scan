import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout, { NavBtn, BackBtn } from "../../components/layout/AppLayout.jsx";
import ScanProgress from "../../components/city/ScanProgress.jsx";
import { getCity, getCities, addCity, seedBuiltInCities, upsertScanFile } from "../../utils/cityDB.js";
import useScanFileStore from "../../store/scanFileStore.js";
import { aggregateWards, exportScanFileJSON } from "../../services/cityBatchScan.js";
import { DEFAULT_BLOCKS, BLOCKS, BLOCK_KEYS } from "../../config/blocks.js";

const C = {
  bg: "#060d1a", card: "#0d1829", card2: "#0f1f35", border: "#1a2e4a",
  cyan: "#38BDF8", violet: "#A78BFA", green: "#34D399", amber: "#FBBF24",
  red: "#F87171", orange: "#FB923C",
  text: "#e2e8f0", muted: "#64748b", dim: "#94a3b8",
};

function fmt(n) { return Math.round(n).toLocaleString("vi-VN"); }

const STATUS_BADGE = {
  done:      { label: "Hoàn tất", color: C.green },
  resumable: { label: "Chưa xong", color: C.amber },
  running:   { label: "Đang quét", color: C.cyan },
  error:     { label: "Lỗi", color: C.red },
  idle:      { label: "Mới", color: C.muted },
};

/* ── Confirm modal ───────────────────────────────────────────────── */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1.5rem", maxWidth: "360px", width: "90%", margin: "1rem" }}>
        <div style={{ fontSize: "0.88rem", color: C.text, marginBottom: "1.25rem", lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: "7px", padding: "0.45rem 1rem", color: C.muted, cursor: "pointer", fontSize: "0.82rem" }}>Hủy</button>
          <button onClick={onConfirm} style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: "7px", padding: "0.45rem 1rem", color: C.red, fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>Xóa</button>
        </div>
      </div>
    </div>
  );
}

/* ── New scan modal (3-step: city → name → config) ───────────────── */
function NewScanModal({ cities, onConfirm, onAddCity, onCancel }) {
  const [step, setStep] = useState("city"); // "city" | "name" | "config"
  const [selectedCity, setSelectedCity] = useState(cities[0] || null);
  const [showImport, setShowImport]     = useState(false);
  const [importing, setImporting]       = useState(false);
  const [importErr, setImportErr]       = useState("");

  // import form state
  const [importName, setImportName]         = useState("");
  const [importGeojson, setImportGeojson]   = useState(null);
  const [importWardCount, setImportWardCount] = useState(0);

  // step 2 – name
  const defaultScanName = `${selectedCity?.name || ""} — ${new Date().toLocaleDateString("vi-VN")}`;
  const [scanName, setScanName] = useState(defaultScanName);
  useEffect(() => { setScanName(`${selectedCity?.name || ""} — ${new Date().toLocaleDateString("vi-VN")}`); }, [selectedCity]);

  // step 3 – config
  const [selectedBlocks, setSelectedBlocks] = useState(new Set(DEFAULT_BLOCKS));
  const [maxResultsPreset, setMaxResultsPreset] = useState("unlimited"); // "100" | "300" | "500" | "800" | "unlimited"
  const presets = [
    { val: "100",       label: "100 điểm / phường",  sub: "Nhanh, ít dữ liệu" },
    { val: "300",       label: "300 điểm / phường",  sub: "Cân bằng" },
    { val: "500",       label: "500 điểm / phường",  sub: "Mặc định trình duyệt" },
    { val: "800",       label: "800 điểm / phường",  sub: "Nhiều dữ liệu" },
    { val: "unlimited", label: "Không giới hạn",     sub: "Chậm nhất, đầy đủ nhất" },
  ];
  function toggleBlock(id) {
    setSelectedBlocks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const gj = JSON.parse(ev.target.result);
        const wards = (gj.features || []).filter(f => f.properties?.type === "ward");
        if (wards.length === 0) { setImportErr("Không tìm thấy feature nào có type=ward trong GeoJSON"); return; }
        setImportGeojson(gj);
        setImportWardCount(wards.length);
        setImportErr("");
        if (!importName) setImportName(file.name.replace(/\.geojson$/i, ""));
      } catch { setImportErr("File không hợp lệ — phải là GeoJSON"); }
    };
    reader.readAsText(file);
  }

  async function handleAddCity() {
    if (!importGeojson || !importName.trim()) return;
    setImporting(true);
    try {
      const city = await onAddCity(importName.trim(), importGeojson, importWardCount);
      setSelectedCity(city);
      setShowImport(false);
      setImportGeojson(null); setImportName(""); setImportWardCount(0);
    } catch (err) { setImportErr(err.message); }
    setImporting(false);
  }

  const boxStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" };
  const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "1.75rem", maxWidth: "440px", width: "90%", margin: "1rem" };

  if (step === "city") return (
    <div style={boxStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: C.text, marginBottom: "0.25rem" }}>Chọn thành phố</div>
        <div style={{ fontSize: "0.75rem", color: C.dim, marginBottom: "1rem" }}>Chọn thành phố để quét, hoặc thêm thành phố mới bằng GeoJSON.</div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "1rem" }}>
          {cities.map(c => (
            <div key={c.id} onClick={() => setSelectedCity(c)} style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.6rem 0.9rem", borderRadius: "8px", cursor: "pointer",
              background: selectedCity?.id === c.id ? `${C.cyan}18` : C.card2,
              border: `1px solid ${selectedCity?.id === c.id ? C.cyan + "55" : C.border}`,
            }}>
              <span style={{ fontSize: "1.1rem" }}>🏙</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: selectedCity?.id === c.id ? C.cyan : C.text }}>{c.name}</div>
                <div style={{ fontSize: "0.63rem", color: C.muted }}>{c.wardCount || "?"} phường/xã</div>
              </div>
              {selectedCity?.id === c.id && <span style={{ color: C.cyan, fontSize: "0.8rem" }}>✓</span>}
            </div>
          ))}

          {/* Add city */}
          {!showImport ? (
            <button onClick={() => setShowImport(true)} style={{
              display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.9rem",
              borderRadius: "8px", cursor: "pointer", background: "transparent",
              border: `1px dashed ${C.border}`, color: C.dim, fontSize: "0.78rem",
            }}>
              <span>＋</span> Thêm thành phố từ GeoJSON
            </button>
          ) : (
            <div style={{ border: `1px solid ${C.cyan}44`, borderRadius: "9px", padding: "0.9rem", background: C.card2 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.cyan, marginBottom: "0.6rem" }}>Thêm thành phố mới</div>

              <label style={{ fontSize: "0.68rem", color: C.muted, display: "block", marginBottom: "0.25rem" }}>Tên thành phố</label>
              <input value={importName} onChange={e => setImportName(e.target.value)} placeholder="VD: Hà Nội"
                style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: "5px", padding: "0.35rem 0.6rem", color: C.text, fontSize: "0.78rem", outline: "none", boxSizing: "border-box", marginBottom: "0.5rem" }} />

              <label style={{ fontSize: "0.68rem", color: C.muted, display: "block", marginBottom: "0.25rem" }}>File GeoJSON ranh giới phường/xã</label>
              <input type="file" accept=".geojson,application/geo+json,application/json"
                onChange={handleFileChange}
                style={{ fontSize: "0.72rem", color: C.dim, marginBottom: "0.4rem" }} />

              {importGeojson && (
                <div style={{ fontSize: "0.68rem", color: C.green, marginBottom: "0.4rem" }}>✓ Đọc được {importWardCount} phường/xã</div>
              )}
              {importErr && <div style={{ fontSize: "0.68rem", color: C.red, marginBottom: "0.4rem" }}>{importErr}</div>}

              <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
                <button onClick={() => { setShowImport(false); setImportErr(""); }} style={{ flex: 1, background: "none", border: `1px solid ${C.border}`, borderRadius: "6px", padding: "0.35rem", color: C.muted, cursor: "pointer", fontSize: "0.74rem" }}>Hủy</button>
                <button onClick={handleAddCity} disabled={!importGeojson || !importName.trim() || importing}
                  style={{ flex: 2, background: importGeojson && importName.trim() ? `${C.cyan}22` : C.card, border: `1px solid ${importGeojson && importName.trim() ? C.cyan + "55" : C.border}`, borderRadius: "6px", padding: "0.35rem", color: importGeojson && importName.trim() ? C.cyan : C.muted, fontWeight: 700, cursor: "pointer", fontSize: "0.74rem" }}>
                  {importing ? "Đang thêm..." : "＋ Thêm"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: "7px", padding: "0.5rem 1.1rem", color: C.muted, cursor: "pointer", fontSize: "0.82rem" }}>Hủy</button>
          <button onClick={() => setStep("name")} disabled={!selectedCity} style={{
            background: selectedCity ? `linear-gradient(135deg,${C.cyan},${C.violet})` : C.card,
            border: "none", borderRadius: "7px", padding: "0.5rem 1.4rem",
            color: selectedCity ? "#fff" : C.muted, fontWeight: 700, fontSize: "0.84rem", cursor: selectedCity ? "pointer" : "not-allowed",
          }}>Tiếp theo →</button>
        </div>
      </div>
    </div>
  );

  if (step === "name") return (
    <div style={boxStyle}>
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
          <button onClick={() => setStep("city")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>← Đổi thành phố</button>
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: C.text, marginBottom: "0.25rem" }}>Quét mới — {selectedCity?.name}</div>
        <div style={{ fontSize: "0.78rem", color: C.dim, marginBottom: "1.25rem" }}>
          Quét toàn bộ {selectedCity?.wardCount || "?"} phường/xã từ OpenStreetMap. Kết quả lưu vào IndexedDB.
        </div>
        <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: "0.35rem" }}>Tên file quét</label>
        <input
          autoFocus
          value={scanName}
          onChange={e => setScanName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") setStep("config"); if (e.key === "Escape") onCancel(); }}
          style={{ width: "100%", background: C.card2, border: `1px solid ${C.cyan}55`, borderRadius: "7px", padding: "0.5rem 0.75rem", color: C.text, fontSize: "0.84rem", outline: "none", boxSizing: "border-box", marginBottom: "1.25rem" }}
        />
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: "7px", padding: "0.5rem 1.1rem", color: C.muted, cursor: "pointer", fontSize: "0.82rem" }}>Hủy</button>
          <button onClick={() => setStep("config")} style={{
            background: `linear-gradient(135deg,${C.cyan},${C.violet})`, border: "none",
            borderRadius: "7px", padding: "0.5rem 1.4rem", color: "#fff", fontWeight: 700,
            fontSize: "0.84rem", cursor: "pointer",
          }}>Cấu hình →</button>
        </div>
      </div>
    </div>
  );

  // step === "config"
  const finalMaxResults = maxResultsPreset === "unlimited" ? Infinity : parseInt(maxResultsPreset);
  return (
    <div style={boxStyle}>
      <div style={{ ...cardStyle, maxWidth: "560px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
          <button onClick={() => setStep("name")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>← Đổi tên</button>
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: C.text, marginBottom: "0.1rem" }}>Cấu hình quét — {selectedCity?.name}</div>
        <div style={{ fontSize: "0.72rem", color: C.muted, marginBottom: "1.1rem" }}>"{scanName}"</div>

        {/* Block selection */}
        <div style={{ marginBottom: "1.1rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.dim, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Block địa điểm
            <span style={{ marginLeft: "0.5rem", color: C.muted, fontWeight: 400, textTransform: "none" }}>({selectedBlocks.size}/{BLOCK_KEYS.filter(k => BLOCKS[k].detect !== "none").length} active)</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
            {BLOCK_KEYS.map(id => {
              const b = BLOCKS[id];
              const active = selectedBlocks.has(id);
              const noDetect = b.detect === "none";
              return (
                <label key={id} style={{
                  display: "flex", alignItems: "center", gap: "0.45rem",
                  padding: "0.35rem 0.6rem", borderRadius: "6px", cursor: noDetect ? "not-allowed" : "pointer",
                  background: active ? `${b.color}14` : C.card2,
                  border: `1px solid ${active ? b.color + "55" : C.border}`,
                  opacity: noDetect ? 0.45 : 1,
                }}>
                  <input type="checkbox" checked={active} disabled={noDetect}
                    onChange={() => !noDetect && toggleBlock(id)}
                    style={{ accentColor: b.color, cursor: noDetect ? "not-allowed" : "pointer" }} />
                  <span style={{ fontSize: "0.82rem" }}>{b.symbol}</span>
                  <span style={{ fontSize: "0.68rem", color: active ? C.text : C.muted, flex: 1 }}>{id} — {b.name.slice(0, 26)}{b.name.length > 26 ? "…" : ""}</span>
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
            <button onClick={() => setSelectedBlocks(new Set(DEFAULT_BLOCKS))} style={{ fontSize: "0.65rem", background: "none", border: `1px solid ${C.border}`, borderRadius: "4px", padding: "2px 8px", color: C.muted, cursor: "pointer" }}>Reset mặc định</button>
            <button onClick={() => setSelectedBlocks(new Set(BLOCK_KEYS))} style={{ fontSize: "0.65rem", background: "none", border: `1px solid ${C.border}`, borderRadius: "4px", padding: "2px 8px", color: C.muted, cursor: "pointer" }}>Chọn tất cả</button>
            <button onClick={() => setSelectedBlocks(new Set())} style={{ fontSize: "0.65rem", background: "none", border: `1px solid ${C.border}`, borderRadius: "4px", padding: "2px 8px", color: C.muted, cursor: "pointer" }}>Bỏ chọn tất cả</button>
          </div>
        </div>

        {/* Max results preset */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.dim, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>Giới hạn kết quả / phường</div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {presets.map(p => (
              <button key={p.val} onClick={() => setMaxResultsPreset(p.val)} style={{
                padding: "0.35rem 0.75rem", borderRadius: "7px", fontSize: "0.72rem", cursor: "pointer",
                background: maxResultsPreset === p.val ? `${C.cyan}22` : C.card2,
                border: `1px solid ${maxResultsPreset === p.val ? C.cyan + "88" : C.border}`,
                color: maxResultsPreset === p.val ? C.cyan : C.muted, fontWeight: maxResultsPreset === p.val ? 700 : 400,
              }}>
                <div>{p.label}</div>
                <div style={{ fontSize: "0.6rem", opacity: 0.7 }}>{p.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: "7px", padding: "0.5rem 1.1rem", color: C.muted, cursor: "pointer", fontSize: "0.82rem" }}>Hủy</button>
          <button
            disabled={selectedBlocks.size === 0}
            onClick={() => onConfirm(selectedCity, scanName.trim() || defaultScanName, {
              blocks: [...selectedBlocks],
              maxResults: finalMaxResults,
            })}
            style={{
              background: selectedBlocks.size > 0 ? `linear-gradient(135deg,${C.green},${C.cyan})` : C.card,
              border: "none", borderRadius: "7px", padding: "0.5rem 1.4rem",
              color: selectedBlocks.size > 0 ? "#fff" : C.muted, fontWeight: 700,
              fontSize: "0.84rem", cursor: selectedBlocks.size > 0 ? "pointer" : "not-allowed",
            }}>🚀 Bắt đầu quét</button>
        </div>
      </div>
    </div>
  );
}

/* ── Import scan modal ───────────────────────────────────────────── */
function ImportScanModal({ cityId, onImported, onCancel }) {
  const [file, setFile]     = useState(null);
  const [data, setData]     = useState(null);
  const [err, setErr]       = useState("");
  const [importing, setImporting] = useState(false);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.wards && !parsed.wardCounts) { setErr("File không hợp lệ — cần có trường 'wards' hoặc 'wardCounts'"); return; }
        setData(parsed);
        setErr("");
        setFile(f);
      } catch { setErr("File không hợp lệ — phải là JSON"); }
    };
    reader.readAsText(f);
  }

  async function doImport() {
    if (!data) return;
    setImporting(true);
    try {
      const wards = data.wards || data.wardCounts || [];
      const meta = data.meta || {};
      const now = new Date().toISOString();
      const scanId = `${cityId}_import_${Date.now()}`;
      const scanName = meta.name || file?.name?.replace(/\.json$/i, "") || `Import ${new Date().toLocaleDateString("vi-VN")}`;
      await upsertScanFile({
        id: scanId,
        cityId: meta.cityId || cityId,
        name: scanName,
        folderId: null,
        createdAt: meta.exportedAt || now,
        savedAt: now,
        status: wards.filter(w => w.error).length > 0 ? "resumable" : "done",
        wardCounts: wards,
      });
      onImported(scanId);
    } catch (e) { setErr(e.message); }
    setImporting(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "1.75rem", maxWidth: "420px", width: "90%", margin: "1rem" }}>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: C.text, marginBottom: "0.25rem" }}>Import kết quả quét</div>
        <div style={{ fontSize: "0.75rem", color: C.dim, marginBottom: "1.25rem" }}>Chọn file JSON đã export từ máy khác. Dữ liệu thống kê sẽ được khôi phục; geometry cần quét lại để xem chi tiết phường.</div>

        <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: "0.3rem" }}>File JSON export</label>
        <input type="file" accept=".json,application/json" onChange={handleFile}
          style={{ fontSize: "0.74rem", color: C.dim, marginBottom: "0.6rem", display: "block" }} />

        {data && (
          <div style={{ fontSize: "0.7rem", color: C.green, marginBottom: "0.5rem" }}>
            ✓ {(data.wards || data.wardCounts || []).length} phường · {data.meta?.name || "Không có tên"}
          </div>
        )}
        {err && <div style={{ fontSize: "0.7rem", color: C.red, marginBottom: "0.5rem" }}>{err}</div>}

        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button onClick={onCancel} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: "7px", padding: "0.45rem 1rem", color: C.muted, cursor: "pointer", fontSize: "0.82rem" }}>Hủy</button>
          <button onClick={doImport} disabled={!data || importing} style={{
            background: data ? `${C.green}22` : C.card, border: `1px solid ${data ? C.green + "55" : C.border}`,
            borderRadius: "7px", padding: "0.45rem 1.2rem", color: data ? C.green : C.muted,
            fontWeight: 700, fontSize: "0.82rem", cursor: data ? "pointer" : "not-allowed",
          }}>{importing ? "Đang import..." : "⬆ Import"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── File tree ───────────────────────────────────────────────────── */
function FileTree({ scanFiles, folders, activeScanId, onSelect, onRename, onMove, onDelete, onCreateFolder, onRenameFolder, onDeleteFolder }) {
  const [editingFile, setEditingFile]     = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [confirm, setConfirm]             = useState(null);
  const [movingFile, setMovingFile]       = useState(null);

  function grouped() {
    const byFolder = {};
    const ungrouped = [];
    for (const f of scanFiles) {
      if (f.folderId) (byFolder[f.folderId] = byFolder[f.folderId] || []).push(f);
      else ungrouped.push(f);
    }
    return { byFolder, ungrouped };
  }

  const { byFolder, ungrouped } = useMemo(grouped, [scanFiles]);

  function handleDeleteFile(id, name) { setConfirm({ type: "file", id, name }); }
  function handleDeleteFolder(id, name) { setConfirm({ type: "folder", id, name }); }
  function doConfirm() {
    if (confirm.type === "file") onDelete(confirm.id);
    else onDeleteFolder(confirm.id);
    setConfirm(null);
  }

  function FileRow({ file, indent = 0 }) {
    const badge = STATUS_BADGE[file.status] || STATUS_BADGE.idle;
    const isActive = file.id === activeScanId;
    const agg = file.wardCounts?.length ? aggregateWards(file.wardCounts) : null;
    const isMoving = movingFile === file.id;

    if (editingFile === file.id) {
      return (
        <RenameInput
          defaultValue={file.name}
          onConfirm={name => { onRename(file.id, name); setEditingFile(null); }}
          onCancel={() => setEditingFile(null)}
          indent={indent}
        />
      );
    }

    return (
      <>
        <div
          draggable={true}
          onDragStart={e => e.dataTransfer.setData("fileId", file.id)}
          onClick={() => onSelect(file)}
          style={{
            padding: `0.45rem 0.75rem 0.45rem ${0.75 + indent * 1.1}rem`,
            display: "flex", alignItems: "center", gap: "0.5rem",
            cursor: "pointer", borderRadius: "6px",
            background: isActive ? `${C.cyan}14` : "transparent",
            border: isActive ? `1px solid ${C.cyan}33` : "1px solid transparent",
            marginBottom: "2px",
          }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `${C.border}55`; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
        >
          <span style={{ fontSize: "0.8rem" }}>📄</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.74rem", fontWeight: 600, color: isActive ? C.cyan : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </div>
            <div style={{ fontSize: "0.62rem", color: C.muted }}>
              {new Date(file.createdAt).toLocaleDateString("vi-VN")}
              {agg ? ` · ${fmt(agg.poiCount)} điểm` : ""}
            </div>
          </div>
          <span style={{ fontSize: "0.58rem", padding: "2px 6px", borderRadius: "100px", border: `1px solid ${badge.color}44`, color: badge.color, background: `${badge.color}14`, whiteSpace: "nowrap" }}>
            {badge.label}
          </span>
          <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: "2px" }}>
            <button onClick={() => setEditingFile(file.id)} title="Đổi tên" style={iconBtn}>✏️</button>
            <button onClick={() => setMovingFile(isMoving ? null : file.id)} title="Di chuyển vào thư mục" style={iconBtn}>📁</button>
            <button onClick={() => handleDeleteFile(file.id, file.name)} title="Xóa" style={iconBtn}>🗑</button>
          </div>
        </div>
        {isMoving && (
          <div onClick={e => e.stopPropagation()} style={{ padding: `0.2rem 0.75rem 0.35rem ${0.75 + indent * 1.1 + 1.3}rem` }}>
            <select
              autoFocus
              defaultValue={file.folderId || ""}
              onChange={e => { onMove(file.id, e.target.value || null); setMovingFile(null); }}
              style={{ width: "100%", background: C.card2, border: `1px solid ${C.cyan}55`, borderRadius: "5px", padding: "3px 6px", color: C.text, fontSize: "0.72rem", outline: "none", cursor: "pointer" }}
            >
              <option value="">Không có thư mục</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.35rem 0.75rem", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>File quét</span>
        <button onClick={() => setNewFolderMode(true)} title="Thêm thư mục" style={{ ...iconBtn, fontSize: "0.65rem" }}>📁+</button>
      </div>

      {newFolderMode && (
        <RenameInput
          defaultValue="Thư mục mới"
          placeholder="Tên thư mục"
          onConfirm={name => { onCreateFolder(name); setNewFolderMode(false); }}
          onCancel={() => setNewFolderMode(false)}
          indent={0}
        />
      )}

      {ungrouped.map(f => <FileRow key={f.id} file={f} folders={folders} />)}

      {folders.map(folder => (
        <div
          key={folder.id}
          style={{ marginBottom: "4px" }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = `${C.cyan}22`; }}
          onDragLeave={e => { e.currentTarget.style.background = "transparent"; }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.background = "transparent"; const id = e.dataTransfer.getData("fileId"); if (id) onMove(id, folder.id); }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.75rem" }}>
            <span style={{ fontSize: "0.78rem" }}>📁</span>
            {editingFolder === folder.id ? (
              <RenameInput
                defaultValue={folder.name}
                onConfirm={name => { onRenameFolder(folder.id, name); setEditingFolder(null); }}
                onCancel={() => setEditingFolder(null)}
                inline
              />
            ) : (
              <>
                <span style={{ fontSize: "0.74rem", fontWeight: 700, color: C.dim, flex: 1 }}>{folder.name}</span>
                <button onClick={() => setEditingFolder(folder.id)} style={iconBtn}>✏️</button>
                <button onClick={() => handleDeleteFolder(folder.id, folder.name)} style={iconBtn}>🗑</button>
              </>
            )}
          </div>
          {(byFolder[folder.id] || []).map(f => (
            <FileRow key={f.id} file={f} indent={1} folders={folders} />
          ))}
        </div>
      ))}

      {scanFiles.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem 1rem", fontSize: "0.78rem", color: C.muted }}>
          Chưa có file quét nào.<br />Bấm "+ Quét mới" để bắt đầu.
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message={confirm.type === "file"
            ? `Xóa file "${confirm.name}"? Toàn bộ dữ liệu phường đã quét sẽ bị mất.`
            : `Xóa thư mục "${confirm.name}"? Các file bên trong sẽ được chuyển ra ngoài.`}
          onConfirm={doConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function RenameInput({ defaultValue = "", placeholder, onConfirm, onCancel, indent = 0, inline = false }) {
  const [val, setVal] = useState(defaultValue);
  if (inline) {
    return (
      <>
        <input autoFocus value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onConfirm(val.trim() || defaultValue); if (e.key === "Escape") onCancel(); }}
          style={{ flex: 1, background: C.card2, border: `1px solid ${C.cyan}`, borderRadius: "4px", padding: "2px 6px", color: C.text, fontSize: "0.72rem", outline: "none" }} />
        <button onClick={() => onConfirm(val.trim() || defaultValue)} style={iconBtn}>✓</button>
        <button onClick={onCancel} style={iconBtn}>✕</button>
      </>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: `0.35rem 0.75rem 0.35rem ${0.75 + indent * 1.1}rem` }}>
      <input autoFocus value={val} placeholder={placeholder} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onConfirm(val.trim() || defaultValue); if (e.key === "Escape") onCancel(); }}
        style={{ flex: 1, background: C.card2, border: `1px solid ${C.cyan}`, borderRadius: "5px", padding: "4px 8px", color: C.text, fontSize: "0.74rem", outline: "none" }} />
      <button onClick={() => onConfirm(val.trim() || defaultValue)} style={iconBtn}>✓</button>
      <button onClick={onCancel} style={iconBtn}>✕</button>
    </div>
  );
}

const iconBtn = { background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "0.72rem", padding: "2px 3px", borderRadius: "3px" };

/* ── Scan file detail panel ──────────────────────────────────────── */
function ScanDetail({ file, cityId, resume, retryFailed }) {
  const navigate = useNavigate();
  const agg = useMemo(() => file?.wardCounts?.length ? aggregateWards(file.wardCounts) : null, [file]);
  if (!file) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: "0.85rem", gap: "0.5rem" }}>
      <span style={{ fontSize: "2rem" }}>📄</span>
      Chọn file quét để xem chi tiết
    </div>
  );

  const badge = STATUS_BADGE[file.status] || STATUS_BADGE.idle;
  const failedCount = (file.wardCounts || []).filter(w => w.error).length;
  const completedCount = (file.wardCounts || []).filter(w => !w.error).length;
  const canResume = (file.status === "resumable" || file.status === "running") && completedCount < (file.wardCounts?.length || 0) + 1;
  const isUnfinished = file.status === "resumable" || (file.wardCounts?.length > 0 && file.wardCounts.length < 168);

  return (
    <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: C.text }}>{file.name}</div>
          <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: "0.15rem" }}>
            Tạo: {new Date(file.createdAt).toLocaleString("vi-VN")}
            {file.savedAt !== file.createdAt ? ` · Lưu: ${new Date(file.savedAt).toLocaleString("vi-VN")}` : ""}
          </div>
        </div>
        <span style={{ fontSize: "0.65rem", padding: "3px 9px", borderRadius: "100px", border: `1px solid ${badge.color}44`, color: badge.color, background: `${badge.color}14` }}>{badge.label}</span>
      </div>

      {/* KPI row */}
      {agg && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.6rem", marginBottom: "1.25rem" }}>
          {[
            { icon: "📍", label: "Địa điểm",         val: fmt(agg.poiCount || 0),                               color: C.amber },
            { icon: "📹", label: "Camera (ước tính)", val: fmt(agg.camCount || 0),                               color: C.cyan },
            { icon: "✅", label: "Phường hoàn tất",   val: `${agg.completed}/${file.wardCounts?.length || 0}`,   color: C.green },
          ].map(({ icon, label, val, color }) => (
            <div key={label} style={{ background: C.card, border: `1px solid ${color}33`, borderRadius: "9px", padding: "0.75rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.1rem" }}>{icon}</span>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 800, color }}>{val}</div>
                <div style={{ fontSize: "0.62rem", color: C.muted }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ward progress bar */}
      {file.wardCounts?.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: C.muted, marginBottom: "0.3rem" }}>
            <span>{completedCount} phường hoàn tất · {failedCount > 0 ? `${failedCount} lỗi` : "0 lỗi"}</span>
            <span>{file.wardCounts.length}/168</span>
          </div>
          <div style={{ height: "6px", background: C.border, borderRadius: 100, overflow: "hidden", display: "flex" }}>
            <div style={{ flex: completedCount, background: C.green, transition: "flex 0.4s" }} />
            <div style={{ flex: failedCount, background: C.red, opacity: 0.7, transition: "flex 0.4s" }} />
            <div style={{ flex: Math.max(168 - completedCount - failedCount, 0) }} />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {(agg?.completed > 0 || file.wardCounts?.length > 0) && (
          <button onClick={() => {
            sessionStorage.setItem("city-report-scan", file.id);
            sessionStorage.setItem("city-report-city", cityId || "hcm");
            navigate("/city/report");
          }} style={{
            background: `linear-gradient(135deg,${C.cyan},${C.violet})`, border: "none",
            borderRadius: "8px", padding: "0.65rem", width: "100%",
            color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
          }}>📊 Xem thống kê & bản đồ</button>
        )}
        {(file.wardCounts?.length > 0) && (
          <button onClick={() => exportScanFileJSON(file)} style={{
            background: `${C.amber}14`, border: `1px solid ${C.amber}44`, borderRadius: "8px",
            padding: "0.55rem", color: C.amber, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          }}>⬇ Export JSON (chuyển máy)</button>
        )}

        {isUnfinished && resume && (
          <button onClick={() => resume(file.id)} style={{
            background: `${C.green}18`, border: `1px solid ${C.green}44`, borderRadius: "8px",
            padding: "0.55rem", color: C.green, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          }}>▶ Tiếp tục quét ({168 - completedCount - failedCount} phường còn lại)</button>
        )}
        {failedCount > 0 && retryFailed && (
          <button onClick={() => retryFailed(file.id)} style={{
            background: `${C.amber}18`, border: `1px solid ${C.amber}44`, borderRadius: "8px",
            padding: "0.55rem", color: C.amber, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          }}>🔁 Retry lỗi ({failedCount} phường)</button>
        )}

        {!agg && !file.wardCounts?.length && (
          <div style={{ fontSize: "0.78rem", color: C.muted, textAlign: "center", padding: "1rem" }}>
            File mới — chưa có dữ liệu quét.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sidebar scan controls ───────────────────────────────────────── */
function SidebarControls({ isRunning, onNewScan, onStop, onImport }) {
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {isRunning ? (
        <button onClick={onStop} style={{
          background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: "7px",
          padding: "0.55rem", color: C.red, fontWeight: 700, fontSize: "0.8rem",
          cursor: "pointer", width: "100%",
        }}>⏹ Dừng quét</button>
      ) : (
        <>
          <button onClick={onNewScan} style={{
            background: `linear-gradient(135deg,${C.green},${C.cyan})`, border: "none",
            borderRadius: "7px", padding: "0.55rem", color: "#fff", fontWeight: 700,
            fontSize: "0.8rem", cursor: "pointer", width: "100%",
          }}>+ Quét mới</button>
          <button onClick={onImport} style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: "7px",
            padding: "0.45rem", color: C.dim, fontSize: "0.75rem", cursor: "pointer", width: "100%",
          }}>⬆ Import từ máy khác</button>
        </>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function CityScans({ defaultCityId }) {
  const navigate   = useNavigate();
  const [city, setCity]             = useState(null);
  const [cities, setCities]         = useState([]);
  const cityId = city?.id || defaultCityId || "hcm";
  const [selectedFile, setSelectedFile] = useState(null);
  const [showNewScanModal, setShowNewScanModal] = useState(false);
  const [showImportModal, setShowImportModal]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const runSinceRef = useRef(0);

  const {
    scanFiles, folders, status, scanMode, progress, activeScanId,
    setActiveCity, startFresh, resume, retryFailed, stopScan,
    createFolder, renameFolder, deleteFolder,
    renameScanFile, moveScanFileToFolder, deleteScanFile,
  } = useScanFileStore();

  useEffect(() => {
    async function init() {
      await seedBuiltInCities();
      const allCities = await getCities();
      setCities(allCities);
      const c = allCities.find(x => x.id === (defaultCityId || "hcm")) || allCities[0];
      if (c) { setCity(c); await setActiveCity(c); }
    }
    init();
  }, []);

  // Keep selectedFile in sync with store updates
  useEffect(() => {
    if (selectedFile) {
      const updated = scanFiles.find(f => f.id === selectedFile.id);
      if (updated) setSelectedFile(updated);
    }
  }, [scanFiles]);

  // Auto-select the active scan file when scan stops
  const prevIsRunning = useRef(false);
  const isRunning = status === "running" && !!activeScanId;
  useEffect(() => {
    if (prevIsRunning.current && !isRunning && activeScanId) {
      const f = scanFiles.find(sf => sf.id === activeScanId);
      if (f) setSelectedFile(f);
    }
    prevIsRunning.current = isRunning;
  }, [isRunning, activeScanId, scanFiles]);

  if (!city) return (
    <AppLayout featureName="Đang tải...">
      <div style={{ padding: "2rem", color: C.muted }}>Đang tải thành phố...</div>
    </AppLayout>
  );

  async function handleAddCity(name, geojsonData, wardCount) {
    const newCity = {
      id: `city_${Date.now()}`,
      name,
      geojsonPath: null,
      geojsonData,
      wardCount,
    };
    await addCity(newCity);
    const allCities = await getCities();
    setCities(allCities);
    return newCity;
  }

  async function handleNewScan(selectedCity, name, config) {
    setShowNewScanModal(false);
    runSinceRef.current = 0;
    if (selectedCity.id !== city?.id) {
      setCity(selectedCity);
      await setActiveCity(selectedCity);
    }
    await startFresh(name, config);
  }

  function handleResume(id) {
    const f = scanFiles.find(sf => sf.id === id);
    runSinceRef.current = f?.wardCounts?.length || 0;
    resume(id);
  }

  function handleRetryFailed(id) {
    const f = scanFiles.find(sf => sf.id === id);
    runSinceRef.current = f?.wardCounts?.length || 0;
    retryFailed(id);
  }

  return (
    <AppLayout
      featureName={city.name}
      backButton={<BackBtn onClick={() => navigate("/")}>← Trang chủ</BackBtn>}
    >
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left sidebar: file tree + action bar ─────────────────── */}
        {sidebarOpen && (
        <div style={{
          width: "260px", flexShrink: 0, borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", overflow: "hidden", background: "#080f1e",
          position: "relative",
        }}>
          {/* Collapse button */}
          <button onClick={() => setSidebarOpen(false)} title="Ẩn sidebar" style={{
            position: "absolute", top: "0.5rem", right: "0.4rem", zIndex: 10,
            background: "none", border: "none", color: C.muted, cursor: "pointer",
            fontSize: "0.85rem", lineHeight: 1, padding: "2px 4px",
          }}>‹</button>
          <FileTree
            scanFiles={scanFiles}
            folders={folders}
            activeScanId={selectedFile?.id}
            onSelect={f => { if (!isRunning) setSelectedFile(f); }}
            onRename={renameScanFile}
            onMove={moveScanFileToFolder}
            onDelete={async (id) => { await deleteScanFile(id); if (selectedFile?.id === id) setSelectedFile(null); }}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
          />
          <SidebarControls
            isRunning={isRunning}
            onNewScan={() => setShowNewScanModal(true)}
            onStop={stopScan}
            onImport={() => setShowImportModal(true)}
          />
        </div>
        )}

        {/* Show sidebar button when collapsed */}
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} title="Hiện sidebar" style={{
            width: "22px", flexShrink: 0, background: "#080f1e",
            borderRight: `1px solid ${C.border}`, border: "none",
            cursor: "pointer", color: C.muted, fontSize: "0.85rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>›</button>
        )}

        {/* ── Right: scan progress or file detail ──────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {isRunning ? (
            <ScanProgress
              progress={progress}
              scanMode={scanMode}
              wardResults={scanFiles.find(f => f.id === activeScanId)?.wardCounts || []}
              onStop={stopScan}
              runSince={runSinceRef.current}
            />
          ) : (
            <ScanDetail
              file={selectedFile}
              cityId={cityId}
              resume={handleResume}
              retryFailed={handleRetryFailed}
            />
          )}
        </div>

      </div>

      {showNewScanModal && cities.length > 0 && (
        <NewScanModal
          cities={cities}
          onAddCity={handleAddCity}
          onConfirm={handleNewScan}
          onCancel={() => setShowNewScanModal(false)}
        />
      )}

      {showImportModal && (
        <ImportScanModal
          cityId={cityId}
          onImported={async (scanId) => {
            setShowImportModal(false);
            await useScanFileStore.getState().loadScanFiles();
            const sf = useScanFileStore.getState().scanFiles.find(f => f.id === scanId);
            if (sf) setSelectedFile(sf);
          }}
          onCancel={() => setShowImportModal(false)}
        />
      )}
    </AppLayout>
  );
}
