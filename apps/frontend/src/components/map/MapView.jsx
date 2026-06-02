import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useScanStore } from '../../store/scanStore.js';
import { CATEGORIES } from '../../utils/categories.js';

const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
};

export default function MapView({ mapRef }) {
  const containerRef = useRef(null);
  const { points, roads, bbox, filter, area } = useScanStore();

  // Init map
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [area.lng, area.lat],
      zoom: 13,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;
    return () => map.remove();
  }, []);

  // Fit bounds when bbox changes
  useEffect(() => {
    if (!bbox || !mapRef.current) return;
    const [south, west, north, east] = bbox;
    mapRef.current.fitBounds([[west, south], [east, north]], { padding: 40, duration: 800 });
  }, [bbox]);

  // Update radius circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = 'radius-circle';
    const update = () => {
      const geojson = createCircleGeoJSON(area.lat, area.lng, area.radiusM);
      if (map.getSource(id)) {
        map.getSource(id).setData(geojson);
      } else {
        map.addSource(id, { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'radius-fill',
          type: 'fill',
          source: id,
          paint: { 'fill-color': '#339AF0', 'fill-opacity': 0.05 },
        });
        map.addLayer({
          id: 'radius-line',
          type: 'line',
          source: id,
          paint: { 'line-color': '#339AF0', 'line-width': 1.5, 'line-dasharray': [4, 2] },
        });
      }
    };
    if (map.isStyleLoaded()) update();
    else map.once('load', update);
  }, [area]);

  // Update roads layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || roads.length === 0) return;
    const id = 'roads';
    const geojson = {
      type: 'FeatureCollection',
      features: roads.map((r) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: r.geometry },
        properties: { highway: r.highway },
      })),
    };
    const update = () => {
      if (map.getSource(id)) map.getSource(id).setData(geojson);
      else {
        map.addSource(id, { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'roads-line',
          type: 'line',
          source: id,
          paint: { 'line-color': '#495057', 'line-width': 1 },
        });
      }
    };
    if (map.isStyleLoaded()) update();
    else map.once('load', update);
  }, [roads]);

  // Update points layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = 'points';
    const visible = filter ? points.filter((p) => p.category === filter) : points;
    const geojson = {
      type: 'FeatureCollection',
      features: visible.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { ...p, color: CATEGORIES[p.category]?.color ?? '#888' },
      })),
    };
    const update = () => {
      if (map.getSource(id)) {
        map.getSource(id).setData(geojson);
      } else {
        map.addSource(id, { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'points-circle',
          type: 'circle',
          source: id,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 9],
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#fff',
            'circle-opacity': 0.9,
          },
        });
        map.addLayer({
          id: 'points-label',
          type: 'symbol',
          source: id,
          minzoom: 14,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          },
          paint: { 'text-color': '#f8f9fa', 'text-halo-color': '#1a1b1e', 'text-halo-width': 1 },
        });

        // Popup on click
        map.on('click', 'points-circle', (e) => {
          const p = e.features[0].properties;
          const cat = CATEGORIES[p.category] ?? {};
          new maplibregl.Popup({ closeButton: false, offset: 8 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-size:12px;line-height:1.5">
                <strong>${p.name || cat.label || p.category}</strong><br/>
                ${cat.icon ?? ''} ${cat.label ?? p.category}<br/>
                ${p.distanceM != null ? `${p.distanceM} m từ tâm` : ''}
              </div>`,
            )
            .addTo(map);
        });
        map.on('mouseenter', 'points-circle', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'points-circle', () => { map.getCanvas().style.cursor = ''; });
      }
    };
    if (map.isStyleLoaded()) update();
    else map.once('load', update);
  }, [points, filter]);

  return <div ref={containerRef} style={{ flex: 1, height: '100%' }} />;
}

function createCircleGeoJSON(lat, lng, radiusM) {
  const steps = 64;
  const R = 6_371_000;
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusM * Math.cos(angle)) / R * (180 / Math.PI);
    const dLng = (radiusM * Math.sin(angle)) / (R * Math.cos((lat * Math.PI) / 180)) * (180 / Math.PI);
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } };
}
