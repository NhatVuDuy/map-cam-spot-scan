import { useRef } from 'react';

export function useMap() {
  const mapRef = useRef(null);

  function flyTo(lng, lat, zoom = 15) {
    mapRef.current?.flyTo({ center: [lng, lat], zoom });
  }

  function fitBounds(bbox) {
    if (!bbox) return;
    const [south, west, north, east] = bbox;
    mapRef.current?.fitBounds([[west, south], [east, north]], { padding: 40 });
  }

  return { mapRef, flyTo, fitBounds };
}
