import React, { useEffect, useRef, useState } from "react";
import useScanStore from "../../store/scanStore.js";
import { opfsAvailable } from "../../utils/opfs.js";

const C = {
  bg:       "#0f172a",
  bg2:      "#1e293b",
  bg3:      "#172033",
  border:   "#1e3354",
  text:     "#e2e8f0",
  dim:      "#94a3b8",
  muted:    "#475569",
  green:    "#34d399",
  orange:   "#fb923c",
  red:      "#f87171",
  cyan:     "#38BDF8",
  violet:   "#A78BFA",
};

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

/* ─── Inline rename input ──────────────────────────────────────────────── */
function RenameInput({ initialValue, onConfirm, onCancel }) {
  const [val, setVal] = useState(initialValue);
  const ref = useRef(null);
  useEffect(() => ref.current?.select(), []);
  return (
    <input
      ref={ref}
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Enter")  { e.preventDefault(); onConfirm(val.trim() || initialValue); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
      onBlur={() => onConfirm(val.trim() || initialValue)}
      style={{
        background: C.bg, border: `1px solid ${C.cyan}`, borderRadius: "4px",
        color: C.text, fontSize: "0.78rem", padding: "2px 6px",
        width: "100%", outline: "none",
      }}
    />
  );
}

/* ─── Single session row ────────────────────────────────────────────────── */
function SessionRow({ session, active, onOpen, onExport, onDelete, onRename }) {
  const [renaming, setRenaming] = useState(false);
  const [hovering, setHovering] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        padding: "0.55rem 0.7rem",
        background: active ? `${C.green}12` : hovering ? `${C.bg2}` : "transparent",
        border: `1px solid ${active ? C.green + "44" : "transparent"}`,
        borderRadius: "6px", marginBottom: "4px",
        cursor: "pointer", transition: "background 0.1s",
      }}
    >
      {/* Name row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "2px" }}>
        {active && <span style={{ color: C.green, fontSize: "0.6rem" }}>●</span>}
        {renaming ? (
          <RenameInput
            initialValue={session.displayName}
            onConfirm={name => { setRenaming(false); onRename(name); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span
            onClick={onOpen}
            style={{
              flex: 1, fontSize: "0.8rem", fontWeight: active ? 700 : 400,
              color: active ? C.green : C.text,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
            title={session.displayName}
          >{session.displayName}</span>
        )}
      </div>

      {/* Meta + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <span style={{ fontSize: "0.65rem", color: C.muted, flex: 1 }}>
          {formatDate(session.savedAt)}
          {session.pointCount > 0 && ` · ${session.pointCount} điểm`}
          {session.cameraCount > 0 && ` · ${session.cameraCount} cam`}
        </span>

        {/* Action buttons — shown on hover or always when active */}
        {(hovering || active) && !renaming && (
          <div style={{ display: "flex", gap: "2px" }}>
            <IconBtn title="Đổi tên" color={C.cyan}   onClick={() => setRenaming(true)}>✏</IconBtn>
            <IconBtn title="Xuất file" color={C.orange} onClick={onExport}>↓</IconBtn>
            <IconBtn title="Xoá" color={C.red}         onClick={onDelete}>✕</IconBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({ children, color, title, onClick }) {
  const [h, setH] = useState(false);
  return (
    <button
      title={title}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: h ? `${color}22` : "none",
        border: `1px solid ${h ? color : "transparent"}`,
        borderRadius: "4px", color: h ? color : C.muted,
        fontSize: "0.7rem", padding: "1px 5px", cursor: "pointer",
        lineHeight: 1.4, transition: "all 0.1s",
      }}
    >{children}</button>
  );
}

/* ─── Save name prompt modal ────────────────────────────────────────────── */
function SavePrompt({ defaultName, onSave, onCancel }) {
  const [name, setName] = useState(defaultName);
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
    }}>
      <div style={{
        background: C.bg2, border: `1px solid ${C.border}`, borderRadius: "8px",
        padding: "1.25rem", width: "260px",
      }}>
        <div style={{ fontSize: "0.8rem", color: C.text, marginBottom: "0.75rem", fontWeight: 600 }}>
          Đặt tên cho phiên làm việc
        </div>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onSave(name); if (e.key === "Escape") onCancel(); }}
          style={{
            width: "100%", background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: "4px", color: C.text, fontSize: "0.8rem",
            padding: "6px 8px", outline: "none", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={btnStyle(C.muted, false)}>Huỷ</button>
          <button onClick={() => onSave(name.trim() || defaultName)} style={btnStyle(C.green, true)}>Lưu</button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(color, filled) {
  return {
    fontSize: "0.75rem", padding: "4px 12px", borderRadius: "5px", cursor: "pointer",
    background: filled ? `${color}22` : "none",
    border: `1px solid ${filled ? color : C.border}`,
    color: filled ? color : C.muted,
    fontWeight: filled ? 600 : 400,
  };
}

/* ─── Main drawer ───────────────────────────────────────────────────────── */
export default function SessionsDrawer({ open, onClose }) {
  const {
    sessions, sessionsLoading, sessionFilename, sessionDisplayName,
    points, loading, progress, error,
    refreshSessions, saveToSystem, loadFromSystem,
    deleteFromSystem, renameInSystem, exportFromSystem,
    loadExternalFile,
  } = useScanStore();

  const fileInputRef = useRef(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // filename to confirm

  useEffect(() => { if (open) refreshSessions(); }, [open]);

  const handleSave = () => {
    if (sessionFilename) {
      // Overwrite current session without prompting
      saveToSystem(sessionDisplayName);
    } else {
      setShowSavePrompt(true);
    }
  };

  const handleSaveConfirm = (name) => {
    setShowSavePrompt(false);
    saveToSystem(name);
  };

  const handleLoadExternal = (e) => {
    const file = e.target.files?.[0];
    if (file) { loadExternalFile(file); onClose(); }
    e.target.value = "";
  };

  const handleDelete = (filename) => {
    setConfirmDelete(filename);
  };

  const handleDeleteConfirm = () => {
    if (confirmDelete) deleteFromSystem(confirmDelete);
    setConfirmDelete(null);
  };

  if (!open) return null;

  const hasData = points.length > 0;
  const isOpfs  = opfsAvailable();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }}
      />

      {/* Drawer panel */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "320px", maxWidth: "90vw",
        background: C.bg, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        height: "100%", overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          padding: "0.9rem 1rem 0.7rem",
          background: C.bg2, borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "0.7rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: C.text, flex: 1 }}>
              🗂 Phiên làm việc
            </span>
            <button onClick={onClose} style={{
              background: "none", border: "none", color: C.muted,
              fontSize: "1rem", cursor: "pointer", lineHeight: 1,
            }}>✕</button>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              onClick={handleSave}
              disabled={!hasData || loading}
              title={sessionFilename ? `Lưu đè vào "${sessionDisplayName}"` : "Lưu phiên hiện tại vào hệ thống"}
              style={{
                ...btnStyle(C.green, true),
                flex: 1, opacity: hasData ? 1 : 0.4,
              }}
            >
              💾 {sessionFilename ? "Lưu" : "Lưu vào hệ thống"}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Tải file từ máy tính (ngoài thư mục hệ thống)"
              style={{ ...btnStyle(C.orange, false), whiteSpace: "nowrap" }}
            >📂 Tải file ngoài</button>
          </div>
          <input
            ref={fileInputRef} type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={handleLoadExternal}
          />

          {/* Status messages */}
          {error && (
            <div style={{
              marginTop: "0.5rem", padding: "5px 9px",
              background: `${C.red}12`, border: `1px solid ${C.red}40`,
              borderRadius: "4px", fontSize: "0.7rem", color: C.red,
              lineHeight: 1.4,
            }}>⚠ {error}</div>
          )}
          {!error && progress && (
            <div style={{
              marginTop: "0.5rem", padding: "5px 9px",
              background: `${C.cyan}10`, border: `1px solid ${C.cyan}30`,
              borderRadius: "4px", fontSize: "0.7rem", color: C.cyan,
            }}>{progress}</div>
          )}

          {/* Current session label */}
          {sessionDisplayName && (
            <div style={{
              marginTop: "0.5rem", padding: "4px 8px",
              background: `${C.green}10`, border: `1px solid ${C.green}30`,
              borderRadius: "4px", fontSize: "0.7rem", color: C.green,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {sessionFilename ? "● Đang mở: " : "○ Chưa lưu — "}
              <strong>{sessionDisplayName}</strong>
            </div>
          )}
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.6rem" }}>
          {!isOpfs && (
            <div style={{
              padding: "0.7rem", fontSize: "0.75rem", color: C.orange,
              background: `${C.orange}10`, border: `1px solid ${C.orange}30`,
              borderRadius: "6px", marginBottom: "0.5rem",
            }}>
              Trình duyệt này không hỗ trợ OPFS. Dùng Chrome hoặc Edge để lưu tập trung.
            </div>
          )}

          {sessionsLoading && (
            <div style={{ textAlign: "center", color: C.muted, fontSize: "0.75rem", padding: "1rem" }}>
              Đang tải...
            </div>
          )}

          {!sessionsLoading && sessions.length === 0 && (
            <div style={{
              textAlign: "center", color: C.muted, fontSize: "0.75rem",
              padding: "2rem 1rem", lineHeight: 1.7,
            }}>
              Chưa có phiên nào được lưu.<br />
              Quét một khu vực rồi nhấn <strong style={{ color: C.green }}>Lưu vào hệ thống</strong>.
            </div>
          )}

          {sessions.map(s => (
            <SessionRow
              key={s.filename}
              session={s}
              active={s.filename === sessionFilename}
              onOpen={() => { loadFromSystem(s.filename); onClose(); }}
              onExport={() => exportFromSystem(s.filename)}
              onDelete={() => handleDelete(s.filename)}
              onRename={name => renameInSystem(s.filename, name)}
            />
          ))}
        </div>

        {/* Relative-positioned overlays */}
        {showSavePrompt && (
          <SavePrompt
            defaultName={sessionDisplayName || `Phiên ${new Date().toLocaleString("vi-VN")}`}
            onSave={handleSaveConfirm}
            onCancel={() => setShowSavePrompt(false)}
          />
        )}

        {confirmDelete && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
          }}>
            <div style={{
              background: C.bg2, border: `1px solid ${C.border}`, borderRadius: "8px",
              padding: "1.25rem", width: "240px",
            }}>
              <div style={{ fontSize: "0.8rem", color: C.text, marginBottom: "0.75rem" }}>
                Xoá phiên này?
              </div>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button onClick={() => setConfirmDelete(null)} style={btnStyle(C.muted, false)}>Huỷ</button>
                <button onClick={handleDeleteConfirm} style={btnStyle(C.red, true)}>Xoá</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
