#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${DATA_DIR:-/data}"
OSM_FILE="${DATA_DIR}/vietnam-latest.osm.pbf"
DB_NAME="${DB_NAME:-gis}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"

# Download Vietnam OSM (~100MB, updated weekly)
if [ ! -f "$OSM_FILE" ]; then
  echo "[import-osm] Downloading vietnam-latest.osm.pbf..."
  wget -q --show-progress \
    https://download.geofabrik.de/asia/vietnam-latest.osm.pbf \
    -O "$OSM_FILE"
fi

echo "[import-osm] Importing into PostGIS ($DB_NAME)..."
osm2pgsql \
  --database "$DB_NAME" \
  --username "$DB_USER" \
  --host "$DB_HOST" \
  --hstore \
  --slim \
  --drop \
  "$OSM_FILE"

echo "[import-osm] Creating extra indexes..."
psql -d "$DB_NAME" -U "$DB_USER" -h "$DB_HOST" -c "
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osm_point_amenity
    ON planet_osm_point(amenity) WHERE amenity IS NOT NULL;
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osm_point_leisure
    ON planet_osm_point(leisure) WHERE leisure IS NOT NULL;
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osm_polygon_amenity
    ON planet_osm_polygon(amenity) WHERE amenity IS NOT NULL;
"

echo "[import-osm] Done. Runtime ~5-10 min, DB size ~2-3GB."
