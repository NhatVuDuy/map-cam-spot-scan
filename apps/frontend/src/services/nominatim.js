const BASE = "https://nominatim.openstreetmap.org/search";

// OSM type → nhãn tiếng Việt
const TYPE_LABEL = {
  administrative: "Hành chính",
  city:           "Thành phố",
  town:           "Thị xã / Thị trấn",
  suburb:         "Phường / Xã",
  village:        "Xã / Thôn",
  quarter:        "Quận / Huyện",
  municipality:   "Thành phố",
  county:         "Quận / Huyện",
  state:          "Tỉnh / TP",
  district:       "Quận / Huyện",
  borough:        "Quận",
  neighbourhood:  "Phường",
  hamlet:         "Làng / Xóm",
};

export function getTypeLabel(type, osmType) {
  return TYPE_LABEL[type] || TYPE_LABEL[osmType] || type || "Địa điểm";
}

/**
 * Compute scan area from Nominatim boundingbox.
 * boundingbox: [south, north, west, east] (strings)
 * Returns { lat, lng, radiusM }
 */
export function bboxToArea(boundingbox) {
  const [s, n, w, e] = boundingbox.map(Number);
  const lat = (s + n) / 2;
  const lng = (w + e) / 2;
  const latSpanM = (n - s) * 111_320;
  const lngSpanM = (e - w) * 111_320 * Math.cos((lat * Math.PI) / 180);
  // Half of the longer dimension + 10% buffer, rounded to 100m, max 15 000m
  const raw = Math.max(latSpanM, lngSpanM) / 2 * 1.1;
  const radiusM = Math.min(Math.max(Math.round(raw / 100) * 100, 200), 15_000);
  return { lat: +lat.toFixed(6), lng: +lng.toFixed(6), radiusM };
}

/**
 * Search Vietnamese administrative units via Nominatim.
 * Returns array of result objects.
 */
export async function searchAdmin(query, signal) {
  if (!query || query.trim().length < 2) return [];

  const params = new URLSearchParams({
    q:            query.trim(),
    countrycodes: "vn",
    format:       "json",
    addressdetails: "1",
    namedetails:  "1",
    limit:        "8",
    "accept-language": "vi,en",
  });

  const res = await fetch(`${BASE}?${params}`, {
    headers: { "Referer": "https://cam-spot.zenpax.io.vn" },
    signal,
  });

  if (!res.ok) throw new Error("Nominatim request failed");
  const data = await res.json();

  return data.map((item) => {
    const area = bboxToArea(item.boundingbox);
    const tooLarge = area.radiusM >= 15_000;

    // Build short display name: strip ", Việt Nam" suffix
    const short = (item.display_name || "")
      .replace(/, Việt Nam$/, "")
      .replace(/, Vietnam$/, "");

    return {
      id:          item.place_id,
      name:        item.namedetails?.["name:vi"] || item.namedetails?.name || item.name || short,
      displayName: short,
      type:        getTypeLabel(item.type, item.class),
      osmType:     item.type,
      area,
      tooLarge,
    };
  });
}
