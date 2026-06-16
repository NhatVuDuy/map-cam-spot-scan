import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout, { NavBtn, BackBtn } from "../../components/layout/AppLayout.jsx";
import ScanProgress from "../../components/city/ScanProgress.jsx";
import { getCity, seedBuiltInCities } from "../../utils/cityDB.js";
import useScanFileStore from "../../store/scanFileStore.js";
import { aggregateWards } from "../../services/cityBatchScan.js";

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

/* ── File tree ───────────────────────────────────────────────────── */
function FileTree({ scanFiles, folders, activeScanId, onSelect, onRename, onMove, onDelete, onCreateFolder, onRenameFolder, onDeleteFolder }) {
  const [editingFile, setEditingFile]   = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

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

  function FileRow({ file, indent = 0 }) {
    const badge = STATUS_BADGE[file.status] || STATUS_BADGE.idle;
    const isActive = file.id === activeScanId;
    const agg = file.wardCounts?.length ? aggregateWards(file.wardCounts) : null;

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
      <div
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
            {agg ? ` · ${fmt(agg.camCount)} cam` : ""}
          </div>
        </div>
        <span style={{ fontSize: "0.58rem", padding: "2px 6px", borderRadius: "100px", border: `1px solid ${badge.color}44`, color: badge.color, background: `${badge.color}14`, whiteSpace: "nowrap" }}>
          {badge.label}
        </span>
        {/* Context menu */}
        <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: "2px" }}>
          <button onClick={() => setEditingFile(file.id)} title="Đổi tên" style={iconBtn}> ✏️</button>
          <button onClick={() => onDelete(file.id)} title="Xóa" style={iconBtn}>🗑</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.35rem 0.75rem", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>File quét</span>
        <button onClick={() => setNewFolderMode(true)} title="Thêm thư mục" style={{ ...iconBtn, fontSize: "0.65rem" }}>📁+</button>
      </div>

      {/* New folder input */}
      {newFolderMode && (
        <RenameInput
          defaultValue="Thư mục mới"
          placeholder="Tên thư mục"
          onConfirm={name => { onCreateFolder(name); setNewFolderMode(false); }}
          onCancel={() => setNewFolderMode(false)}
          indent={0}
        />
      )}

      {/* Ungrouped files */}
      {ungrouped.map(f => <FileRow key={f.id} file={f} />)}

      {/* Folders */}
      {folders.map(folder => (
        <div key={folder.id} style={{ marginBottom: "4px" }}>
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
                <button onClick={() => onDeleteFolder(folder.id)} style={iconBtn}>🗑</button>
              </>
            )}
          </div>
          {(byFolder[folder.id] || []).map(f => (
            <FileRow key={f.id} file={f} indent={1} />
          ))}
        </div>
      ))}

      {scanFiles.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem 1rem", fontSize: "0.78rem", color: C.muted }}>
          Chưa có file quét nào.<br />Bấm "Quét mới" để bắt đầu.
        </div>
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
function ScanDetail({ file, onViewMap, cityId }) {
  const navigate = useNavigate();
  const agg = useMemo(() => file?.wardCounts?.length ? aggregateWards(file.wardCounts) : null, [file]);
  if (!file) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: "0.85rem" }}>
      Chọn file quét để xem chi tiết
    </div>
  );

  const badge = STATUS_BADGE[file.status] || STATUS_BADGE.idle;
  const failedCount = (file.wardCounts || []).filter(w => w.error).length;

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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0.6rem", marginBottom: "1.25rem" }}>
          {[
            { icon: "📹", label: "Camera",      val: fmt(agg.camCount),                  color: C.cyan },
            { icon: "🔀", label: "Giao lộ",      val: fmt(agg.byCat.intersection || 0),  color: C.amber },
            { icon: "🛣️", label: "Đường (km)",   val: fmt(agg.roadKm),                    color: C.violet },
            { icon: "✅", label: "Phường hoàn tất", val: `${agg.completed}/${file.wardCounts?.length || 0}`, color: C.green },
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

      {failedCount > 0 && (
        <div style={{ marginBottom: "1rem", padding: "0.55rem 0.9rem", background: `${C.amber}0d`, border: `1px solid ${C.amber}33`, borderRadius: "7px", fontSize: "0.74rem", color: C.amber }}>
          ⚠️ {failedCount} phường lỗi — có thể quét lại từ danh sách
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button onClick={() => navigate(`/city/${cityId}/scan/${file.id}`)} style={{
          background: `linear-gradient(135deg,${C.cyan},${C.violet})`, border: "none",
          borderRadius: "8px", padding: "0.6rem", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
        }}>📊 Xem thống kê & bản đồ</button>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function CityScans() {
  const { cityId } = useParams();
  const navigate   = useNavigate();
  const [city, setCity]           = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const {
    scanFiles, folders, loadingScanFiles, status, scanMode, progress, activeScanId,
    setActiveCity, loadScanFiles,
    startFresh, resume, retryFailed, stopScan,
    createFolder, renameFolder, deleteFolder,
    renameScanFile, moveScanFileToFolder, deleteScanFile,
  } = useScanFileStore();

  useEffect(() => {
    async function init() {
      await seedBuiltInCities();
      const c = await getCity(cityId);
      setCity(c);
      if (c) await setActiveCity(c);
    }
    init();
  }, [cityId]);

  // Keep selectedFile in sync when scanFiles update
  useEffect(() => {
    if (selectedFile) {
      const updated = scanFiles.find(f => f.id === selectedFile.id);
      if (updated) setSelectedFile(updated);
    }
  }, [scanFiles]);

  if (!city) return (
    <AppLayout featureName="Đang tải...">
      <div style={{ padding: "2rem", color: C.muted }}>Đang tải thành phố...</div>
    </AppLayout>
  );

  const isRunning = status === "running" && activeScanId;

  const selectedResumable = selectedFile && (selectedFile.status === "resumable" || selectedFile.status === "error");
  const selectedFailed    = selectedFile?.wardCounts?.filter(w => w.error).length > 0;

  return (
    <AppLayout
      featureName={city.name}
      backButton={<BackBtn onClick={() => navigate("/city")}>← Thành phố</BackBtn>}
      navButtons={
        <>
          {!isRunning && (
            <NavBtn color={C.green} onClick={startFresh}>+ Quét mới</NavBtn>
          )}
          {isRunning && (
            <NavBtn color={C.red} onClick={stopScan}>⏹ Dừng</NavBtn>
          )}
          <NavBtn color={C.cyan} onClick={() => navigate("/scan")}>🔍 Quét vùng</NavBtn>
        </>
      }
      style={{ height: "100vh", overflow: "hidden" }}
    >
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left: file tree ──────────────────────────────────────── */}
        <div style={{
          width: "260px", flexShrink: 0, borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", overflow: "hidden", background: "#080f1e",
        }}>
          <FileTree
            scanFiles={scanFiles}
            folders={folders}
            activeScanId={selectedFile?.id}
            onSelect={setSelectedFile}
            onRename={renameScanFile}
            onMove={moveScanFileToFolder}
            onDelete={async (id) => { await deleteScanFile(id); if (selectedFile?.id === id) setSelectedFile(null); }}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
          />
        </div>

        {/* ── Right: detail / progress ─────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {isRunning ? (
            <ScanProgress
              progress={progress}
              scanMode={scanMode}
              wardResults={scanFiles.find(f => f.id === activeScanId)?.wardCounts || []}
              onStop={stopScan}
            />
          ) : (
            <>
              {/* Resume/retry bar for selected file */}
              {selectedResumable && (
                <div style={{
                  padding: "0.55rem 1rem", background: `${C.amber}0d`, borderBottom: `1px solid ${C.amber}33`,
                  display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.78rem",
                }}>
                  <span style={{ color: C.amber, fontWeight: 600 }}>⚠️ File này chưa hoàn tất</span>
                  <button onClick={() => resume(selectedFile.id)} style={{ background: `${C.green}18`, border: `1px solid ${C.green}44`, borderRadius: "5px", padding: "3px 10px", color: C.green, fontWeight: 700, cursor: "pointer", fontSize: "0.74rem" }}>▶ Tiếp tục</button>
                  {selectedFailed && (
                    <button onClick={() => retryFailed(selectedFile.id)} style={{ background: `${C.amber}18`, border: `1px solid ${C.amber}44`, borderRadius: "5px", padding: "3px 10px", color: C.amber, fontWeight: 700, cursor: "pointer", fontSize: "0.74rem" }}>🔁 Retry lỗi</button>
                  )}
                </div>
              )}
              <ScanDetail file={selectedFile} cityId={cityId} />
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
