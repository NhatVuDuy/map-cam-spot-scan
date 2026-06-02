import { getPool } from '../config/database.js';
import { classify } from '../algorithms/classifier.js';

const AMENITY_CATEGORIES = {
  school: ['school', 'university', 'college', 'kindergarten'],
  hospital: ['hospital', 'clinic', 'health_centre'],
  market: ['marketplace'],
  conference: ['conference_centre', 'events_venue', 'community_centre'],
  government: ['townhall', 'police', 'fire_station', 'courthouse', 'embassy'],
};

const LEISURE_CATEGORIES = { park: ['park', 'garden'] };
const TOURISM_CATEGORIES = { hotel: ['hotel', 'motel', 'hostel', 'guest_house'] };
const SHOP_CATEGORIES = { market: ['supermarket', 'mall'] };

function listForCategories(mapping, categories) {
  return categories.flatMap((c) => mapping[c] ?? []);
}

export class PostGISAdapter {
  async fetchPOI(bbox, categories, cfg = {}) {
    const pool = getPool();
    if (!pool) {
      console.warn('[PostGISAdapter] No database configured, returning [].');
      return [];
    }

    const [south, west, north, east] = bbox;
    const centerLat = (south + north) / 2;
    const centerLng = (west + east) / 2;
    const radiusM =
      Math.sqrt(((north - south) * 111_000) ** 2 + ((east - west) * 111_000) ** 2) / 2;

    const amenities = listForCategories(AMENITY_CATEGORIES, categories);
    const leisures = listForCategories(LEISURE_CATEGORIES, categories);
    const tourisms = listForCategories(TOURISM_CATEGORIES, categories);
    const shops = listForCategories(SHOP_CATEGORIES, categories);

    if (amenities.length + leisures.length + tourisms.length + shops.length === 0) return [];

    const sql = `
      SELECT
        osm_id,
        name,
        amenity, leisure, tourism, shop,
        ST_Y(ST_Transform(way, 4326)) AS lat,
        ST_X(ST_Transform(way, 4326)) AS lng,
        ST_Distance(
          way::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS distance_m
      FROM planet_osm_point
      WHERE
        ST_DWithin(
          way::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        AND (
          ($4::text[] IS NULL OR amenity = ANY($4::text[]))
          OR ($5::text[] IS NULL OR leisure = ANY($5::text[]))
          OR ($6::text[] IS NULL OR tourism = ANY($6::text[]))
          OR ($7::text[] IS NULL OR shop = ANY($7::text[]))
        )
      ORDER BY distance_m ASC
      LIMIT 500
    `;

    try {
      const result = await pool.query(sql, [
        centerLng,
        centerLat,
        radiusM,
        amenities.length ? amenities : null,
        leisures.length ? leisures : null,
        tourisms.length ? tourisms : null,
        shops.length ? shops : null,
      ]);

      return result.rows.map((row) => ({
        id: `postgis-${row.osm_id}`,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        name: row.name || '',
        tags: {
          amenity: row.amenity,
          leisure: row.leisure,
          tourism: row.tourism,
          shop: row.shop,
        },
        category: classify({
          amenity: row.amenity,
          leisure: row.leisure,
          tourism: row.tourism,
          shop: row.shop,
          name: row.name,
        }),
        distanceM: Math.round(parseFloat(row.distance_m)),
        source: 'postgis',
      }));
    } catch (err) {
      console.error('[PostGISAdapter] fetchPOI error:', err.message);
      return [];
    }
  }

  async fetchRoads(bbox, cfg = {}) {
    const pool = getPool();
    if (!pool) return [];

    const [south, west, north, east] = bbox;
    const centerLat = (south + north) / 2;
    const centerLng = (west + east) / 2;
    const radiusM =
      Math.sqrt(((north - south) * 111_000) ** 2 + ((east - west) * 111_000) ** 2) / 2;

    const sql = `
      SELECT
        osm_id,
        highway,
        ST_AsGeoJSON(ST_Transform(way, 4326))::json AS geom_json
      FROM planet_osm_line
      WHERE
        highway = ANY(ARRAY['primary','secondary','tertiary','residential','trunk','motorway'])
        AND ST_DWithin(
          way::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      LIMIT 2000
    `;

    try {
      const result = await pool.query(sql, [centerLng, centerLat, radiusM]);
      return result.rows.map((row) => ({
        id: `postgis-way-${row.osm_id}`,
        geometry: (row.geom_json?.coordinates ?? []).map(([lng, lat]) => ({ lat, lon: lng })),
        highway: row.highway,
      }));
    } catch (err) {
      console.error('[PostGISAdapter] fetchRoads error:', err.message);
      return [];
    }
  }

  async fetchIntersections(center, radiusM) {
    const pool = getPool();
    if (!pool) return [];

    const sql = `
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
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      GROUP BY n.id, n.geom
      HAVING COUNT(DISTINCT w.osm_id) >= 2
      ORDER BY way_count DESC
      LIMIT 300
    `;

    try {
      const result = await pool.query(sql, [center.lng, center.lat, radiusM]);
      return result.rows.map((row) => {
        const wayCount = parseInt(row.way_count, 10);
        return {
          id: `postgis-intersection-${row.id}`,
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          category: 'intersection',
          wayCount,
          name: wayCount >= 4 ? 'Ngã tư' : wayCount === 3 ? 'Ngã ba' : 'Giao cắt',
          distanceM: Math.round(
            Math.sqrt(
              ((row.lat - center.lat) * 111_000) ** 2 +
                ((row.lng - center.lng) * 111_000) ** 2,
            ),
          ),
          source: 'postgis',
          tags: {},
        };
      });
    } catch (err) {
      console.error('[PostGISAdapter] fetchIntersections error:', err.message);
      return [];
    }
  }
}
