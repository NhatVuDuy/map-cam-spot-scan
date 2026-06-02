# Camera Placement Scanner — Software Architecture Document

**Version:** 1.0.0  
**Status:** Design · Ready for Implementation  
**Standard:** ISO/IEC 25010, 12-Factor App, OWASP Top 10, OpenAPI 3.1

-----

## 1. Executive Summary

Hệ thống quét bản đồ GIS để xác định vị trí lắp đặt camera giám sát tại các địa điểm công cộng (giao lộ, trường học, bệnh viện, công viên, v.v.). Hỗ trợ nhiều nguồn dữ liệu bản đồ, xử lý thuật toán spatial thuần túy, không phụ thuộc AI runtime.

**Core principle:** Data-source agnostic · No AI at runtime · Spatial algorithms only · Offline-capable

-----

## 2. System Context (C4 Level 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL ACTORS                          │
│                                                                 │
│  [Operator]          [Admin]           [GIS Data Sources]       │
│  - Quét khu vực      - Quản lý hệ thống  - Overpass API (OSM)  │
│  - Xem bản đồ        - Export data        - Goong Maps API      │
│  - Lọc địa điểm      - Cấu hình nguồn     - Local .osm.pbf     │
│                                           - Local .geojson      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│               CAMERA PLACEMENT SCANNER SYSTEM                   │
│                                                                 │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│   │   Frontend   │────▶│   Backend    │────▶│  PostGIS DB  │   │
│   │  React/Vite  │     │  Node/Express│     │  + OSM data  │   │
│   └──────────────┘     └──────────────┘     └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

-----

## 3. Architecture Style

|Concern       |Decision                                       |Rationale                                      |
|--------------|-----------------------------------------------|-----------------------------------------------|
|Style         |**Modular Monolith** (monorepo)                |Dễ deploy, đủ scale cho dự án vừa              |
|API           |**REST + OpenAPI 3.1**                         |Tooling phong phú, dễ mock                     |
|Data pipeline |**Adapter Pattern**                            |Swap data source không ảnh hưởng business logic|
|Spatial engine|**PostGIS** (primary) + **Turf.js** (in-memory)|PostGIS cho file lớn, Turf cho GeoJSON nhỏ     |
|Frontend      |**React 18 + Vite 5**                          |HMR nhanh, bundle tối ưu                       |
|Map render    |**MapLibre GL JS**                             |Open source, offline tile support              |
|Auth          |**JWT + API Key**                              |Stateless, phù hợp multi-client                |
|Container     |**Docker Compose**                             |Dev/prod parity                                |

-----

## 4. Project Structure (Monorepo)

```
camera-scanner/
│
├── apps/
│   ├── backend/                        # Node.js API server
│   │   ├── src/
│   │   │   ├── server.js               # Express entry point
│   │   │   ├── config/
│   │   │   │   ├── index.js            # Env-based config (dotenv)
│   │   │   │   └── database.js         # PostGIS pool setup
│   │   │   │
│   │   │   ├── adapters/               # Data source adapters (Adapter Pattern)
│   │   │   │   ├── index.js            # Adapter factory / registry
│   │   │   │   ├── overpassAdapter.js  # Overpass API → normalize
│   │   │   │   ├── goongAdapter.js     # Goong Maps API → normalize
│   │   │   │   ├── geojsonAdapter.js   # GeoJSON file → normalize
│   │   │   │   └── postgisAdapter.js   # PostGIS spatial query → normalize
│   │   │   │
│   │   │   ├── algorithms/             # Pure spatial algorithms (no I/O)
│   │   │   │   ├── geo.js              # BBox, haversine, coordinate transforms
│   │   │   │   ├── intersection.js     # Road intersection detection
│   │   │   │   ├── classifier.js       # OSM/GeoJSON tag → category mapping
│   │   │   │   └── spatialFilter.js    # Point-in-radius, dedup, scoring
│   │   │   │
│   │   │   ├── routes/
│   │   │   │   ├── scan.js             # POST /api/v1/scan
│   │   │   │   ├── sources.js          # GET  /api/v1/sources
│   │   │   │   ├── export.js           # GET  /api/v1/export/:format
│   │   │   │   └── health.js           # GET  /api/health
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── auth.js             # JWT / API key validation
│   │   │   │   ├── validate.js         # Zod schema validation
│   │   │   │   ├── rateLimit.js        # express-rate-limit
│   │   │   │   └── errorHandler.js     # Global error handler
│   │   │   │
│   │   │   └── services/
│   │   │       ├── scanService.js      # Orchestrates adapter + algorithm
│   │   │       └── cacheService.js     # Node-cache (in-memory TTL cache)
│   │   │
│   │   ├── scripts/
│   │   │   └── import-osm.sh           # osm2pgsql import script
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   └── frontend/                       # React SPA
│       ├── src/
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   │
│       │   ├── pages/
│       │   │   ├── Scanner.jsx         # Main scanner page
│       │   │   └── NotFound.jsx
│       │   │
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── Header.jsx
│       │   │   │   └── Sidebar.jsx
│       │   │   ├── scanner/
│       │   │   │   ├── SourceSelector.jsx   # Chọn nguồn data
│       │   │   │   ├── AreaSelector.jsx     # Tọa độ + bán kính
│       │   │   │   ├── CategoryFilter.jsx   # Checkbox loại địa điểm
│       │   │   │   ├── ScanButton.jsx       # Trigger + progress
│       │   │   │   └── ResultsTable.jsx     # Danh sách kết quả
│       │   │   └── map/
│       │   │       ├── MapView.jsx          # MapLibre GL container
│       │   │       ├── PointLayer.jsx       # Camera point markers
│       │   │       ├── RadiusLayer.jsx      # Scan radius circle
│       │   │       ├── RoadLayer.jsx        # Road network overlay
│       │   │       └── Legend.jsx           # Category legend
│       │   │
│       │   ├── hooks/
│       │   │   ├── useScanner.js       # Scan state machine
│       │   │   ├── useMap.js           # MapLibre instance ref
│       │   │   └── useExport.js        # CSV/GeoJSON export
│       │   │
│       │   ├── services/
│       │   │   └── api.js              # Axios client + interceptors
│       │   │
│       │   ├── store/
│       │   │   └── scanStore.js        # Zustand global state
│       │   │
│       │   └── utils/
│       │       ├── categories.js       # Category config (label, color, icon)
│       │       └── geo.js              # Client-side geo helpers
│       │
│       ├── public/
│       │   └── tiles/                  # (optional) Local map tiles
│       ├── package.json
│       ├── vite.config.js
│       └── Dockerfile
│
├── data/                               # GIS data (gitignored)
│   ├── vietnam-latest.osm.pbf          # Download từ Geofabrik
│   └── sample/
│       └── hcm-sample.geojson          # Sample data để dev/test
│
├── docs/
│   ├── ARCHITECTURE.md                 # File này
│   ├── API.md                          # OpenAPI spec (human-readable)
│   ├── DATA_SOURCES.md                 # Hướng dẫn từng nguồn data
│   └── DEPLOYMENT.md                   # Deploy guide
│
├── docker-compose.yml                  # Full stack (backend + frontend + db)
├── docker-compose.dev.yml              # Dev override (hot reload, no nginx)
├── .env.example
└── README.md
```

-----

## 5. Data Flow (Request Lifecycle)

```
[Browser]
    │
    │ POST /api/v1/scan
    │ { sourceId, sourceConfig, lat, lng, radiusM, categories }
    ▼
[validate.js middleware]          ← Zod schema validation
    │ valid request
    ▼
[auth.js middleware]              ← JWT / API key check
    │ authorized
    ▼
[scanService.js]
    │
    ├─ cacheService.check(cacheKey)  → HIT → return cached result
    │
    └─ MISS:
        │
        ├─ adapterFactory(sourceId)   → picks correct adapter
        │       │
        │       ├─ overpassAdapter    → HTTP POST Overpass QL → raw OSM JSON
        │       ├─ goongAdapter       → HTTP GET Goong NearbySearch → raw JSON
        │       ├─ geojsonAdapter     → parse uploaded GeoJSON in-memory
        │       └─ postgisAdapter     → SQL ST_DWithin query → GeoJSON rows
        │
        │   rawFeatures[]
        │
        ├─ classifier.classify(rawFeatures)
        │       → maps OSM tags / GeoJSON props → category enum
        │
        ├─ spatialFilter.withinRadius(features, center, radiusM)
        │       → haversine filter, remove duplicates
        │
        ├─ intersection.detect(roadWays, center, radiusM)    [if requested]
        │       → node-sharing algorithm → giao lộ points
        │
        ├─ cacheService.set(cacheKey, result, TTL=300s)
        │
        └─ return NormalizedResult { points[], meta{} }
    │
    ▼
[Browser]
    │
    ├─ MapLibre GL renders point layers
    ├─ ResultsTable renders list
    └─ Legend shows stats
```

-----

## 6. API Contract (OpenAPI 3.1)

### POST /api/v1/scan

**Request body:**

```json
{
  "source": {
    "id": "overpass | goong | geojson | postgis",
    "config": {
      "endpoint": "https://overpass-api.de/api/interpreter",
      "apiKey": "optional-for-goong"
    }
  },
  "area": {
    "lat": 10.7726,
    "lng": 106.6770,
    "radiusM": 1000
  },
  "categories": ["intersection", "park", "school", "conference", "hotel", "hospital", "market", "government"],
  "options": {
    "maxResults": 500,
    "includeRoads": true
  }
}
```

**Response 200:**

```json
{
  "meta": {
    "source": "overpass",
    "durationMs": 1240,
    "bbox": [10.7636, 106.6680, 10.7816, 106.6860],
    "totalFound": 47,
    "byCategory": {
      "intersection": 18,
      "school": 12,
      "park": 5,
      "hospital": 3,
      "market": 6,
      "government": 3
    }
  },
  "points": [
    {
      "id": "osm-node-123456",
      "lat": 10.7748,
      "lng": 106.6792,
      "category": "school",
      "name": "Trường THCS Hoà Hưng",
      "distanceM": 245,
      "source": "osm",
      "tags": { "amenity": "school" }
    }
  ],
  "roads": [
    {
      "id": "osm-way-789",
      "geometry": [[106.677, 10.772], [106.679, 10.774]],
      "highway": "primary"
    }
  ]
}
```

**Response 400 (validation error):**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "radiusM must be between 100 and 15000",
  "field": "area.radiusM"
}
```

### GET /api/v1/sources

Trả về danh sách nguồn data có sẵn + trạng thái (PostGIS available hay không).

### GET /api/v1/export/:format

`format`: `csv` | `geojson` | `kml`  
Query params: `scanId` (từ scan response meta)

### GET /api/health

```json
{ "status": "ok", "db": "connected", "version": "1.0.0" }
```

-----

## 7. Adapter Specification

Mỗi adapter implement interface sau:

```javascript
// adapters/index.js — interface contract
class BaseAdapter {
  // Trả về mảng RawFeature[]
  // Không throw nếu không có data — trả [] và log warning
  async fetchPOI(bbox, categories, config) { throw new Error("Not implemented"); }
  async fetchRoads(bbox, config) { throw new Error("Not implemented"); }
}
```

### 7a. Overpass Adapter

```
Input:  bbox[4], categories[], config.endpoint?
Method: HTTP POST application/x-www-form-urlencoded
Query:  Overpass QL (dynamic build từ categories)
Output: elements[] → filter node/way with center → RawFeature[]
Error:  Retry 3 lần với exponential backoff, fallback endpoint list
```

**Overpass QL template:**

```
[out:json][timeout:30];
(
  node["amenity"~"school|university"](bbox);
  way["amenity"~"school|university"](bbox);
  ...
);
out center tags;
```

### 7b. Goong Adapter

```
Input:  center{lat,lng}, radiusM, categories[], config.apiKey
Method: GET https://rsapi.goong.io/Place/nearbysearch
        ?location={lat},{lng}&radius={r}&type={goong_type}&api_key={key}
Mapping:
  school     → type=school
  hotel      → type=lodging
  hospital   → type=hospital
  market     → type=supermarket
  government → type=local_government_office
  park       → type=park
  conference → type=establishment (+ keyword filter)
Output: result[] → map geometry.location → RawFeature[]
Note:   Goong không hỗ trợ intersection → skip, warn
```

### 7c. GeoJSON Adapter

```
Input:  geojsonData (đã parse), bbox, categories[]
Method: In-memory, synchronous
Steps:
  1. Iterate features[]
  2. Point → use coordinates directly
  3. Polygon/MultiPolygon → compute centroid
  4. LineString → collect as road for intersection algorithm
  5. classifyGeoJSON(properties) → category
  6. Filter by bbox
Output: RawFeature[] (instant, no I/O)
```

**GeoJSON property classification priority:**

```
1. properties.amenity / leisure / tourism / shop  (OSM-style GeoJSON)
2. properties.type / properties.category          (custom schema)
3. properties.name / properties.ten               (Vietnamese name matching)
   - "trường", "đại học", "học viện" → school
   - "bệnh viện", "phòng khám"       → hospital
   - "chợ", "siêu thị"               → market
   - "công viên"                     → park
   - "khách sạn", "hotel"            → hotel
   - "ủy ban", "công an", "tòa án"   → government
   - "hội nghị", "trung tâm"         → conference
```

### 7d. PostGIS Adapter

```
Input:  bbox, categories[], PostGIS connection pool
Method: SQL via pg driver
Table:  planet_osm_point, planet_osm_polygon (from osm2pgsql)
```

**SQL template:**

```sql
SELECT
  osm_id,
  name,
  amenity, leisure, tourism, shop,
  ST_Y(ST_Transform(way, 4326)) AS lat,
  ST_X(ST_Transform(way, 4326)) AS lng,
  ST_Distance(
    way::geography,
    ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography
  ) AS distance_m
FROM planet_osm_point
WHERE
  ST_DWithin(
    way::geography,
    ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
    $radiusM
  )
  AND (
    amenity = ANY($amenity_list)
    OR leisure = ANY($leisure_list)
    OR tourism = ANY($tourism_list)
    OR shop = ANY($shop_list)
  )
ORDER BY distance_m ASC
LIMIT 500;
```

**Intersection query:**

```sql
-- Nodes thuộc >= 2 ways với highway tag
SELECT
  n.id,
  ST_Y(n.geom) AS lat,
  ST_X(n.geom) AS lng,
  COUNT(DISTINCT w.osm_id) AS way_count
FROM
  planet_osm_ways w
  JOIN LATERAL unnest(w.nodes) AS node_id ON true
  JOIN planet_osm_nodes n ON n.id = node_id
WHERE
  w.tags->'highway' = ANY(ARRAY['primary','secondary','tertiary','residential','trunk'])
  AND ST_DWithin(
    n.geom::geography,
    ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
    $radiusM
  )
GROUP BY n.id, n.geom
HAVING COUNT(DISTINCT w.osm_id) >= 2
ORDER BY way_count DESC
LIMIT 300;
```

-----

## 8. Algorithm Specification

### 8a. geo.js — Pure geodetic functions

```javascript
getBBox(lat, lng, radiusM)
  → [south, west, north, east]
  // Công thức: dLat = r/R * (180/π), dLng = r/(R*cos(lat)) * (180/π)

haversine(lat1, lon1, lat2, lon2)
  → distanceMetres (number)
  // Công thức Haversine chuẩn, R = 6,371,000m

toXY(lat, lng, bbox, canvasW, canvasH)
  → {x, y}  // Dùng cho SVG/Canvas render nếu không dùng MapLibre
```

### 8b. intersection.js — Giao lộ detection

```
Input:  ways[] (mỗi way có geometry[]: [{lat, lon}])
        center{lat, lng}, radiusM

Algorithm:
  1. Tạo nodeMap: Map<coordKey, {lat, lng, wayIds: Set}>
     - coordKey = "${lat.toFixed(5)},${lon.toFixed(5)}"  (độ chính xác ~1m)
     - Mỗi node track danh sách wayId chứa nó
  
  2. Filter: chỉ giữ node có wayIds.size >= 2
     → Đây là điểm giao nhau của ít nhất 2 đường
  
  3. Filter: haversine(center, node) <= radiusM
  
  4. Score: wayIds.size >= 4 → ngã tư; >= 3 → ngã ba; = 2 → giao cắt
  
Output: IntersectionPoint[]
  { lat, lng, category:"intersection", wayCount, name:"Ngã tư/ba/...", distanceM }

Complexity: O(n) nodes, O(1) per node lookup
Cap: 300 results (performance guard)
```

### 8c. classifier.js — Tag → Category mapping

```javascript
// OSM tag mapping (priority order)
const OSM_MAP = {
  amenity: {
    school: "school", university: "school", college: "school", kindergarten: "school",
    hospital: "hospital", clinic: "hospital",
    marketplace: "market",
    conference_centre: "conference", events_venue: "conference", community_centre: "conference",
    townhall: "government", police: "government", fire_station: "government",
    courthouse: "government", embassy: "government",
  },
  leisure: { park: "park", garden: "park" },
  tourism: { hotel: "hotel", motel: "hotel", hostel: "hotel", guest_house: "hotel" },
  shop: { supermarket: "market", mall: "market" },
};

// Vietnamese name matching (fallback)
const VN_NAME_PATTERNS = [
  { pattern: /trường|đại học|học viện|cao đẳng/i, category: "school" },
  { pattern: /bệnh viện|phòng khám|y tế/i,        category: "hospital" },
  { pattern: /chợ|siêu thị|co\.?op|vinmart/i,      category: "market" },
  { pattern: /công viên|vườn hoa/i,               category: "park" },
  { pattern: /khách sạn|hotel|resort/i,            category: "hotel" },
  { pattern: /ủy ban|ubnd|công an|tòa án/i,        category: "government" },
  { pattern: /hội nghị|trung tâm hội|convention/i, category: "conference" },
];
```

### 8d. spatialFilter.js

```javascript
withinRadius(points[], center, radiusM)
  → filtered points with distanceM added

deduplicatePoints(points[], thresholdM = 20)
  // Loại bỏ điểm trùng lắp trong vòng 20m
  // Algorithm: sort by lat, sliding window check

scorePoints(points[])
  // Tính điểm ưu tiên lắp camera:
  // intersection + wayCount >= 4: +10 (ngã tư lớn)
  // hospital + park combo nearby: +5 (khu vực đông)
  // distance < 200m từ center: +3 (trung tâm)
  → points[] sorted by score desc
```

-----

## 9. Database Schema

```sql
-- Tạo bởi osm2pgsql, không cần tạo thủ công
-- Chạy: osm2pgsql -d gis -U postgres vietnam-latest.osm.pbf

-- Các bảng chính sẽ được tạo:
-- planet_osm_point   — nodes có tags (POI)
-- planet_osm_line    — ways là đường
-- planet_osm_polygon — ways là khu vực (công viên, trường...)
-- planet_osm_roads   — đường được tối ưu cho routing

-- Index quan trọng (tự động tạo):
-- planet_osm_point(way)    GIST index
-- planet_osm_polygon(way)  GIST index

-- Bảng cache kết quả scan (tùy chọn)
CREATE TABLE scan_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   VARCHAR(20) NOT NULL,
  bbox        FLOAT8[4]   NOT NULL,
  categories  TEXT[]      NOT NULL,
  result_json JSONB       NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX ON scan_results(expires_at);
```

-----

## 10. Frontend Architecture

### State Management (Zustand)

```javascript
// store/scanStore.js
{
  // Input
  source: { id, config },
  area: { lat, lng, radiusM },
  categories: [],

  // Results
  points: [],
  roads: [],
  bbox: null,
  stats: {},        // { category: count }

  // UI
  loading: false,
  progress: "",
  error: null,
  filter: null,     // active category filter
  hoveredPoint: null,

  // Actions
  setSource, setArea, setCategories,
  runScan, resetResults,
  setFilter, setHoveredPoint,
}
```

### MapLibre GL Setup

```javascript
// components/map/MapView.jsx
// Map style: MapTiler / OpenMapTiles (self-hosted) hoặc blank dark style
// Tile source: tùy chọn local tiles hoặc public

// Layers (thứ tự render):
// 1. Background tiles (OSM raster hoặc vector)
// 2. RoadLayer     — LineString từ scan result
// 3. RadiusLayer   — Circle GeoJSON
// 4. PointLayer    — CircleLayer per category, color từ CATEGORIES config
// 5. LabelLayer    — Symbol layer, hiện name khi zoom >= 14
```

### Component Data Flow

```
App
 └── Scanner (page)
      ├── Sidebar
      │    ├── SourceSelector    → store.setSource()
      │    ├── AreaSelector      → store.setArea()
      │    ├── CategoryFilter    → store.setCategories()
      │    └── ScanButton        → store.runScan() → api.post('/scan')
      │
      └── MainContent
           ├── MapView           ← store.points, store.roads, store.bbox
           │    ├── RoadLayer
           │    ├── RadiusLayer
           │    ├── PointLayer   ← store.filter (opacity)
           │    └── Legend       → store.setFilter()
           │
           └── ResultsTable      ← store.points filtered by store.filter
                                 → ExportButton → /api/v1/export
```

-----

## 11. Environment Variables

```bash
# apps/backend/.env.example

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database (PostGIS — optional, dùng nếu có osm.pbf)
DATABASE_URL=postgresql://postgres:password@localhost:5432/gis
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Auth (optional — bỏ qua nếu dùng nội bộ)
JWT_SECRET=change-me-in-production
API_KEY_HEADER=X-API-Key

# External APIs (optional)
GOONG_API_KEY=

# Overpass
OVERPASS_ENDPOINTS=https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter
OVERPASS_TIMEOUT_MS=35000

# Cache
CACHE_TTL_SECONDS=300
```

-----

## 12. Docker Compose

```yaml
# docker-compose.yml
version: "3.9"

services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: gis
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./data:/data:ro          # mount OSM files
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s

  backend:
    build: ./apps/backend
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/gis
      PORT: 3001
    ports:
      - "3001:3001"
    volumes:
      - ./data:/data:ro          # cho geojson upload & osm files

  frontend:
    build: ./apps/frontend
    depends_on:
      - backend
    ports:
      - "80:80"                  # Nginx serve + proxy /api

volumes:
  pgdata:
```

-----

## 13. OSM Data Import

```bash
# scripts/import-osm.sh

# 1. Download Vietnam OSM (~ 100MB, cập nhật hằng tuần)
wget https://download.geofabrik.de/asia/vietnam-latest.osm.pbf -O data/vietnam-latest.osm.pbf

# 2. Import vào PostGIS
osm2pgsql \
  --database gis \
  --username postgres \
  --host localhost \
  --hstore \            # lưu tất cả tags vào cột hstore
  --slim \              # dùng ít RAM hơn
  --drop \              # xóa temp tables sau import
  data/vietnam-latest.osm.pbf

# 3. Tạo index bổ sung
psql -d gis -U postgres -c "
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osm_point_amenity
    ON planet_osm_point(amenity) WHERE amenity IS NOT NULL;
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osm_point_leisure
    ON planet_osm_point(leisure) WHERE leisure IS NOT NULL;
"

# Runtime: ~5-10 phút. Dung lượng DB: ~2-3GB
```

-----

## 14. Category Config (Single Source of Truth)

```javascript
// Dùng chung giữa backend và frontend (package shared hoặc copy)
export const CATEGORIES = {
  intersection: {
    label: "Ngã tư / Ngã ba",
    osmTags: { highway: ["primary","secondary","tertiary","residential","trunk"] },
    color: "#FF6B6B",
    icon: "intersection",
    priority: 1,
  },
  school: {
    label: "Trường học",
    osmTags: { amenity: ["school","university","college","kindergarten"] },
    color: "#339AF0",
    icon: "school",
    priority: 2,
  },
  hospital: {
    label: "Bệnh viện",
    osmTags: { amenity: ["hospital","clinic","health_centre"] },
    color: "#FF8787",
    icon: "hospital",
    priority: 2,
  },
  park: {
    label: "Công viên",
    osmTags: { leisure: ["park","garden"] },
    color: "#51CF66",
    icon: "park",
    priority: 3,
  },
  market: {
    label: "Chợ / Siêu thị",
    osmTags: { amenity: ["marketplace"], shop: ["supermarket","mall"] },
    color: "#22D3EE",
    icon: "market",
    priority: 3,
  },
  hotel: {
    label: "Khách sạn",
    osmTags: { tourism: ["hotel","motel","hostel","guest_house"] },
    color: "#FCC419",
    icon: "hotel",
    priority: 4,
  },
  conference: {
    label: "Hội nghị / Sự kiện",
    osmTags: { amenity: ["conference_centre","events_venue","community_centre"] },
    color: "#CC5DE8",
    icon: "conference",
    priority: 4,
  },
  government: {
    label: "Cơ quan hành chính",
    osmTags: { amenity: ["townhall","police","fire_station","courthouse","embassy"] },
    color: "#A8B2C1",
    icon: "government",
    priority: 5,
  },
};
```

-----

## 15. Tech Stack Summary

|Layer              |Package             |Version |Lý do chọn                   |
|-------------------|--------------------|--------|-----------------------------|
|Backend runtime    |Node.js             |20 LTS  |Stable, ESM native           |
|Web framework      |Express             |4.x     |Minimal, production-proven   |
|Validation         |Zod                 |3.x     |Type-safe, good errors       |
|DB client          |pg (node-postgres)  |8.x     |PostgreSQL native            |
|HTTP client        |node-fetch          |3.x     |ESM, fetch spec compliant    |
|Rate limiting      |express-rate-limit  |7.x     |Simple, memory-based         |
|Cache              |node-cache          |5.x     |TTL cache, no Redis needed   |
|Frontend framework |React               |18      |                             |
|Build tool         |Vite                |5       |HMR nhanh                    |
|State management   |Zustand             |4.x     |Nhẹ, không boilerplate       |
|Map rendering      |MapLibre GL JS      |4.x     |OSS, offline capable         |
|HTTP client (FE)   |Axios               |1.x     |Interceptors, cancel tokens  |
|Spatial (in-memory)|Turf.js             |6.x     |Fallback khi không có PostGIS|
|Database           |PostgreSQL + PostGIS|16 + 3.4|Spatial query chuẩn          |
|Container          |Docker + Compose    |24 + 2.x|                             |
|Reverse proxy      |Nginx               |alpine  |Static serve + API proxy     |

-----

## 16. Implementation Notes cho AI Code Agent

Khi implement, agent cần lưu ý:

1. **Adapter pattern nghiêm ngặt** — `scanService.js` chỉ gọi `adapter.fetchPOI()` và `adapter.fetchRoads()`, không biết gì về HTTP hay SQL bên trong adapter.
1. **Algorithms không có side effect** — tất cả hàm trong `algorithms/` là pure function, không import fs/http/pg, dễ unit test.
1. **GeoJSON adapter chạy đồng bộ** — không cần async vì xử lý in-memory. Overpass/Goong/PostGIS là async.
1. **Frontend không gọi Overpass trực tiếp** — mọi request đều qua backend để tránh CORS và để cache.
1. **MapLibre thay SVG** — không dùng SVG tự vẽ. MapLibre xử lý tile, zoom, pan, layer.
1. **Shared category config** — tạo `packages/shared/categories.js` hoặc copy thủ công. Không để config duplicate giữa FE và BE.
1. **Error boundary** — wrap `<MapView>` trong React Error Boundary riêng, lỗi map không crash cả app.
1. **osm2pgsql optional** — PostGIS adapter phải gracefully degrade nếu DB không có data (trả `[]` thay vì crash).