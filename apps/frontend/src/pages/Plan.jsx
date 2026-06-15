import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useScanStore from "../store/scanStore.js";
import {
  batchScanCity, aggregateWards,
  loadCityScanCache, saveCityScanCache, clearCityScanCache,
  exportJSON, exportCSV,
} from "../services/cityBatchScan.js";

/* ─── palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg:     "#060d1a", bg2: "#0b1425", bg3: "#0d1829",
  card:   "#0d1829", card2: "#0f1f35",
  border: "#1a2e4a", border2: "#1e3a56",
  cyan:   "#38BDF8", violet: "#A78BFA", green: "#34D399",
  amber:  "#FBBF24", pink:   "#F472B6", red:   "#F87171",
  orange: "#FB923C", lime:   "#86efac", gold:  "#fcd34d",
  text:   "#e2e8f0", muted:  "#64748b", dim:   "#94a3b8",
};

/* ─── city reference data ──────────────────────────────────────────────────── */
const LOC_CAM = { intersection: 4, school: 10, hospital: 30, market: 20, hotel: 8, park: 10, conference: 15, government: 12 };
const AREAS = { hcm: 2095, hcmNew: 6772 };
const PLAN = {
  total: 1_100_000,
  byLoc: { intersection: 200_000, road: 92_500, school: 50_000, hospital: 20_000, market: 50_000, industrial: 120_000, park: 30_000, transport: 80_000, ai: 100_000 },
};

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function fmt(n) { return Math.round(n).toLocaleString("vi-VN"); }
function fmtK(n) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : fmt(n); }

function Tag({ children, color = C.cyan }) {
  return (
    <span style={{
      display: "inline-block", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.1em",
      textTransform: "uppercase", padding: "3px 10px", borderRadius: "100px",
      border: `1px solid ${color}55`, background: `${color}18`, color,
    }}>{children}</span>
  );
}

function Counter({ to, duration = 1400 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const ran = useRef(false);
  useEffect(() => {
    ran.current = false; setVal(0);
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || ran.current) return;
      ran.current = true; obs.disconnect();
      let start = null;
      const step = ts => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val.toLocaleString("vi-VN")}</span>;
}

function Bar({ pct, color, height = 7, delay = 0 }) {
  const [w, setW] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    setW(0);
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; obs.disconnect();
      setTimeout(() => setW(Math.max(0, Math.min(100, pct))), delay);
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [pct, delay]);
  return (
    <div ref={ref} style={{ height, background: C.border, borderRadius: 100, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 100, transition: "width 1.1s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

function Donut({ slices, size = 130, label, sub }) {
  const r = size * 0.32, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.v, 0);
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={size * 0.135} />
      {slices.map((s, i) => {
        const len = (s.v / total) * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={size * 0.135}
            strokeDasharray={`${len - 1.5} ${circ - len + 1.5}`} strokeDashoffset={-off}
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
        );
        off += len; return el;
      })}
      {label && <>
        <text x={cx} y={cy - 4} textAnchor="middle" fill={C.text} fontSize={size * 0.13} fontWeight="900">{label}</text>
        {sub && <text x={cx} y={cy + 13} textAnchor="middle" fill={C.muted} fontSize={size * 0.075}>{sub}</text>}
      </>}
    </svg>
  );
}

function VBar({ bars, height = 150 }) {
  const max = Math.max(...bars.map(b => b.v), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height }}>
      {bars.map((b, i) => {
        const h = Math.max((b.v / max) * (height - 32), 4);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ fontSize: "0.56rem", color: C.dim, textAlign: "center" }}>{fmtK(b.v)}</div>
            <div style={{ width: "100%", height: h, background: b.color, borderRadius: "4px 4px 0 0", opacity: 0.88 }} />
            <div style={{ fontSize: "0.56rem", color: C.muted, textAlign: "center", lineHeight: 1.2 }}>{b.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── sample estimate hook (from single scan) ─────────────────────────────── */
function useEstimate() {
  const points  = useScanStore(s => s.points);
  const cameras = useScanStore(s => s.cameras);
  const area    = useScanStore(s => s.area);
  const roads   = useScanStore(s => s.roads);

  return useMemo(() => {
    const areaKm2 = Math.PI * (area.radiusM / 1000) ** 2;
    if (areaKm2 < 0.01 || cameras.length === 0) return null;

    const cam1     = cameras.filter(c => c.type === "cam1").length;
    const cam2     = cameras.filter(c => ["cam2","cam22"].includes(c.type)).length;
    const cam21    = cameras.filter(c => ["cam21","cam23"].includes(c.type)).length;
    const camAlley = cameras.filter(c => c.type === "cam_alley").length;
    const totalCam = cameras.length;

    const bycat = {};
    for (const p of points) bycat[p.category] = (bycat[p.category] || 0) + 1;

    const ixShapes = {};
    for (const p of points.filter(p => p.category === "intersection")) {
      const sh = p.intersectionShape || "minor";
      ixShapes[sh] = (ixShapes[sh] || 0) + 1;
    }

    let roadKm = 0;
    for (const r of roads) {
      const g = r.geometry;
      for (let i = 1; i < g.length; i++) {
        const dx = (g[i][0] - g[i-1][0]) * 111320 * Math.cos(g[i][1] * Math.PI / 180);
        const dy = (g[i][1] - g[i-1][1]) * 111320;
        roadKm += Math.sqrt(dx*dx + dy*dy) / 1000;
      }
    }

    const camPerKm2   = totalCam / areaKm2;
    const cam1PerRoadKm = cam1 / Math.max(roadKm, 0.1);
    const spacingM    = cam1PerRoadKm > 0 ? Math.round(1000 / cam1PerRoadKm) : 0;

    function scaleToArea(n, targetKm2) { return Math.round((n / areaKm2) * targetKm2); }
    function buildForArea(km2) {
      const catEst = {};
      for (const [k, v] of Object.entries(bycat)) catEst[k] = scaleToArea(v, km2);
      const camByCat = {};
      for (const [k, v] of Object.entries(catEst)) camByCat[k] = Math.round(v * (LOC_CAM[k] || 4));
      return {
        total:    Math.round(camPerKm2 * km2),
        cam1:     Math.round(cam1PerRoadKm * scaleToArea(roadKm, km2)),
        cam2:     scaleToArea(cam2, km2),
        cam21:    scaleToArea(cam21, km2),
        camAlley: scaleToArea(camAlley, km2),
        roadKm:   Math.round(scaleToArea(roadKm, km2)),
        bycat:    catEst,
        camByCat,
      };
    }

    return {
      sample: { areaKm2, totalCam, cam1, cam2, cam21, camAlley, roadKm, spacingM, camPerKm2, bycat, ixShapes },
      hcm:    buildForArea(AREAS.hcm),
      hcmNew: buildForArea(AREAS.hcmNew),
    };
  }, [points, cameras, area, roads]);
}

/* ─── batch scan hook ─────────────────────────────────────────────────────── */
function useBatchScan() {
  const [status, setStatus]         = useState("idle"); // idle|resumable|running|done|error
  const [scanMode, setScanMode]     = useState("full"); // full|resume|retry
  const [progress, setProgress]     = useState({ current: 0, total: 168, wardName: "", pct: 0 });
  const [wardResults, setWardResults] = useState(() => loadCityScanCache()?.wards || null);
  const [errorMsg, setErrorMsg]     = useState("");
  const abortRef = useRef(null);

  const aggregate = useMemo(() => wardResults ? aggregateWards(wardResults) : null, [wardResults]);

  // Restore status from cache on mount
  useEffect(() => {
    const cache = loadCityScanCache();
    if (!cache?.wards?.length) return;
    const failedCount = cache.wards.filter(w => w.error).length;
    const total = 168;
    if (cache.wards.length < total || failedCount > 0) {
      // Partial or has errors → resumable
      setStatus("resumable");
    } else {
      setStatus("done");
    }
  }, []);

  async function runScan({ mode, existing = [] }) {
    if (status === "running") return;
    setStatus("running");
    setScanMode(mode);
    setErrorMsg("");

    const controller = new AbortController();
    abortRef.current = controller;

    const onlyCodes = mode === "retry"
      ? existing.filter(w => w.error).map(w => w.code)
      : mode === "resume"
      ? undefined // batchScanCity auto-skips already-done wards
      : undefined;

    // For fresh start, clear cache
    if (mode === "full") {
      clearCityScanCache();
      setWardResults(null);
    }

    try {
      await batchScanCity({
        onlyCodes,
        existingResults: mode === "full" ? [] : existing,
        signal: controller.signal,
        onProgress: p => setProgress(p),
        onWardDone: (_ward, _i, all) => {
          setWardResults([...all]);
          saveCityScanCache({ wards: all, savedAt: Date.now() });
        },
      });

      if (!controller.signal.aborted) {
        setStatus("done");
      } else {
        // Stopped by user — check if there are remaining wards
        const cache = loadCityScanCache();
        const remaining = (cache?.wards?.length || 0) < 168
          || (cache?.wards || []).some(w => w.error);
        setStatus(remaining ? "resumable" : "done");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        const cache = loadCityScanCache();
        const hasPartial = cache?.wards?.length > 0;
        setStatus(hasPartial ? "resumable" : "idle");
      } else {
        setErrorMsg(err.message);
        setStatus("error");
      }
    }
  }

  const startFresh = useCallback(() => {
    runScan({ mode: "full", existing: [] });
  }, [status]);

  const resume = useCallback(() => {
    const cache = loadCityScanCache();
    runScan({ mode: "resume", existing: cache?.wards || [] });
  }, [status]);

  const retryFailed = useCallback(() => {
    const cache = loadCityScanCache();
    runScan({ mode: "retry", existing: cache?.wards || [] });
  }, [status]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    clearCityScanCache();
    setWardResults(null);
    setStatus("idle");
    setProgress({ current: 0, total: 168, wardName: "", pct: 0 });
    setErrorMsg("");
  }, []);

  return { status, scanMode, progress, wardResults, aggregate, errorMsg, startFresh, resume, retryFailed, stop, reset };
}

/* ─── city scan dashboard ─────────────────────────────────────────────────── */
const CAT_META = [
  { key: "intersection", icon: "🔀", label: "Giao lộ (ngã ba/tư/hẻm)", color: C.cyan,   planRef: PLAN.byLoc.intersection },
  { key: "school",       icon: "🏫", label: "Trường học, giáo dục",     color: C.violet, planRef: PLAN.byLoc.school },
  { key: "hospital",     icon: "🏥", label: "Bệnh viện, y tế",          color: C.green,  planRef: PLAN.byLoc.hospital },
  { key: "market",       icon: "🏪", label: "Chợ, TTTM",                color: C.amber,  planRef: PLAN.byLoc.market },
  { key: "park",         icon: "🌳", label: "Công viên, quảng trường",   color: C.lime,   planRef: PLAN.byLoc.park },
  { key: "hotel",        icon: "🏨", label: "Khách sạn, lưu trú",       color: C.pink,   planRef: null },
  { key: "conference",   icon: "🏢", label: "Hội nghị, trung tâm",      color: "#f9a8d4", planRef: null },
  { key: "government",   icon: "🏛️", label: "Cơ quan nhà nước",         color: C.gold,   planRef: null },
];

function CityDashboard({ agg, wardResults }) {
  const diff = agg.camCount - PLAN.total;
  const diffSign = diff > 0 ? "+" : "";
  const diffColor = Math.abs(diff) < 150_000 ? C.green : diff > 0 ? C.amber : C.red;

  const camTypeSlices = [
    { v: agg.cam1,     color: C.cyan,   label: "CAM1 · Đường dài" },
    { v: agg.cam2,     color: C.amber,  label: "CAM2 · Có đèn" },
    { v: agg.cam21,    color: C.orange, label: "CAM2.1 · Không đèn" },
    { v: agg.camAlley, color: C.green,  label: "Hẻm" },
  ].filter(s => s.v > 0);

  const totalCamTypes = agg.cam1 + agg.cam2 + agg.cam21 + agg.camAlley;

  // Top 10 wards by camera count
  const topWards = [...wardResults]
    .filter(w => !w.error)
    .sort((a, b) => b.camCount - a.camCount)
    .slice(0, 10);

  const maxWardCam = topWards[0]?.camCount || 1;

  return (
    <div>
      {/* ── STATUS HEADER ────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem",
        padding: "0.7rem 1rem", background: `${C.green}0d`, border: `1px solid ${C.green}33`, borderRadius: "10px",
      }}>
        <span style={{ fontSize: "1.1rem" }}>✅</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "0.85rem", color: C.green }}>Dữ liệu thực tế — Quét xong {agg.completed}/{wardResults.length} phường/xã TP.HCM</div>
          <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: "0.15rem" }}>
            {agg.errors > 0 ? `${agg.errors} phường lỗi (không tính vào kết quả)  ·  ` : ""}
            Tổng đường: {fmt(agg.roadKm)} km  ·  Nguồn: OpenStreetMap / Overpass API
          </div>
        </div>
        <Tag color={C.green}>DỮ LIỆU THỰC TẾ</Tag>
      </div>

      {/* ── ROW 1: KPI TILES ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.7rem", marginBottom: "1rem" }}>
        {[
          { icon: "📹", label: "Camera thực tế (OSM)", val: <Counter to={agg.camCount} />, sub: `Kế hoạch: ${fmt(PLAN.total)}`, color: C.cyan },
          { icon: "🔀", label: "Giao lộ tổng cộng",   val: fmt(agg.byCat.intersection || 0), sub: `${fmt((agg.byCat.intersection||0)*LOC_CAM.intersection)} cam giao lộ`, color: C.amber },
          { icon: "🛣️", label: "Tổng đường (km)",     val: `${fmt(agg.roadKm)} km`,           sub: `${((agg.roadKm / 2095) || 0).toFixed(1)} km/km²`,                   color: C.violet },
          { icon: "🏛️", label: "POI tổng cộng",       val: fmt(Object.values(agg.byCat).reduce((s,v)=>s+v,0)), sub: `${agg.completed} phường có dữ liệu`, color: C.green },
        ].map(({ icon, label, val, sub, color }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${color}33`, borderTop: `3px solid ${color}`, borderRadius: "10px", padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.95rem", marginBottom: "0.3rem" }}>{icon}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color, lineHeight: 1.1 }}>{val}</div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, color: C.text, margin: "0.2rem 0 0.12rem" }}>{label}</div>
            <div style={{ fontSize: "0.65rem", color: C.muted }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: TỔNG QUAN + DONUT ─────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr", gap: "0.7rem", marginBottom: "1rem" }}>

        {/* Main comparison */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>
            Camera thực tế vs Kế hoạch 1.1M — TP.HCM (168 phường/xã)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", marginBottom: "1rem" }}>
            {[
              { label: "Camera tính được",   val: agg.camCount, color: C.cyan,  display: null },
              { label: "Kế hoạch chính thức", val: PLAN.total,  color: C.amber, display: null },
              { label: "Chênh lệch",          val: null,        color: diffColor, display: `${diffSign}${fmt(diff)}` },
            ].map(({ label, val, color, display }) => (
              <div key={label} style={{ background: C.card2, border: `1px solid ${color}33`, borderRadius: "9px", padding: "0.85rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.45rem", fontWeight: 900, color, lineHeight: 1 }}>
                  {display ?? <Counter to={val} />}
                </div>
                <div style={{ fontSize: "0.65rem", color: C.muted, marginTop: "0.35rem" }}>{label}</div>
              </div>
            ))}
          </div>
          {/* Camera type bars */}
          {[
            { label: "CAM1 — Đường dài",       v: agg.cam1,     color: C.cyan },
            { label: "CAM2/2.2 — Giao lộ đèn", v: agg.cam2,     color: C.amber },
            { label: "CAM2.1/2.3 — Không đèn", v: agg.cam21,    color: C.orange },
            { label: "CAM_alley — Đầu hẻm",    v: agg.camAlley, color: C.green },
          ].filter(r => r.v > 0).map((r, i) => (
            <div key={i} style={{ marginBottom: "0.45rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "0.18rem" }}>
                <span style={{ color: C.dim }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.color }}>{fmt(r.v)}</span>
              </div>
              <Bar pct={Math.round((r.v / Math.max(agg.camCount, 1)) * 100)} color={r.color} height={5} delay={i * 100} />
            </div>
          ))}
        </div>

        {/* Donut */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.violet, textTransform: "uppercase", letterSpacing: "0.08em" }}>Loại Camera</div>
          <Donut size={140} slices={camTypeSlices}
            label={fmtK(agg.camCount)} sub="cameras" />
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {camTypeSlices.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.7rem" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                <span style={{ color: C.dim, flex: 1 }}>{s.label}</span>
                <span style={{ color: s.color, fontWeight: 700 }}>{totalCamTypes > 0 ? Math.round(s.v / totalCamTypes * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.1rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: "0.08em" }}>Thông số TP.HCM</div>
          {[
            { label: "Cam/km²",        val: (agg.camCount / 2095).toFixed(1), color: C.cyan },
            { label: "Đường/km²",      val: `${(agg.roadKm / 2095).toFixed(2)} km`, color: C.amber },
            { label: "% kế hoạch",     val: `${((agg.camCount / PLAN.total) * 100).toFixed(1)}%`, color: diffColor },
            { label: "Phường hoàn tất", val: `${agg.completed}/168`,           color: C.green },
            { label: "Trường học",     val: fmt(agg.byCat.school || 0),        color: C.violet },
            { label: "Bệnh viện",      val: fmt(agg.byCat.hospital || 0),      color: C.green },
            { label: "Chợ/TTTM",      val: fmt(agg.byCat.market || 0),        color: C.amber },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.border}44`, paddingBottom: "0.3rem" }}>
              <span style={{ fontSize: "0.7rem", color: C.muted }}>{label}</span>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, color }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ROW 3: BẢNG CHI TIẾT THEO LOẠI ──────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", marginBottom: "1rem", overflow: "hidden" }}>
        <div style={{ padding: "0.8rem 1.25rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>Chi tiết theo loại địa điểm — Dữ liệu thực tế OSM</span>
          <Tag color={C.cyan}>168 PHƯỜNG/XÃ</Tag>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg2 }}>
              {["Địa điểm", "POI thực tế", "Cam/node", "Camera tính được", "KH tham chiếu", "So sánh"].map((h, i) => (
                <th key={h} style={{ padding: "0.55rem 0.7rem", fontSize: "0.63rem", fontWeight: 700, color: C.dim, textAlign: i > 0 ? "right" : "left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAT_META.map((cat, i) => {
              const poiCount = agg.byCat[cat.key] || 0;
              const camEst   = Math.round(poiCount * (LOC_CAM[cat.key] || 4));
              const ratio    = cat.planRef ? (camEst / cat.planRef) : null;
              return (
                <tr key={cat.key} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "0.55rem 0.7rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "6px", height: "26px", background: cat.color, borderRadius: "3px", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.76rem", color: C.text }}>{cat.icon} {cat.label}</div>
                        <Bar pct={camEst > 0 ? Math.min(100, (camEst / Math.max(agg.camCount, 1)) * 100) : 0} color={cat.color} height={3} delay={i * 50} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.78rem", color: poiCount > 0 ? C.text : C.muted }}>{poiCount > 0 ? fmt(poiCount) : "—"}</td>
                  <td style={{ padding: "0.55rem 0.7rem", textAlign: "right" }}><Tag color={cat.color}>{LOC_CAM[cat.key] || 4}×</Tag></td>
                  <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.88rem", fontWeight: 900, color: cat.color }}>{camEst > 0 ? fmt(camEst) : "—"}</td>
                  <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.76rem", color: C.muted }}>{cat.planRef ? fmt(cat.planRef) : "—"}</td>
                  <td style={{ padding: "0.55rem 0.7rem", textAlign: "right" }}>
                    {ratio != null ? (
                      <span style={{ fontSize: "0.74rem", fontWeight: 700, color: ratio > 1.5 ? C.amber : ratio < 0.5 ? C.red : C.green }}>
                        {ratio > 1.5 ? "↑" : ratio < 0.5 ? "↓" : "≈"} {(ratio * 100).toFixed(0)}%
                      </span>
                    ) : <span style={{ color: C.muted, fontSize: "0.7rem" }}>N/A</span>}
                  </td>
                </tr>
              );
            })}
            {/* Road */}
            <tr style={{ borderBottom: `1px solid ${C.border}22` }}>
              <td style={{ padding: "0.55rem 0.7rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "6px", height: "26px", background: C.cyan, borderRadius: "3px" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.76rem", color: C.text }}>🛣️ Đường dài (CAM1)</div>
                    <Bar pct={Math.min(100, (agg.cam1 / Math.max(agg.camCount, 1)) * 100)} color={C.cyan} height={3} />
                  </div>
                </div>
              </td>
              <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.76rem", color: C.dim }}>{fmt(agg.roadKm)} km</td>
              <td style={{ padding: "0.55rem 0.7rem", textAlign: "right" }}><Tag color={C.cyan}>1/3km</Tag></td>
              <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.88rem", fontWeight: 900, color: C.cyan }}>{fmt(agg.cam1)}</td>
              <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.76rem", color: C.muted }}>{fmt(PLAN.byLoc.road)}</td>
              <td style={{ padding: "0.55rem 0.7rem", textAlign: "right" }}>
                <span style={{ fontSize: "0.74rem", fontWeight: 700, color: (agg.cam1 / PLAN.byLoc.road) > 1.5 ? C.amber : C.green }}>
                  {((agg.cam1 / PLAN.byLoc.road) * 100).toFixed(0)}%
                </span>
              </td>
            </tr>
            {/* Total */}
            <tr style={{ background: `${C.amber}0a` }}>
              <td style={{ padding: "0.75rem 0.7rem", fontWeight: 900, color: C.text, fontSize: "0.82rem" }}>TỔNG CAMERA</td>
              <td colSpan={2} />
              <td style={{ padding: "0.75rem 0.7rem", textAlign: "right", fontSize: "1.05rem", fontWeight: 900, color: C.amber }}>{fmt(agg.camCount)}</td>
              <td style={{ padding: "0.75rem 0.7rem", textAlign: "right", fontSize: "0.88rem", color: C.cyan, fontWeight: 700 }}>{fmt(PLAN.total)}</td>
              <td style={{ padding: "0.75rem 0.7rem", textAlign: "right", fontSize: "0.85rem", fontWeight: 800, color: diffColor }}>
                {diffSign}{fmt(diff)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── ROW 4: TOP PHƯỜNG + LỘ TRÌNH ────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.7rem", marginBottom: "1rem" }}>

        {/* Top wards */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.violet, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>
            Top 10 phường/xã nhiều camera nhất
          </div>
          {topWards.map((w, i) => (
            <div key={w.code} style={{ marginBottom: "0.45rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "0.12rem" }}>
                <span style={{ color: i < 3 ? C.amber : C.dim }}>{i + 1}. {w.name}</span>
                <span style={{ color: C.text, fontWeight: 700 }}>{fmt(w.camCount)} cam · {w.roadKm.toFixed(1)} km</span>
              </div>
              <Bar pct={(w.camCount / maxWardCam) * 100} color={i < 3 ? C.amber : C.violet} height={5} delay={i * 60} />
            </div>
          ))}
        </div>

        {/* Roadmap */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.1rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>Lộ trình kế hoạch 2026–2029</div>
          {[
            { year: "2026", count: 100_000,   pct: 9,   color: C.cyan,   note: "200–300m/cam · Xương sống đô thị" },
            { year: "2027", count: 300_000,   pct: 27,  color: C.violet, note: "150–200m/cam · Tuyến đường chính" },
            { year: "2028", count: 700_000,   pct: 64,  color: C.amber,  note: "75–100m/cam · Phủ mật độ cao" },
            { year: "2029", count: 1_100_000, pct: 100, color: C.green,  note: "50–100m/cam · Phủ đầy toàn diện" },
          ].map((y, i) => (
            <div key={y.year} style={{ marginBottom: "0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                <span style={{ fontWeight: 700, color: y.color }}>Năm {y.year}</span>
                <span style={{ color: C.text, fontWeight: 900 }}>{(y.count / 1000).toFixed(0)}K cam</span>
              </div>
              <Bar pct={y.pct} color={y.color} height={8} delay={i * 150} />
              <div style={{ fontSize: "0.62rem", color: C.muted, marginTop: "0.2rem" }}>{y.note}</div>
            </div>
          ))}
          <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.7rem", background: `${C.amber}0d`, border: `1px solid ${C.amber}22`, borderRadius: "7px" }}>
            <div style={{ fontSize: "0.65rem", color: C.amber, fontWeight: 700, marginBottom: "0.2rem" }}>Dữ liệu thực tế (OSM)</div>
            <div style={{ fontSize: "0.72rem", color: C.text, fontWeight: 700 }}>{fmt(agg.camCount)} camera được lập kế hoạch</div>
            <div style={{ fontSize: "0.65rem", color: C.muted }}>{((agg.camCount / PLAN.total) * 100).toFixed(1)}% so với mục tiêu 1.1M</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── scan progress UI ────────────────────────────────────────────────────── */
function ScanProgress({ progress, scanMode, wardResults, onStop }) {
  const agg = wardResults ? aggregateWards(wardResults) : null;

  return (
    <div style={{ padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        {/* Progress header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🗺️</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: C.text }}>
            {scanMode === "retry" ? "Đang thử lại các phường lỗi" : scanMode === "resume" ? "Đang tiếp tục quét TP.HCM" : "Đang quét toàn TP.HCM"}
          </div>
          <div style={{ fontSize: "0.8rem", color: C.dim, marginTop: "0.3rem" }}>
            Phường {progress.current}/{progress.total} — {progress.wardName}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: C.muted, marginBottom: "0.4rem" }}>
            <span>{progress.pct}% hoàn tất</span>
            <span>~{Math.ceil((progress.total - progress.current) * 1.6 / 60)} phút còn lại</span>
          </div>
          <div style={{ height: "10px", background: C.border, borderRadius: "100px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress.pct}%`,
              background: `linear-gradient(90deg, ${C.cyan}, ${C.violet})`,
              borderRadius: "100px",
              transition: "width 0.8s ease",
            }} />
          </div>
        </div>

        {/* Live stats */}
        {agg && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.7rem", marginBottom: "1.5rem" }}>
            {[
              { label: "Camera tính được", val: fmt(agg.camCount),    color: C.cyan },
              { label: "Giao lộ phát hiện", val: fmt(agg.byCat.intersection||0), color: C.amber },
              { label: "Đường (km)",        val: agg.roadKm.toFixed(1),           color: C.violet },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${color}33`, borderRadius: "8px", padding: "0.7rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color }}>{val}</div>
                <div style={{ fontSize: "0.65rem", color: C.muted, marginTop: "0.2rem" }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent wards */}
        {wardResults && wardResults.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "0.8rem 1rem", marginBottom: "1.5rem", maxHeight: "200px", overflowY: "auto" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>Phường vừa quét</div>
            {[...wardResults].reverse().slice(0, 15).map((w, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", padding: "0.2rem 0", borderBottom: `1px solid ${C.border}22` }}>
                <span style={{ color: w.error ? C.red : C.dim }}>{w.error ? "❌" : "✓"} {w.name}</span>
                <span style={{ color: w.error ? C.red : C.text, fontWeight: 600 }}>
                  {w.error ? w.error.slice(0, 40) : `${w.camCount} cam · ${w.roadKm.toFixed(1)} km`}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center" }}>
          <button onClick={onStop} style={{
            background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: "8px",
            padding: "0.6rem 1.5rem", color: C.red, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
          }}>⏹ Dừng quét</button>
        </div>
        <div style={{ textAlign: "center", fontSize: "0.68rem", color: C.muted, marginTop: "0.8rem" }}>
          Quét tuần tự mỗi 1.6s để không vượt giới hạn Overpass API · Kết quả được lưu sau mỗi phường
        </div>
      </div>
    </div>
  );
}

/* ─── start / resumable panel ─────────────────────────────────────────────── */
function StartPanel({ status, wardResults, aggregate, onStartFresh, onResume, onRetryFailed, navigate }) {
  const isResumable = status === "resumable";
  const failedCount = wardResults ? wardResults.filter(w => w.error).length : 0;
  const doneCount   = wardResults ? wardResults.filter(w => !w.error).length : 0;

  return (
    <div style={{ minHeight: "72vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "2rem" }}>
      <div style={{ fontSize: "3.5rem" }}>{isResumable ? "⏸️" : "🗺️"}</div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "1.25rem", fontWeight: 800, color: C.text, marginBottom: "0.5rem" }}>
          {isResumable ? "Đã tạm dừng giữa chừng" : "Thống kê camera TP.HCM"}
        </div>
        <div style={{ fontSize: "0.85rem", color: C.dim, maxWidth: "460px", lineHeight: 1.7 }}>
          {isResumable ? (
            <>
              Đã quét <strong style={{ color: C.green }}>{doneCount} phường</strong> thành công
              {failedCount > 0 && <>, <strong style={{ color: C.red }}>{failedCount} phường lỗi</strong></>}.
              Kết quả được lưu trong localStorage. Bạn có thể tiếp tục hoặc thử lại các phường lỗi.
            </>
          ) : (
            <>
              Quét toàn bộ <strong style={{ color: C.cyan }}>168 phường/xã TP.HCM</strong> từ OpenStreetMap
              để tính số camera chính xác theo từng loại địa điểm. Khoảng <strong style={{ color: C.amber }}>5–10 phút</strong>,
              kết quả lưu tự động — reload trang không mất dữ liệu.
            </>
          )}
        </div>
      </div>

      {/* Resume partial progress bar */}
      {isResumable && wardResults && (
        <div style={{ width: "100%", maxWidth: "460px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: C.muted, marginBottom: "0.4rem" }}>
            <span>{doneCount}/{168} phường hoàn tất</span>
            {failedCount > 0 && <span style={{ color: C.red }}>{failedCount} lỗi</span>}
          </div>
          <div style={{ height: "8px", background: C.border, borderRadius: "100px", overflow: "hidden", display: "flex" }}>
            <div style={{ flex: doneCount, background: C.green, transition: "flex 0.5s" }} />
            <div style={{ flex: failedCount, background: C.red, opacity: 0.6 }} />
            <div style={{ flex: 168 - doneCount - failedCount, background: "transparent" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        {isResumable ? (
          <>
            {/* Resume: continue from where we left off (skip done wards) */}
            {doneCount + failedCount < 168 && (
              <button onClick={onResume} style={{
                background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`,
                border: "none", borderRadius: "10px", padding: "0.75rem 2rem",
                color: "#fff", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
              }}>▶ Tiếp tục ({168 - doneCount - failedCount} phường còn lại)</button>
            )}
            {/* Retry only failed wards */}
            {failedCount > 0 && (
              <button onClick={onRetryFailed} style={{
                background: `linear-gradient(135deg, ${C.amber}, ${C.orange})`,
                border: "none", borderRadius: "10px", padding: "0.75rem 1.75rem",
                color: "#000", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
              }}>🔁 Thử lại {failedCount} phường lỗi</button>
            )}
            {/* View partial results */}
            {aggregate && doneCount > 0 && (
              <button onClick={() => {
                // Force status to "done" by saving a "viewed" flag — simplest: just call onResume with empty
                // We re-use onResume but we actually just want to view — handled by parent
                onResume("view");
              }} style={{
                background: C.card2, border: `1px solid ${C.border}`, borderRadius: "10px",
                padding: "0.75rem 1.5rem", color: C.dim, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
              }}>📊 Xem kết quả tạm ({doneCount} phường)</button>
            )}
          </>
        ) : (
          <button onClick={onStartFresh} style={{
            background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
            border: "none", borderRadius: "10px", padding: "0.75rem 2rem",
            color: "#fff", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
          }}>🚀 Bắt đầu quét toàn TP.HCM</button>
        )}
        <button onClick={() => navigate("/scan")} style={{
          background: C.card2, border: `1px solid ${C.border}`, borderRadius: "10px",
          padding: "0.75rem 1.5rem", color: C.dim, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
        }}>← Quét thủ công một vùng</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.6rem", width: "100%", maxWidth: "560px" }}>
        {[
          { icon: "📍", text: "168 phường/xã" },
          { icon: "🌐", text: "Dữ liệu OSM thực tế" },
          { icon: "💾", text: "Lưu sau mỗi phường" },
          { icon: "🔁", text: "Retry tự động khi lỗi" },
        ].map(({ icon, text }) => (
          <div key={text} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "0.6rem", textAlign: "center", fontSize: "0.7rem", color: C.dim }}>
            <div style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{icon}</div>
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────────────────────── */
export default function Plan() {
  const navigate = useNavigate();
  const { status, scanMode, progress, wardResults, aggregate, errorMsg,
          startFresh, resume, retryFailed, stop, reset } = useBatchScan();

  // "view partial" from resumable panel → treat as done for display
  const [viewPartial, setViewPartial] = useState(false);

  const savedAt = useMemo(() => {
    const cache = loadCityScanCache();
    return cache?.savedAt ? new Date(cache.savedAt).toLocaleString("vi-VN") : null;
  }, [wardResults]);

  const showDashboard = (status === "done" || viewPartial) && aggregate;
  const failedCount   = wardResults ? wardResults.filter(w => w.error).length : 0;

  function handleResumeOrView(mode) {
    if (mode === "view") { setViewPartial(true); return; }
    setViewPartial(false);
    resume();
  }

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 1.25rem", height: "48px",
        background: `${C.bg}f4`, borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(14px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span onClick={() => navigate("/")} style={{ cursor: "pointer", fontSize: "1.1rem" }}>📹</span>
          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Thống kê Camera TP.HCM</span>
          <Tag color={C.amber}>1.1M KẾ HOẠCH 2026–2029</Tag>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {showDashboard && savedAt && (
            <span style={{ fontSize: "0.65rem", color: C.muted }}>Lưu lúc {savedAt}</span>
          )}
          {showDashboard && failedCount > 0 && (
            <button onClick={retryFailed} style={{
              fontSize: "0.7rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700,
              background: `${C.amber}18`, border: `1px solid ${C.amber}44`, color: C.amber,
            }}>🔁 Retry {failedCount} lỗi</button>
          )}
          {showDashboard && wardResults && (
            <>
              <button onClick={() => navigate("/city-map")} style={{
                fontSize: "0.7rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700,
                background: `${C.green}18`, border: `1px solid ${C.green}44`, color: C.green,
              }}>🗺 Bản đồ</button>
              <button onClick={() => exportCSV(wardResults)} style={{
                fontSize: "0.7rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700,
                background: `${C.violet}18`, border: `1px solid ${C.violet}44`, color: C.violet,
              }}>⬇ CSV</button>
              <button onClick={() => exportJSON(wardResults)} style={{
                fontSize: "0.7rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700,
                background: `${C.violet}18`, border: `1px solid ${C.violet}44`, color: C.violet,
              }}>⬇ JSON</button>
            </>
          )}
          {showDashboard && (
            <button onClick={() => { setViewPartial(false); reset(); }} style={{
              fontSize: "0.7rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700,
              background: `${C.red}18`, border: `1px solid ${C.red}44`, color: C.red,
            }}>🔄 Quét lại</button>
          )}
          <button onClick={() => navigate("/scan")} style={{
            fontSize: "0.74rem", padding: "4px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: 700,
            background: `${C.cyan}18`, border: `1px solid ${C.cyan}44`, color: C.cyan,
          }}>← Scanner</button>
        </div>
      </nav>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      {status === "running" ? (
        <ScanProgress progress={progress} scanMode={scanMode} wardResults={wardResults} onStop={stop} />
      ) : showDashboard ? (
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.25rem 1.25rem 3rem" }}>
          {/* Partial warning banner */}
          {(viewPartial || (status === "done" && failedCount > 0)) && (
            <div style={{
              marginBottom: "1rem", padding: "0.6rem 1rem",
              background: `${C.amber}0d`, border: `1px solid ${C.amber}33`, borderRadius: "8px",
              display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.78rem",
            }}>
              <span>⚠️</span>
              <span style={{ color: C.amber, fontWeight: 600 }}>
                {viewPartial
                  ? `Đang xem kết quả tạm — chưa quét hết (${aggregate.completed}/168 phường). `
                  : `${failedCount} phường lỗi, không tính vào kết quả. `}
                <button onClick={() => { setViewPartial(false); retryFailed(); }}
                  style={{ background: "none", border: "none", color: C.cyan, cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>
                  Thử lại ngay →
                </button>
              </span>
            </div>
          )}
          <CityDashboard agg={aggregate} wardResults={wardResults} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.7rem", color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: "1rem" }}>
            <span>Dữ liệu thực tế từ OpenStreetMap · {aggregate.completed} phường/xã TP.HCM · CamSpot v2.6.0</span>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button onClick={() => navigate("/city-map")} style={{ background: "none", border: "none", cursor: "pointer", color: C.green, fontSize: "0.7rem", fontWeight: 600 }}>🗺 Bản đồ</button>
              <button onClick={() => wardResults && exportCSV(wardResults)} style={{ background: "none", border: "none", cursor: "pointer", color: C.violet, fontSize: "0.7rem", fontWeight: 600 }}>⬇ CSV</button>
              <button onClick={() => wardResults && exportJSON(wardResults)} style={{ background: "none", border: "none", cursor: "pointer", color: C.violet, fontSize: "0.7rem", fontWeight: 600 }}>⬇ JSON</button>
              <button onClick={() => window.print()} style={{ background: "none", border: "none", cursor: "pointer", color: C.amber, fontSize: "0.7rem", fontWeight: 600 }}>🖨 In / PDF</button>
              <span style={{ color: C.border }}>|</span>
              <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "0.7rem" }}>Home</button>
              <button onClick={() => navigate("/scan")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "0.7rem" }}>Scanner</button>
              <button onClick={() => navigate("/sys")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "0.7rem" }}>Kiến trúc</button>
            </div>
          </div>
        </div>
      ) : status === "error" ? (
        <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <div style={{ fontSize: "2rem" }}>❌</div>
          <div style={{ color: C.red, fontWeight: 700 }}>Lỗi khi quét</div>
          <div style={{ fontSize: "0.8rem", color: C.muted, maxWidth: "400px", textAlign: "center" }}>{errorMsg}</div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={resume} style={{
              background: `${C.amber}18`, border: `1px solid ${C.amber}44`, borderRadius: "8px",
              padding: "0.6rem 1.5rem", color: C.amber, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
            }}>▶ Tiếp tục từ điểm dừng</button>
            <button onClick={reset} style={{
              background: `${C.muted}18`, border: `1px solid ${C.muted}44`, borderRadius: "8px",
              padding: "0.6rem 1rem", color: C.muted, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
            }}>Xóa & quét lại</button>
          </div>
        </div>
      ) : (
        <StartPanel
          status={status}
          wardResults={wardResults}
          aggregate={aggregate}
          onStartFresh={startFresh}
          onResume={handleResumeOrView}
          onRetryFailed={retryFailed}
          navigate={navigate}
        />
      )}

      <style>{`
        @media print {
          nav, button { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
