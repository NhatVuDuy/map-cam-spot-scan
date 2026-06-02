import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { cacheGet } from '../services/cacheService.js';

const router = Router();

function toCSV(points) {
  const header = 'id,lat,lng,category,name,distanceM,score,source\n';
  const rows = points.map((p) =>
    [p.id, p.lat, p.lng, p.category, `"${(p.name || '').replace(/"/g, '""')}"`, p.distanceM ?? '', p.score ?? '', p.source].join(','),
  );
  return header + rows.join('\n');
}

function toGeoJSON(points) {
  return JSON.stringify({
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        category: p.category,
        name: p.name || '',
        distanceM: p.distanceM,
        score: p.score,
        source: p.source,
        ...p.tags,
      },
    })),
  });
}

function toKML(points) {
  const placemarks = points
    .map(
      (p) => `  <Placemark>
    <name>${(p.name || p.category).replace(/&/g, '&amp;')}</name>
    <description>${p.category} — ${p.distanceM ?? ''}m</description>
    <Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>
  </Placemark>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
${placemarks}
</Document>
</kml>`;
}

router.get('/:format', authMiddleware, (req, res, next) => {
  const { format } = req.params;
  const { scanId } = req.query;

  if (!['csv', 'geojson', 'kml'].includes(format)) {
    return res.status(400).json({ error: 'INVALID_FORMAT', message: 'format must be csv, geojson, or kml' });
  }
  if (!scanId) {
    return res.status(400).json({ error: 'MISSING_PARAM', message: 'scanId query param required' });
  }

  const cached = cacheGet(scanId);
  if (!cached) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Scan result expired or not found' });
  }

  const points = cached.points ?? [];

  try {
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="scan-results.csv"');
      return res.send(toCSV(points));
    }
    if (format === 'geojson') {
      res.setHeader('Content-Type', 'application/geo+json');
      res.setHeader('Content-Disposition', 'attachment; filename="scan-results.geojson"');
      return res.send(toGeoJSON(points));
    }
    if (format === 'kml') {
      res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
      res.setHeader('Content-Disposition', 'attachment; filename="scan-results.kml"');
      return res.send(toKML(points));
    }
  } catch (err) {
    next(err);
  }
});

export default router;
