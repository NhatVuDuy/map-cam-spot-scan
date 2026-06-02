import { Router } from 'express';
import { checkDbConnection } from '../config/database.js';
import { config } from '../config/index.js';

const router = Router();

router.get('/', async (req, res) => {
  const dbAvailable = await checkDbConnection();

  const sources = [
    {
      id: 'overpass',
      label: 'OpenStreetMap (Overpass API)',
      available: true,
      description: 'Global OSM data via Overpass API. Requires internet.',
    },
    {
      id: 'goong',
      label: 'Goong Maps',
      available: !!config.goong.apiKey,
      description: 'Vietnam-focused place search via Goong Maps API.',
    },
    {
      id: 'geojson',
      label: 'Local GeoJSON File',
      available: true,
      description: 'Upload a local GeoJSON file. Processed in memory.',
    },
    {
      id: 'postgis',
      label: 'PostGIS (Local OSM Import)',
      available: dbAvailable,
      description: 'Fast spatial queries on locally imported OSM data.',
    },
  ];

  res.json({ sources });
});

export default router;
