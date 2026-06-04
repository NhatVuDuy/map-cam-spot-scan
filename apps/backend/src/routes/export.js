import { Router } from "express";
import { cacheGet } from "../services/cacheService.js";

const router = Router();

/**
 * Convert points array to CSV string.
 */
function toCSV(points) {
  const headers = ["id", "lat", "lng", "category", "name", "distanceM", "source", "score"];
  const rows = points.map((p) =>
    headers.map((h) => {
      const val = p[h] ?? "";
      return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

/**
 * Convert points to GeoJSON FeatureCollection.
 */
function toGeoJSON(points) {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        category: p.category,
        name: p.name,
        distanceM: p.distanceM,
        source: p.source,
        score: p.score,
        ...p.tags,
      },
    })),
  };
}

/**
 * Convert points to KML string.
 */
function toKML(points) {
  const placemarks = points
    .map(
      (p) => `
  <Placemark>
    <name>${escapeXml(p.name || p.id)}</name>
    <description>${escapeXml(p.category)} — ${p.distanceM}m</description>
    <Point>
      <coordinates>${p.lng},${p.lat},0</coordinates>
    </Point>
  </Placemark>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Camera Placement Scan</name>${placemarks}
  </Document>
</kml>`;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * GET /api/v1/export/:format
 * Query params: scanId (optional, for cached scan lookup)
 *
 * If no scanId, returns empty export as placeholder.
 */
router.get("/:format", (req, res, next) => {
  const { format } = req.params;
  const { scanId } = req.query;

  if (!["csv", "geojson", "kml"].includes(format)) {
    return res.status(400).json({
      error: "INVALID_FORMAT",
      message: "Format must be csv, geojson, or kml",
    });
  }

  // Try to retrieve points from cache via scanId
  let points = [];
  if (scanId) {
    // scanId format: scan-{timestamp}-{random}
    // We store results by cacheKey, not scanId directly.
    // For simplicity, accept scanId as cache lookup key
    const cached = cacheGet(scanId);
    if (cached?.points) points = cached.points;
  }

  try {
    switch (format) {
      case "csv": {
        const csv = toCSV(points);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="scan-results.csv"');
        return res.send(csv);
      }
      case "geojson": {
        const geojson = toGeoJSON(points);
        res.setHeader("Content-Type", "application/geo+json");
        res.setHeader("Content-Disposition", 'attachment; filename="scan-results.geojson"');
        return res.json(geojson);
      }
      case "kml": {
        const kml = toKML(points);
        res.setHeader("Content-Type", "application/vnd.google-earth.kml+xml");
        res.setHeader("Content-Disposition", 'attachment; filename="scan-results.kml"');
        return res.send(kml);
      }
    }
  } catch (err) {
    next(err);
  }
});

export default router;
