import { useRef, useCallback } from "react";

/**
 * useMap — holds a ref to the MapLibre GL map instance.
 * Pass mapRef to MapView and use getMap() elsewhere.
 */
export function useMap() {
  const mapRef = useRef(null);

  const setMap = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const getMap = useCallback(() => mapRef.current, []);

  const flyTo = useCallback((lat, lng, zoom = 14) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom, speed: 1.2 });
  }, []);

  const fitBBox = useCallback((bbox) => {
    const map = mapRef.current;
    if (!map || !bbox) return;
    // bbox: [south, west, north, east]
    map.fitBounds(
      [[bbox[1], bbox[0]], [bbox[3], bbox[2]]],
      { padding: 40, maxZoom: 16 }
    );
  }, []);

  return { mapRef, setMap, getMap, flyTo, fitBBox };
}
