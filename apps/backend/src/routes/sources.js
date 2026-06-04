import { Router } from "express";
import { isDbAvailable } from "../config/database.js";
import { config } from "../config/index.js";

const router = Router();

/**
 * GET /api/v1/sources
 * Returns available data sources and their status.
 */
router.get("/", (req, res) => {
  const sources = [
    {
      id: "overpass",
      name: "OpenStreetMap (Overpass API)",
      description: "Real-time OSM data via Overpass API. Requires internet access.",
      available: true,
      requiresConfig: false,
    },
    {
      id: "goong",
      name: "Goong Maps",
      description: "Vietnamese map data via Goong NearbySearch API. Requires API key.",
      available: Boolean(config.goong.apiKey),
      requiresConfig: true,
      configFields: ["apiKey"],
    },
    {
      id: "geojson",
      name: "GeoJSON File",
      description: "Upload a local GeoJSON file for offline analysis.",
      available: true,
      requiresConfig: true,
      configFields: ["geojsonData"],
    },
    {
      id: "postgis",
      name: "PostGIS Database",
      description: "Local PostGIS database with imported OSM data (osm2pgsql).",
      available: isDbAvailable(),
      requiresConfig: false,
    },
  ];

  res.json({ sources });
});

export default router;
