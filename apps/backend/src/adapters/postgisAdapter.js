import { BaseAdapter } from "./baseAdapter.js";
import { getPool, isDbAvailable } from "../config/database.js";

const AMENITY_MAP = {
  school: ["school", "university", "college", "kindergarten"],
  hospital: ["hospital", "clinic", "health_centre"],
  market: ["marketplace"],
  conference: ["conference_centre", "events_venue", "community_centre"],
  government: ["townhall", "police", "fire_station", "courthouse", "embassy"],
};

const LEISURE_MAP = {
  park: ["park", "garden"],
};

const TOURISM_MAP = {
  hotel: ["hotel", "motel", "hostel", "guest_house"],
};

const SHOP_MAP = {
  market: ["supermarket", "mall"],
};

function buildTagLists(categories) {
  const amenity = [];
  const leisure = [];
  const tourism = [];
  const shop = [];

  for (const cat of categories) {
    if (AMENITY_MAP[cat]) amenity.push(...AMENITY_MAP[cat]);
    if (LEISURE_MAP[cat]) leisure.push(...LEISURE_MAP[cat]);
    if (TOURISM_MAP[cat]) tourism.push(...TOURISM_MAP[cat]);
    if (SHOP_MAP[cat]) shop.push(...SHOP_MAP[cat]);
  }

  return { amenity, leisure, tourism, shop };
}

function normalizeRow(row) {
  return {
    id: `postgis-${row.osm_id}`,
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
    tags: {
      amenity: row.amenity,
      leisure: row.leisure,
      tourism: row.tourism,
      shop: row.shop,
    },
    source: "postgis",
    name: row.name || "",
    distanceM: parseFloat(row.distance_m) || 0,
  };
}

export class PostGISAdapter extends BaseAdapter {
  constructor(cfg = {}) {
    super();
    // Pool is managed globally via database.js
  }

  async fetchPOI(bbox, categories, config = {}) {
    if (!isDbAvailable()) {
      console.warn("[postgis] DB unavailable — returning empty");
      return [];
    }

    const pool = getPool();
    const [south, west, north, east] = bbox;
    const centerLat = (south + north) / 2;
    const centerLng = (west + east) / 2;
    // Approximate radiusM from bbox
    const radiusM = Math.min(
      ((north - south) * 111320) / 2,
      50000
    );

    const { amenity, leisure, tourism, shop } = buildTagLists(categories);

    if (amenity.length === 0 && leisure.length === 0 && tourism.length === 0 && shop.length === 0) {
      return [];
    }

    try {
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
            ($4::text[] IS NOT NULL AND array_length($4::text[], 1) > 0 AND amenity = ANY($4::text[]))
            OR ($5::text[] IS NOT NULL AND array_length($5::text[], 1) > 0 AND leisure = ANY($5::text[]))
            OR ($6::text[] IS NOT NULL AND array_length($6::text[], 1) > 0 AND tourism = ANY($6::text[]))
            OR ($7::text[] IS NOT NULL AND array_length($7::text[], 1) > 0 AND shop = ANY($7::text[]))
          )
        ORDER BY distance_m ASC
        LIMIT 500
      `;
      const res = await pool.query(sql, [
        centerLng,
        centerLat,
        radiusM,
        amenity.length > 0 ? amenity : null,
        leisure.length > 0 ? leisure : null,
        tourism.length > 0 ? tourism : null,
        shop.length > 0 ? shop : null,
      ]);
      return res.rows.map(normalizeRow);
    } catch (err) {
      console.error("[postgis] fetchPOI error:", err.message);
      return [];
    }
  }

  async fetchRoads(bbox, config = {}) {
    if (!isDbAvailable()) {
      return [];
    }

    const pool = getPool();
    const [south, west, north, east] = bbox;
    const centerLat = (south + north) / 2;
    const centerLng = (west + east) / 2;
    const radiusM = Math.min(((north - south) * 111320) / 2, 50000);

    try {
      // Use intersection query — nodes shared by >= 2 highway ways
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
      const res = await pool.query(sql, [centerLng, centerLat, radiusM]);
      // Return as intersection points
      return res.rows.map((row) => ({
        id: `postgis-intersection-${row.id}`,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        wayCount: parseInt(row.way_count),
        category: "intersection",
        name:
          parseInt(row.way_count) >= 4
            ? "Ngã tư"
            : parseInt(row.way_count) >= 3
            ? "Ngã ba"
            : "Giao cắt",
        source: "postgis",
        tags: { highway: "intersection" },
      }));
    } catch (err) {
      console.error("[postgis] fetchRoads error:", err.message);
      return [];
    }
  }
}
