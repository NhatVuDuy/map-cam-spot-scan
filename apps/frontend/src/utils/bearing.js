const R = 6_371_000;
const TO_RAD = Math.PI / 180;
const TO_DEG = 180 / Math.PI;

export function bearingBetween(lat1, lng1, lat2, lng2) {
  const φ1 = lat1 * TO_RAD, φ2 = lat2 * TO_RAD;
  const Δλ = (lng2 - lng1) * TO_RAD;
  const x = Math.sin(Δλ) * Math.cos(φ2);
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(x, y) * TO_DEG + 360) % 360;
}

export function offsetPoint(lat, lng, bearingDeg, distM) {
  const φ1 = lat * TO_RAD, λ1 = lng * TO_RAD;
  const δ = distM / R;
  const θ = bearingDeg * TO_RAD;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: φ2 * TO_DEG, lng: λ2 * TO_DEG };
}

export function haversineM(lat1, lng1, lat2, lng2) {
  const φ1 = lat1 * TO_RAD, φ2 = lat2 * TO_RAD;
  const Δφ = (lat2 - lat1) * TO_RAD;
  const Δλ = (lng2 - lng1) * TO_RAD;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// geometry: [[lng, lat], ...]
export function segmentLengthM(geometry) {
  let len = 0;
  for (let i = 1; i < geometry.length; i++) {
    const [lng1, lat1] = geometry[i - 1];
    const [lng2, lat2] = geometry[i];
    len += haversineM(lat1, lng1, lat2, lng2);
  }
  return len;
}

// Returns {lat, lng, bearing} at targetDistM along geometry [[lng,lat],...]
export function interpolateAlong(geometry, targetDistM) {
  let traveled = 0;
  for (let i = 1; i < geometry.length; i++) {
    const [lng1, lat1] = geometry[i - 1];
    const [lng2, lat2] = geometry[i];
    const seg = haversineM(lat1, lng1, lat2, lng2);
    if (traveled + seg >= targetDistM || i === geometry.length - 1) {
      const frac = seg > 0 ? Math.min((targetDistM - traveled) / seg, 1) : 0;
      const lat = lat1 + (lat2 - lat1) * frac;
      const lng = lng1 + (lng2 - lng1) * frac;
      return { lat, lng, bearing: bearingBetween(lat1, lng1, lat2, lng2) };
    }
    traveled += seg;
  }
  const n = geometry.length;
  const [lng1, lat1] = geometry[n - 2];
  const [lng2, lat2] = geometry[n - 1];
  return { lat: lat2, lng: lng2, bearing: bearingBetween(lat1, lng1, lat2, lng2) };
}
