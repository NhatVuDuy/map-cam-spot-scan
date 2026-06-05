# Changelog

All notable changes to this project will be documented in this file.

Format: [Semantic Versioning](https://semver.org) — `MAJOR.MINOR.PATCH`

---

## [1.3.0] — 2026-06-05

### Fixed
- **Intersection detection** (ngã ba/ngã tư không hiện): tách Overpass query thành 2 block — POIs dùng `out center tags`, roads dùng `out geom tags` để có đủ tọa độ node cho node-sharing algorithm
- Thêm `living_street` và `service` vào `HIGHWAY_TYPES` để phát hiện đầu hẻm
- **Missing modules**: tạo mới `algorithms/classifier.js`, `algorithms/intersection.js`, `algorithms/spatialFilter.js`, `utils/pointInPolygon.js` — các module này bị thiếu trong build khiến intersection detection không chạy được

### Changed
- **Dữ liệu ranh giới HCM thực tế**: thay dummy GeoJSON tự tạo bằng dữ liệu từ `daohoangson/dvhcvn` — 22 đơn vị hành chính (quận + huyện) với polygon WGS84 chính xác
- Thêm script `scripts/fetch-hcm-boundaries.mjs` để cập nhật GeoJSON khi có dữ liệu mới

---

## [1.2.0] — 2026-06-05

### Added
- **Search theo ranh giới hành chính** — chọn phường/quận từ file GeoJSON thay vì nhập tọa độ thủ công
  - `BoundarySelector` component: search có fuzzy matching, normalize tiếng Việt, keyboard navigation (↑↓ Enter Esc)
  - `boundarySearch.js`: load/cache GeoJSON, score-based ranking
  - `pointInPolygon.js`: ray-casting algorithm, hỗ trợ Polygon + MultiPolygon
- **Dummy GeoJSON HCM** (`public/data/hcm-boundaries.geojson`): 33 đơn vị hành chính (7 quận + 26 phường) với tọa độ xấp xỉ, polygon có dạng tự nhiên (12–16 điểm/polygon với perturbation)
- **Scan theo polygon chính xác**: khi chọn boundary, Overpass query dùng bbox polygon làm superset, kết quả được lọc bằng point-in-polygon — không bị tràn sang đơn vị lân cận
- **Map hiển thị polygon tím** (`#A78BFA`) khi chọn boundary, ẩn radius circle; bỏ chọn → hiện lại radius
- `scanStore`: thêm `boundary` state + `setBoundary` action
- `browserScan`: thêm tham số `boundary` — nếu có polygon thì PIP filter thay vì radius filter

### Notes
- File `hcm-boundaries.geojson` là dữ liệu xấp xỉ chỉ dùng cho development. Thay bằng file GeoJSON chính thức khi có; format tương thích, không cần sửa code.
- Các đơn vị hành chính mới sau Nghị quyết 202/2025 (63→34 tỉnh) chưa được phản ánh do chưa có dữ liệu GIS công bố chính thức.

---

## [1.1.0] — 2026-06-05

### Added
- **Search theo tên địa danh** (Nominatim API) — tìm tỉnh/quận/phường bằng tên tiếng Việt
  - `AdminSearch` component: autocomplete, debounce 380ms, AbortController, keyboard navigation
  - `nominatim.js`: query Nominatim `countrycodes=vn`, parse `boundingbox` → tâm + bán kính tự động
  - Cảnh báo `⚠ ≥15km` khi vùng quá lớn (toàn tỉnh/thành phố)
  - Badge applied hiển thị tên + bán kính sau khi chọn
- `Sidebar`: thêm section "Khu vực quét" với AdminSearch + divider "hoặc nhập thủ công"

---

## [1.0.0] — 2026-06-05

### Added
- **Scan POI** hoàn toàn trên browser — không cần backend, không cần server
  - `browserScan.js`: build Overpass QL từ categories, gọi API với 3-endpoint fallback
  - `classifier.js`: map OSM tags → category + nhận diện tên tiếng Việt
  - `intersection.js`: phát hiện giao lộ bằng node-sharing algorithm O(n)
  - `spatialFilter.js`: lọc bán kính haversine, dedup 20m, scoring
- **Map** (MapLibre GL JS)
  - Vùng scan: circle xanh `#38BDF8` với fill + border rõ ràng
  - Markers theo category với màu riêng + halo glow
  - Draggable center marker — kéo để đổi tâm, cập nhật sidebar realtime
  - Nút `⊙` "Về vùng đang chọn"
  - Click marker → popup; click row bảng → highlight vàng `#FACC15` + flyTo
- **ResultsTable**: click row để chọn/bỏ chọn, highlight selected row
- **Export** CSV / GeoJSON hoàn toàn client-side
- **GitHub Pages deploy** workflow (Vite build → `gh-pages` artifact)
- **Categories**: intersection, school, hospital, park, market, hotel, conference, government
- **Docker Compose** stack: backend (Node/Express) + frontend (React/Vite) + PostGIS
- **Backend API** (Node.js/Express): `/api/v1/scan`, `/api/v1/sources`, `/api/v1/export/:format`, `/api/health`
- Adapters: Overpass, Goong Maps, GeoJSON (in-memory), PostGIS (graceful degrade)

---

## [Unreleased]

### Planned
- Upload file GeoJSON ranh giới tùy chỉnh (thay thế dummy HCM data)
- Dữ liệu GIS chính thức sau sáp nhập hành chính 2025 khi được công bố
- Xem chi tiết điểm trong panel riêng (thay popup)
- Lọc kết quả theo khoảng cách / score
