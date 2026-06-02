# Camera Placement Scanner

Hệ thống quét bản đồ GIS để xác định vị trí lắp đặt camera giám sát tại các địa điểm công cộng.

## Quick Start

### Dev (không cần Docker)

```bash
# Backend
cd apps/backend
cp .env.example .env
npm install
npm run dev          # http://localhost:3001

# Frontend (terminal khác)
cd apps/frontend
npm install
npm run dev          # http://localhost:5173
```

### Docker Compose (full stack)

```bash
cp .env.example .env   # chỉnh DB_PASSWORD, JWT_SECRET
docker compose up --build
# → http://localhost
```

### Import OSM data (optional — cho PostGIS adapter)

```bash
docker compose exec backend sh scripts/import-osm.sh
```

## Nguồn dữ liệu

| Nguồn | Cần gì | Offline? |
|-------|--------|----------|
| Overpass API (OSM) | Kết nối internet | ✗ |
| Goong Maps | `GOONG_API_KEY` | ✗ |
| Local GeoJSON | Upload file | ✓ |
| PostGIS | Import OSM (~5 phút) | ✓ |

## API

- `POST /api/v1/scan` — quét khu vực
- `GET  /api/v1/sources` — danh sách nguồn
- `GET  /api/v1/export/:format` — xuất CSV/GeoJSON/KML
- `GET  /api/health` — health check

Xem chi tiết: [ARCHITECTURE.md](ARCHITECTURE.md)
