import React, { useEffect, useRef } from "react";

const C = {
  bg: "#0d1829", border: "#1e3354",
  text: "#e2e8f0", muted: "#94a3b8",
  red: "#F87171", redBg: "#F8717122", redBorder: "#F8717155",
  cyan: "#38BDF8",
};

/**
 * Modal confirm dialog.
 * Props: title, message, onConfirm, onCancel, confirmLabel (default "Xóa"), danger (default true)
 */
export default function ConfirmDialog({ title = "Xác nhận", message, confirmLabel = "Xóa", danger = true, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  // Focus cancel button on open, close on Escape
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    /* Backdrop */
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Dialog box — stop click from closing */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: "10px", boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
          width: "100%", maxWidth: "320px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "1rem 1.1rem 0.6rem",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <span style={{ fontSize: "1.1rem" }}>{danger ? "🗑️" : "❓"}</span>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: C.text }}>{title}</span>
        </div>

        {/* Body */}
        <div style={{ padding: "0.85rem 1.1rem", fontSize: "0.82rem", color: C.muted, lineHeight: 1.6 }}>
          {message}
        </div>

        {/* Actions */}
        <div style={{
          display: "flex", gap: "0.5rem", justifyContent: "flex-end",
          padding: "0.6rem 1.1rem 0.9rem",
        }}>
          <button
            ref={cancelRef}
            onClick={onCancel}
            style={{
              padding: "0.4rem 1rem", borderRadius: "6px", cursor: "pointer",
              background: "none", border: `1px solid ${C.border}`,
              color: C.muted, fontSize: "0.8rem",
            }}
          >Hủy</button>
          <button
            onClick={onConfirm}
            style={{
              padding: "0.4rem 1rem", borderRadius: "6px", cursor: "pointer",
              background: danger ? C.redBg : `${C.cyan}18`,
              border: `1px solid ${danger ? C.redBorder : C.cyan + "55"}`,
              color: danger ? C.red : C.cyan,
              fontSize: "0.8rem", fontWeight: 600,
            }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
