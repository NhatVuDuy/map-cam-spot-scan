#!/usr/bin/env bash
# Import Vietnam OSM data into PostGIS using osm2pgsql.
# Usage: ./scripts/import-osm.sh
set -euo pipefail

DATA_DIR="${DATA_DIR:-./data}"
OSM_FILE="${OSM_FILE:-${DATA_DIR}/vietnam-latest.osm.pbf}"
DB_NAME="${DB_NAME:-gis}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "=== Camera Placement Scanner — OSM Import ==="

# 1. Download Vietnam OSM if not present
if [ ! -f "${OSM_FILE}" ]; then
  echo "[1/3] Downloading Vietnam OSM (~100MB)..."
  mkdir -p "${DATA_DIR}"
  wget -q --show-progress \
    https://download.geofabrik.de/asia/vietnam-latest.osm.pbf \
    -O "${OSM_FILE}"
else
  echo "[1/3] OSM file already exists: ${OSM_FILE}"
fi

# 2. Import into PostGIS
echo "[2/3] Importing into PostGIS database '${DB_NAME}'..."
osm2pgsql \
  --database "${DB_NAME}" \
  --username "${DB_USER}" \
  --host "${DB_HOST}" \
  --port "${DB_PORT}" \
  --hstore \
  --slim \
  --drop \
  "${OSM_FILE}"

echo "[2/3] Import complete."

# 3. Create additional indexes
echo "[3/3] Creating additional indexes..."
psql -d "${DB_NAME}" -U "${DB_USER}" -h "${DB_HOST}" -p "${DB_PORT}" -c "
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osm_point_amenity
    ON planet_osm_point(amenity) WHERE amenity IS NOT NULL;
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osm_point_leisure
    ON planet_osm_point(leisure) WHERE leisure IS NOT NULL;
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osm_point_tourism
    ON planet_osm_point(tourism) WHERE tourism IS NOT NULL;
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osm_point_shop
    ON planet_osm_point(shop) WHERE shop IS NOT NULL;
"

echo "[3/3] Indexes created."
echo ""
echo "=== Import complete. Runtime: ~5-10 minutes for Vietnam dataset. ==="
echo "Database size: ~2-3GB"
