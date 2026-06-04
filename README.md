# Camera Placement Scanner

A GIS map scanner to find optimal camera installation spots — intersections, schools, hospitals, parks, markets, hotels, conference venues, and government offices.

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Node.js 20 (for local dev)

### 1. Clone & configure
```bash
cp .env.example .env
# Edit .env — set DB_PASSWORD, JWT_SECRET, GOONG_API_KEY (optional)
```

### 2. Run with Docker Compose
```bash
docker-compose up --build
```

- Frontend: http://localhost
- Backend API: http://localhost:3001
- Database: localhost:5432

### 3. Local development (hot reload)
```bash
# Install dependencies
npm install

# Start both backend and frontend with hot reload
npm run dev
```

Or use docker-compose.dev.yml:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### 4. Import OSM data (optional — for PostGIS source)
```bash
# Download Vietnam OSM data (~100MB)
wget https://download.geofabrik.de/asia/vietnam-latest.osm.pbf -O data/vietnam-latest.osm.pbf

# Import into PostGIS (requires osm2pgsql)
bash apps/backend/scripts/import-osm.sh
```

## Data Sources

| Source    | Description                         | Config required          |
|-----------|-------------------------------------|--------------------------|
| overpass  | OpenStreetMap via Overpass API      | None (uses public endpoint) |
| goong     | Goong Maps NearbySearch API         | `GOONG_API_KEY`          |
| geojson   | Upload local .geojson file          | Provide geojsonData      |
| postgis   | Local PostGIS DB with OSM import    | `DATABASE_URL`           |

## API

`POST /api/v1/scan` — Run a scan  
`GET /api/v1/sources` — List available data sources  
`GET /api/v1/export/:format` — Export results (csv/geojson/kml)  
`GET /api/health` — Health check

See [docs/ARCHITECTURE.md](ARCHITECTURE.md) for full API spec.

## Sample Data

A sample GeoJSON file is included at `data/sample/hcm-sample.geojson` with ~10 features around Ho Chi Minh City for development/testing.
