import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const C = {
  bg:     "#060d1a",
  bg2:    "#0b1425",
  card:   "#0d1829",
  border: "#1e3354",
  cyan:   "#38BDF8",
  violet: "#A78BFA",
  green:  "#34D399",
  amber:  "#FBBF24",
  pink:   "#F472B6",
  red:    "#F87171",
  text:   "#e2e8f0",
  muted:  "#64748b",
  dim:    "#94a3b8",
  sidebar:"#080f1e",
};

/* ── nav tree structure ─────────────────────────────────────────── */
const NAV = [
  {
    id: "overview", label: "Tổng quan", icon: "📖",
    children: [
      { id: "what-is", label: "CamSpot là gì?" },
      { id: "how-it-works", label: "Hoạt động như thế nào?" },
      { id: "quick-start", label: "Bắt đầu nhanh" },
    ],
  },
  {
    id: "city-scan", label: "City Scan", icon: "🗺",
    children: [
      { id: "city-intro", label: "Giới thiệu" },
      { id: "city-start", label: "Bắt đầu quét" },
      { id: "city-progress", label: "Theo dõi tiến độ" },
      { id: "city-resume", label: "Dừng & tiếp tục" },
      { id: "city-custom", label: "Thêm thành phố khác" },
      { id: "city-export", label: "Xuất kết quả" },
    ],
  },
  {
    id: "local-scan", label: "Quét vùng", icon: "🔍",
    children: [
      { id: "local-intro", label: "Giới thiệu" },
      { id: "local-area", label: "Chọn khu vực" },
      { id: "local-categories", label: "Cấu hình loại điểm" },
      { id: "local-run", label: "Chạy quét" },
      { id: "local-sessions", label: "Quản lý dự án" },
      { id: "local-export", label: "Xuất dữ liệu" },
    ],
  },
  {
    id: "city-map", label: "Bản đồ phân bổ", icon: "📊",
    children: [
      { id: "map-intro", label: "Giới thiệu" },
      { id: "map-choropleth", label: "Đọc choropleth" },
      { id: "map-ward", label: "Xem chi tiết phường" },
    ],
  },
  {
    id: "ward-detail", label: "Chi tiết phường", icon: "📍",
    children: [
      { id: "ward-intro", label: "Giới thiệu" },
      { id: "ward-map", label: "Bản đồ & markers" },
      { id: "ward-panel", label: "Bảng kết quả" },
    ],
  },
  {
    id: "data", label: "Dữ liệu & Xuất file", icon: "💾",
    children: [
      { id: "data-formats", label: "Định dạng xuất" },
      { id: "data-import", label: "Import dự án" },
      { id: "data-geojson", label: "GeoJSON ranh giới" },
    ],
  },
  {
    id: "faq", label: "FAQ", icon: "❓",
    children: [
      { id: "faq-429", label: "Lỗi 429 / timeout" },
      { id: "faq-nogeom", label: "Báo thiếu geometry" },
      { id: "faq-slow", label: "Quét chậm" },
      { id: "faq-storage", label: "Dữ liệu lưu ở đâu?" },
    ],
  },
];

/* ── helpers ────────────────────────────────────────────────────── */
function Tag({ children, color = C.cyan }) {
  return (
    <span style={{
      display: "inline-block", fontSize: "0.6rem", fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 8px",
      borderRadius: "100px", border: `1px solid ${color}44`,
      background: `${color}14`, color,
    }}>{children}</span>
  );
}

function Note({ children, color = C.amber, icon = "ℹ️" }) {
  return (
    <div style={{
      display: "flex", gap: "0.65rem", alignItems: "flex-start",
      background: `${color}0d`, border: `1px solid ${color}30`,
      borderRadius: "8px", padding: "0.85rem 1rem",
      marginTop: "1rem", marginBottom: "1rem",
    }}>
      <span style={{ fontSize: "1rem", flexShrink: 0 }}>{icon}</span>
      <div style={{ fontSize: "0.82rem", color: C.dim, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function Step({ n, children }) {
  return (
    <div style={{ display: "flex", gap: "1rem", marginBottom: "0.85rem", alignItems: "flex-start" }}>
      <div style={{
        width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
        background: `${C.cyan}20`, border: `1px solid ${C.cyan}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.72rem", fontWeight: 700, color: C.cyan,
      }}>{n}</div>
      <div style={{ fontSize: "0.85rem", color: C.dim, lineHeight: 1.7, paddingTop: "3px" }}>{children}</div>
    </div>
  );
}

function Code({ children }) {
  return (
    <code style={{
      background: `${C.cyan}14`, border: `1px solid ${C.cyan}22`,
      borderRadius: "4px", padding: "1px 6px",
      fontSize: "0.82em", color: C.cyan, fontFamily: "monospace",
    }}>{children}</code>
  );
}

function H2({ id, children }) {
  return (
    <h2 id={id} style={{
      fontSize: "1.4rem", fontWeight: 800, color: C.text,
      margin: "0 0 0.5rem", paddingTop: "0.25rem",
      scrollMarginTop: "80px",
    }}>{children}</h2>
  );
}

function H3({ id, children }) {
  return (
    <h3 id={id} style={{
      fontSize: "1rem", fontWeight: 700, color: C.text,
      margin: "2rem 0 0.6rem", scrollMarginTop: "80px",
    }}>{children}</h3>
  );
}

function Divider() {
  return <div style={{ height: "1px", background: C.border, margin: "2.5rem 0" }} />;
}

function KeyVal({ rows, color = C.cyan }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden", marginTop: "0.75rem" }}>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: "flex", borderBottom: i < rows.length - 1 ? `1px solid ${C.border}22` : "none" }}>
          <div style={{ width: "42%", padding: "0.55rem 1rem", fontWeight: 600, fontSize: "0.8rem", color, background: `${color}06`, flexShrink: 0 }}>{k}</div>
          <div style={{ padding: "0.55rem 1rem", fontSize: "0.8rem", color: C.dim }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

/* ── sidebar ────────────────────────────────────────────────────── */
function Sidebar({ active, onSelect }) {
  return (
    <aside style={{
      width: "240px", flexShrink: 0,
      background: C.sidebar,
      borderRight: `1px solid ${C.border}`,
      overflowY: "auto",
    }}>
      <div style={{ padding: "1.25rem 0.75rem 2rem" }}>
        {NAV.map(group => (
          <div key={group.id} style={{ marginBottom: "0.25rem" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.45rem",
              padding: "0.45rem 0.75rem",
              fontSize: "0.72rem", fontWeight: 700,
              color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              <span>{group.icon}</span>
              <span>{group.label}</span>
            </div>
            {group.children.map(item => (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "0.38rem 0.75rem 0.38rem 2rem",
                  fontSize: "0.82rem",
                  color: active === item.id ? C.cyan : C.dim,
                  background: active === item.id ? `${C.cyan}14` : "transparent",
                  borderLeft: active === item.id ? `2px solid ${C.cyan}` : "2px solid transparent",
                  border: "none", borderRadius: "0 6px 6px 0",
                  cursor: "pointer", transition: "all 0.15s",
                  marginLeft: "-1px",
                }}
                onMouseEnter={e => { if (active !== item.id) { e.currentTarget.style.color = C.text; e.currentTarget.style.background = `${C.border}40`; } }}
                onMouseLeave={e => { if (active !== item.id) { e.currentTarget.style.color = C.dim; e.currentTarget.style.background = "transparent"; } }}
              >{item.label}</button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

/* ── content sections ───────────────────────────────────────────── */
function Content({ navigate }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "2.5rem 3rem", maxWidth: "820px" }}>

      {/* ── OVERVIEW ── */}
      <section>
        <div style={{ marginBottom: "0.5rem" }}><Tag>Tổng quan</Tag></div>
        <H2 id="what-is">CamSpot là gì?</H2>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          <strong style={{ color: C.text }}>CamSpot</strong> (Camera Placement Scanner) là công cụ phân tích bản đồ
          OpenStreetMap để xác định vị trí lắp đặt camera an ninh tối ưu. Ứng dụng chạy hoàn toàn
          trên trình duyệt — không cần cài đặt, không cần tài khoản, không cần backend.
        </p>

        <KeyVal rows={[
          ["Nền tảng",    "Web app (React 18 + Vite), chạy trên GitHub Pages"],
          ["Dữ liệu",     "OpenStreetMap qua Overpass API (3 endpoints fallback)"],
          ["Lưu trữ",     "IndexedDB trên trình duyệt (~30–50 MB cho toàn TP.HCM)"],
          ["Backend",     "Không bắt buộc — mọi xử lý diễn ra client-side"],
        ]} />

        <Divider />

        <H3 id="how-it-works">Hoạt động như thế nào?</H3>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          CamSpot query Overpass API để lấy dữ liệu POI (địa điểm quan trọng) và hệ thống đường trong
          một vùng. Thuật toán node-sharing phát hiện các giao lộ, sau đó thuật toán camera placement
          tự động đề xuất vị trí và góc xoay camera phù hợp với từng loại nút giao.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
          {[
            { icon: "📡", label: "Query Overpass", desc: "Lấy POI + đường trong bán kính/polygon" },
            { icon: "⚙️", label: "Classify & Filter", desc: "Phân loại OSM tags → 8 danh mục" },
            { icon: "🔀", label: "Detect Intersections", desc: "Node-sharing O(n) — ngã ba, ngã tư, hẻm" },
            { icon: "📷", label: "Place Cameras", desc: "CAM1/CAM2/CAM_alley theo hướng giao lộ" },
          ].map(({ icon, label, desc }) => (
            <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "0.85rem 1rem", display: "flex", gap: "0.65rem" }}>
              <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.text }}>{label}</div>
                <div style={{ fontSize: "0.76rem", color: C.dim, marginTop: "0.2rem" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <Divider />

        <H3 id="quick-start">Bắt đầu nhanh</H3>
        <Step n="1">Truy cập <strong style={{ color: C.cyan }}>cam-spot.zenpax.io.vn</strong> trên trình duyệt (Chrome/Edge khuyến nghị).</Step>
        <Step n="2">Chọn tính năng phù hợp:<br />
          <span style={{ color: C.cyan }}>🗺 City Scan</span> — quét toàn TP.HCM (168 phường), lưu kết quả vào IndexedDB.<br />
          <span style={{ color: C.amber }}>🔍 Quét vùng</span> — quét nhanh một khu vực cụ thể.
        </Step>
        <Step n="3">Chờ quét xong (City Scan cần ~20–40 phút, Quét vùng cần ~5–15 giây/vùng).</Step>
        <Step n="4">Xem kết quả trên bản đồ — camera markers, POI markers, đường, giao lộ — hoặc xuất CSV/JSON.</Step>
        <Note icon="💡">Lần đầu dùng City Scan nên để mặc định TP.HCM. Sau khi quét xong có thể vào <strong>Bản đồ phân bổ</strong> để click từng phường xem chi tiết ngay lập tức.</Note>
      </section>

      <Divider />

      {/* ── CITY SCAN ── */}
      <section>
        <div style={{ marginBottom: "0.5rem" }}><Tag color={C.cyan}>City Scan</Tag></div>
        <H2 id="city-intro">City Scan</H2>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          City Scan quét tự động toàn bộ phường/xã của một thành phố theo thứ tự, mỗi phường cách nhau
          3 giây để tránh rate-limit Overpass API. Kết quả — bao gồm tọa độ điểm và geometry đường —
          được lưu vào IndexedDB, cho phép xem lại bất kỳ lúc nào mà không cần quét lại.
        </p>

        <H3 id="city-start">Bắt đầu quét</H3>
        <Step n="1">Vào <strong style={{ color: C.cyan }}>/city</strong> (City Scan Hub).</Step>
        <Step n="2">Bấm <Code>+ Quét mới</Code> — modal 2 bước sẽ hiện ra.</Step>
        <Step n="3"><strong>Bước 1:</strong> Chọn thành phố. Mặc định là TP.HCM (168 phường). Nếu muốn quét thành phố khác, bấm <Code>+ Nhập GeoJSON</Code> để thêm.</Step>
        <Step n="4"><strong>Bước 2:</strong> Đặt tên cho lần quét (ví dụ: <Code>HCM Q1 2026</Code>). Bấm <Code>Bắt đầu quét</Code>.</Step>
        <Step n="5">Thanh tiến độ sẽ hiện từng phường đang được quét. Màn hình có thể để mở hoặc thu nhỏ — quét vẫn chạy.</Step>
        <Note icon="⚠️" color={C.amber}>Không đóng tab trình duyệt trong khi đang quét — IndexedDB sẽ mất dữ liệu chưa lưu. Nếu vô tình đóng, dùng tính năng Resume.</Note>

        <H3 id="city-progress">Theo dõi tiến độ</H3>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Thanh tiến độ hiển thị: số phường đã quét / tổng số phường, tên phường hiện tại,
          và ước tính thời gian còn lại. Phường quét thành công có nền xanh; phường lỗi có nền đỏ nhạt
          và sẽ được bỏ qua để quét tiếp.
        </p>
        <KeyVal color={C.green} rows={[
          ["Màu xanh lá",   "Phường quét thành công"],
          ["Màu đỏ",        "Phường lỗi (timeout / không có dữ liệu)"],
          ["Màu xám",       "Chưa quét"],
          ["Đang nhấp nháy","Phường đang được xử lý"],
        ]} />

        <H3 id="city-resume">Dừng & tiếp tục</H3>
        <Step n="1">Bấm <Code>⏸ Tạm dừng</Code> để dừng sau phường hiện tại.</Step>
        <Step n="2">Đóng trang hoặc làm việc khác.</Step>
        <Step n="3">Quay lại <strong>/city</strong> — chọn lần quét đã lưu — bấm <Code>▶ Tiếp tục</Code>. Ứng dụng sẽ bắt đầu từ phường chưa quét tiếp theo.</Step>
        <Note icon="ℹ️" color={C.cyan}>Mỗi phường quét xong được lưu ngay vào IndexedDB. Dù quét chỉ được 50/168 phường, 50 phường đó vẫn xem được chi tiết trên bản đồ.</Note>

        <H3 id="city-custom">Thêm thành phố khác</H3>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Bất kỳ tỉnh/thành nào của Việt Nam đều có thể thêm vào City Scan, miễn là có file GeoJSON ranh giới phường/xã.
        </p>
        <Step n="1">Tải file GeoJSON ranh giới từ <strong style={{ color: C.cyan }}>gis.vn</strong> → chọn tỉnh → "Tải về GeoJSON".</Step>
        <Step n="2">Trong modal <Code>+ Quét mới</Code>, bấm <Code>+ Nhập GeoJSON</Code>.</Step>
        <Step n="3">Điền tên thành phố, chọn file GeoJSON vừa tải, bấm <Code>Thêm thành phố</Code>.</Step>
        <Step n="4">Thành phố mới xuất hiện trong danh sách — chọn và tiến hành quét bình thường.</Step>
        <Note icon="ℹ️" color={C.violet}>File GeoJSON từ gis.vn dùng thuộc tính <Code>ten_xa</Code> / <Code>ma_xa</Code> — ứng dụng nhận dạng tự động, không cần chỉnh sửa file.</Note>

        <H3 id="city-export">Xuất kết quả City Scan</H3>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Từ trang <strong>/city</strong>, chọn lần quét cần xuất rồi bấm nút export:
        </p>
        <KeyVal color={C.amber} rows={[
          ["CSV",  "Danh sách tất cả phường với số liệu: tên, mã, số camera, số POI, km đường, diện tích"],
          ["JSON", "Toàn bộ dữ liệu wardCounts[] — dùng cho phân tích ngoài"],
          ["PDF",  "Báo cáo tổng hợp dạng bảng (in được)"],
        ]} />
      </section>

      <Divider />

      {/* ── LOCAL SCAN ── */}
      <section>
        <div style={{ marginBottom: "0.5rem" }}><Tag color={C.amber}>Quét vùng</Tag></div>
        <H2 id="local-intro">Quét vùng</H2>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Quét vùng (<strong>/scan</strong>) cho phép bạn quét một khu vực cụ thể theo tọa độ, tên hành chính,
          hoặc ranh giới polygon tùy chỉnh. Kết quả hiển thị ngay lập tức trên bản đồ với đầy đủ
          camera markers, POI, đường và giao lộ. Dự án có thể lưu vào IndexedDB để xem lại.
        </p>

        <H3 id="local-area">Chọn khu vực</H3>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>Có 3 cách xác định vùng quét:</p>
        <KeyVal color={C.amber} rows={[
          ["Tọa độ + bán kính", "Nhập vĩ độ (lat), kinh độ (lng), bán kính (m). Vùng quét là hình tròn."],
          ["Tìm theo tên",      "Gõ tên phường/xã/quận vào ô Search — Nominatim tự động tìm tọa độ trung tâm và bán kính phù hợp với đơn vị hành chính đó."],
          ["Ranh giới polygon", "Dán GeoJSON Polygon vào ô Boundary hoặc import file — quét trong đúng vùng ranh giới, không theo hình tròn."],
        ]} />

        <H3 id="local-categories">Cấu hình loại điểm</H3>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Mở <Code>⚙ Cấu hình quét</Code> trong sidebar để chọn loại điểm cần quét:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.75rem" }}>
          {[
            ["🔀 Giao lộ",    "Ngã ba, ngã tư, đầu hẻm"],
            ["🏫 Trường học", "Trường, đại học, cao đẳng, mẫu giáo"],
            ["🏥 Bệnh viện",  "BV, phòng khám, trung tâm y tế"],
            ["🏪 Chợ/TTTM",  "Chợ, siêu thị, trung tâm thương mại"],
            ["🏨 Khách sạn",  "Hotel, motel, nhà nghỉ, homestay"],
            ["🌳 Công viên",  "Công viên, vườn hoa, khu vui chơi"],
            ["🏢 Hội nghị",   "Trung tâm hội nghị, sự kiện"],
            ["🏛️ Cơ quan",   "UBND, công an, tòa án, sở ban ngành"],
          ].map(([label, desc]) => (
            <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "0.55rem 0.75rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: C.text }}>{label}</div>
              <div style={{ fontSize: "0.73rem", color: C.dim }}>{desc}</div>
            </div>
          ))}
        </div>
        <Note icon="ℹ️" color={C.cyan}>Mặc định tất cả loại điểm đều được chọn. Bỏ chọn bớt để tăng tốc query và giảm số điểm kết quả.</Note>

        <H3 id="local-run">Chạy quét</H3>
        <Step n="1">Chọn khu vực (tọa độ hoặc tên địa danh).</Step>
        <Step n="2">Chọn loại điểm cần quét trong <Code>⚙ Cấu hình quét</Code>.</Step>
        <Step n="3">Bấm <Code>🔍 Bắt đầu quét</Code>.</Step>
        <Step n="4">Chờ ~5–30 giây — ứng dụng gửi query đến Overpass API, nhận dữ liệu, chạy thuật toán phát hiện giao lộ và đặt camera.</Step>
        <Step n="5">Kết quả hiện trên bản đồ: icon camera (màu cam), POI markers (màu theo loại), giao lộ (icon riêng theo số nhánh).</Step>

        <H3 id="local-sessions">Quản lý dự án</H3>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Mỗi lần quét có thể lưu thành một dự án (session) trong IndexedDB:
        </p>
        <KeyVal color={C.violet} rows={[
          ["Lưu dự án",    "Bấm nút 💾 trong header, nhập tên dự án. Chip header chuyển từ ○ (unsaved) sang ● (saved)."],
          ["Lưu thành bản mới", "Bấm 'Lưu thành...' — tạo bản sao với tên mới, không đè bản cũ."],
          ["Mở dự án",     "Mở ngăn kéo Sessions (icon ☰), click tên dự án."],
          ["Đổi tên",      "Trong ngăn kéo Sessions, click biểu tượng bút chì."],
          ["Xóa",          "Click biểu tượng thùng rác trong ngăn kéo Sessions."],
          ["Export file",  "Click biểu tượng xuất → file .json tải về máy."],
        ]} />

        <H3 id="local-export">Xuất dữ liệu</H3>
        <KeyVal color={C.green} rows={[
          ["JSON", "Toàn bộ state: points[], cameras[], roads[], intersectionOverrides, khu vực, danh mục."],
          ["CSV",  "Bảng điểm: tên, loại, tọa độ, điểm ưu tiên, khoảng cách."],
        ]} />
      </section>

      <Divider />

      {/* ── CITY MAP ── */}
      <section>
        <div style={{ marginBottom: "0.5rem" }}><Tag color={C.violet}>Bản đồ phân bổ</Tag></div>
        <H2 id="map-intro">Bản đồ phân bổ</H2>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Bản đồ choropleth (<strong>/city/map</strong>) hiển thị số camera ước tính theo từng phường/xã
          dưới dạng màu nhiệt — phường càng đậm màu thì số camera càng nhiều. Yêu cầu đã chạy City Scan
          ít nhất một lần.
        </p>

        <H3 id="map-choropleth">Đọc choropleth</H3>
        <KeyVal color={C.violet} rows={[
          ["Màu đậm (xanh đậm → tím)", "Phường có nhiều camera ước tính — mật độ POI và giao lộ cao"],
          ["Màu nhạt (xanh nhạt)",      "Phường ít camera hơn"],
          ["Màu xám",                   "Phường chưa được quét hoặc không có dữ liệu"],
          ["Toggle 'Theo mật độ'",      "Bật: hiển thị camera/km². Tắt: hiển thị tổng số camera tuyệt đối."],
        ]} />
        <Note icon="💡">Hover vào từng phường để xem thông tin nhanh: tên phường, quận, số camera, diện tích. Click để mở Ward Detail.</Note>

        <H3 id="map-ward">Mở chi tiết phường</H3>
        <Step n="1">Hover vào phường muốn xem — tooltip hiện số liệu tóm tắt.</Step>
        <Step n="2">Click vào phường đó.</Step>
        <Step n="3">Ứng dụng chuyển sang trang <strong>/city/details</strong> — toàn bộ dữ liệu phường đó (camera, POI, đường, giao lộ) được load từ IndexedDB và hiển thị trên bản đồ.</Step>
        <Note icon="⚠️" color={C.red}>Nếu phường báo "chưa có geometry cache" — phường đó đã có thống kê nhưng chưa có dữ liệu geometry lưu trong IDB (quét bằng phiên bản cũ hơn v2.8.0). Cần quét lại để có geometry.</Note>
      </section>

      <Divider />

      {/* ── WARD DETAIL ── */}
      <section>
        <div style={{ marginBottom: "0.5rem" }}><Tag color={C.green}>Ward Detail</Tag></div>
        <H2 id="ward-intro">Chi tiết phường</H2>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Trang Ward Detail (<strong>/city/details</strong>) hiển thị toàn bộ kết quả quét của một phường
          — giống hệt giao diện Quét vùng nhưng load dữ liệu từ cache IDB thay vì query lại Overpass.
        </p>

        <H3 id="ward-map">Bản đồ & markers</H3>
        <KeyVal color={C.green} rows={[
          ["Camera icon (cam1–cam_alley)", "Vị trí camera đề xuất, xoay theo góc đề xuất"],
          ["Chấm màu theo loại",           "POI markers — màu theo danh mục (trường, bệnh viện, ...)"],
          ["Icon ngã ba/ngã tư/hẻm",       "Giao lộ — icon thay đổi theo số nhánh và có đèn hay không"],
          ["Đường xanh mờ",                "Hệ thống đường trong phường"],
        ]} />

        <H3 id="ward-panel">Bảng kết quả</H3>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Panel bên phải hiển thị bảng điểm, thống kê theo danh mục, và số liệu tổng.
          Có thể thu nhỏ panel bằng nút <Code>Kết quả</Code> ở header để xem bản đồ rộng hơn.
          Nhấn vào một hàng trong bảng để highlight marker tương ứng trên bản đồ.
        </p>
      </section>

      <Divider />

      {/* ── DATA ── */}
      <section>
        <div style={{ marginBottom: "0.5rem" }}><Tag color={C.amber}>Dữ liệu</Tag></div>
        <H2 id="data-formats">Định dạng xuất file</H2>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "0.75rem" }}>
          {[
            {
              fmt: "JSON", color: C.cyan,
              desc: "File session đầy đủ. Có thể import lại vào ứng dụng. Chứa: area, categories, points[], cameras[], roads[], rawIntersections[], intersectionOverrides, sessionDisplayName.",
            },
            {
              fmt: "CSV (Quét vùng)", color: C.amber,
              desc: "Bảng điểm: id, name, category, lat, lng, priority, distanceM. Mỗi dòng một điểm POI hoặc giao lộ.",
            },
            {
              fmt: "CSV (City Scan)", color: C.green,
              desc: "Bảng phường: code, name, district, camCount, poiCount, roadKm, areaKm2, camDensity. Mỗi dòng một phường.",
            },
            {
              fmt: "PDF (City Scan)", color: C.violet,
              desc: "Báo cáo tổng hợp dạng bảng, in được. Chứa tên lần quét, ngày giờ, bảng thống kê từng phường.",
            },
          ].map(({ fmt, color, desc }) => (
            <div key={fmt} style={{ background: C.card, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: "8px", padding: "0.85rem 1rem" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>{fmt}</div>
              <div style={{ fontSize: "0.8rem", color: C.dim, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        <H3 id="data-import">Import dự án từ file</H3>
        <Step n="1">Trong trang Quét vùng (<strong>/scan</strong>), mở ngăn kéo Sessions.</Step>
        <Step n="2">Bấm <Code>📂 Mở file</Code> — chọn file .json đã xuất trước đó.</Step>
        <Step n="3">Dữ liệu được load vào bản đồ ngay lập tức. Bấm <Code>💾 Lưu</Code> nếu muốn lưu vào IDB.</Step>

        <H3 id="data-geojson">Lấy GeoJSON ranh giới tỉnh/thành</H3>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Để thêm tỉnh/thành mới vào City Scan, bạn cần file GeoJSON ranh giới phường/xã.
        </p>
        <Step n="1">Vào <strong style={{ color: C.cyan }}>gis.vn/don-vi-hanh-chinh-viet-nam</strong></Step>
        <Step n="2">Chọn tỉnh/thành phố cần lấy ranh giới.</Step>
        <Step n="3">Bấm <Code>Tải về GeoJSON</Code>.</Step>
        <Step n="4">Import file vào City Scan qua modal <Code>+ Quét mới → + Nhập GeoJSON</Code>.</Step>
        <Note icon="ℹ️" color={C.cyan}>File từ gis.vn dùng thuộc tính <Code>ten_xa</Code> / <Code>ma_xa</Code> — ứng dụng nhận dạng tự động, không cần chỉnh sửa.</Note>
      </section>

      <Divider />

      {/* ── FAQ ── */}
      <section>
        <div style={{ marginBottom: "0.5rem" }}><Tag color={C.red}>FAQ</Tag></div>
        <H2 id="faq-429">Lỗi 429 Too Many Requests / 504 Timeout</H2>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Overpass API có rate-limit. Ứng dụng dùng 3 endpoint (overpass-api.de, kumi.systems, private.coffee)
          với 20 giây timeout và 1 lần retry mỗi endpoint. Nếu gặp 429, ứng dụng sẽ đợi 5 giây rồi chuyển sang endpoint tiếp theo.
        </p>
        <KeyVal color={C.red} rows={[
          ["City Scan bị 429 nhiều",  "Bình thường khi quét nhiều phường liên tục. Ứng dụng tự chuyển endpoint. Không cần can thiệp."],
          ["Quét vùng bị timeout",    "Thử lại sau 1–2 phút, hoặc giảm bán kính quét, hoặc bỏ bớt loại điểm."],
          ["Tất cả endpoint fail",    "Overpass API đang quá tải. Thử lại sau 5–10 phút."],
        ]} />

        <H3 id="faq-nogeom">Báo "chưa có geometry cache"</H3>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Phường có thống kê (số điểm) nhưng không có dữ liệu geometry (tọa độ chi tiết). Điều này xảy ra khi:
        </p>
        <ul style={{ paddingLeft: "1.25rem", color: C.dim, fontSize: "0.82rem", lineHeight: 2 }}>
          <li>Dữ liệu được quét bằng phiên bản cũ hơn v2.8.0 (trước khi có tính năng lưu geometry)</li>
          <li>Write vào IndexedDB bị lỗi im lặng (đầy bộ nhớ browser)</li>
        </ul>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          <strong style={{ color: C.text }}>Giải pháp:</strong> Quét lại lần quét City Scan — geometry sẽ được lưu đúng từ v2.8.0 trở lên.
        </p>

        <H3 id="faq-slow">Quét chậm hơn bình thường</H3>
        <KeyVal color={C.amber} rows={[
          ["City Scan mỗi phường ~20–30s", "Bình thường — mỗi phường cách nhau 3s và cần 10–25s để Overpass trả về."],
          ["Quét vùng > 30 giây",          "Bán kính quá lớn (> 3km) hoặc Overpass đang tải. Giảm bán kính hoặc bỏ bớt loại điểm."],
          ["Máy yếu, tab bị freeze",       "Ứng dụng xử lý nhiều điểm cùng lúc. Giảm maxResults trong ⚙ Cấu hình quét."],
        ]} />

        <H3 id="faq-storage">Dữ liệu được lưu ở đâu?</H3>
        <p style={{ color: C.dim, lineHeight: 1.8, fontSize: "0.88rem" }}>
          Toàn bộ dữ liệu lưu trong <strong style={{ color: C.text }}>IndexedDB</strong> của trình duyệt,
          tên database là <Code>cam-scan-db</Code>. Không có gì được gửi lên server.
        </p>
        <KeyVal color={C.muted} rows={[
          ["Quét vùng (sessions)",      "DB: cam-scan-db · Store: sessions · Key: filename"],
          ["City Scan (scan files)",    "DB: cam-scan-db · Store: city-scan-files · Key: scanId"],
          ["City ward geometry",        "DB: cam-scan-db · Store: ward-geometry · Key: {scanId}_{wardCode}"],
          ["Dọn dẹp",                   "Xóa dự án/scan trong UI hoặc vào DevTools → Application → IndexedDB → Delete database"],
        ]} />
        <Note icon="⚠️" color={C.red}>Dữ liệu IndexedDB gắn liền với trình duyệt và domain. Xóa cache trình duyệt hoặc dùng Incognito sẽ mất dữ liệu. Luôn export file JSON định kỳ nếu cần giữ lâu dài.</Note>
      </section>

      <div style={{ height: "4rem" }} />
    </div>
  );
}

/* ── main ────────────────────────────────────────────────────────── */
export default function Guide() {
  const navigate = useNavigate();
  const [active, setActive] = useState("what-is");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const contentRef = useRef(null);

  function handleSelect(id) {
    setActive(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const allIds = NAV.flatMap(g => g.children.map(c => c.id));
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActive(entry.target.id);
          break;
        }
      }
    }, { root: content, rootMargin: "-20% 0px -70% 0px" });
    allIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* nav */}
      <nav style={{
        flexShrink: 0, zIndex: 100,
        display: "grid", gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0 1.5rem", height: "52px",
        background: `${C.bg2}f0`, borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(12px)",
      }}>
        {/* LEFT — logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
          <span onClick={() => navigate("/")} style={{ fontSize: "1.25rem", cursor: "pointer", flexShrink: 0 }}>📹</span>
          <div style={{ lineHeight: 1.2, cursor: "pointer", minWidth: 0 }} onClick={() => navigate("/")}>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>CamSpot</div>
          </div>
        </div>
        {/* CENTER — feature */}
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: C.dim, whiteSpace: "nowrap", textAlign: "center" }}>
          📘 Hướng dẫn sử dụng
        </div>
        {/* RIGHT — back */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/")} style={{
            background: "none", border: `1px solid ${C.border}`,
            borderRadius: "7px", padding: "0.35rem 0.9rem",
            color: C.muted, fontSize: "0.8rem", cursor: "pointer",
          }}>← Home</button>
        </div>
      </nav>

      {/* body — sidebar fixed, content scrolls */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {sidebarOpen ? (
          <div style={{ position: "relative", flexShrink: 0, display: "flex" }}>
            <Sidebar active={active} onSelect={(id) => { handleSelect(id); }} />
            <button onClick={() => setSidebarOpen(false)} title="Ẩn menu" style={{
              position: "absolute", top: "0.6rem", right: "0.4rem",
              background: "none", border: "none", color: C.muted, cursor: "pointer",
              fontSize: "0.85rem", lineHeight: 1, padding: "2px 4px",
            }}>‹</button>
          </div>
        ) : (
          <button onClick={() => setSidebarOpen(true)} title="Hiện menu" style={{
            width: "22px", flexShrink: 0,
            background: C.sidebar, borderRight: `1px solid ${C.border}`,
            border: "none", cursor: "pointer", color: C.muted, fontSize: "0.85rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>›</button>
        )}
        <div ref={contentRef} style={{ flex: 1, overflowY: "auto" }}>
          <Content navigate={navigate} />
        </div>
      </div>
    </div>
  );
}
