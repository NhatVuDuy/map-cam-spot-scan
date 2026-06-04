/**
 * OSM tag / GeoJSON property → category mapping.
 * Pure functions — no I/O.
 */

const OSM_MAP = {
  amenity: {
    school: "school",
    university: "school",
    college: "school",
    kindergarten: "school",
    hospital: "hospital",
    clinic: "hospital",
    health_centre: "hospital",
    marketplace: "market",
    conference_centre: "conference",
    events_venue: "conference",
    community_centre: "conference",
    townhall: "government",
    police: "government",
    fire_station: "government",
    courthouse: "government",
    embassy: "government",
  },
  leisure: {
    park: "park",
    garden: "park",
  },
  tourism: {
    hotel: "hotel",
    motel: "hotel",
    hostel: "hotel",
    guest_house: "hotel",
  },
  shop: {
    supermarket: "market",
    mall: "market",
  },
};

const VN_NAME_PATTERNS = [
  { pattern: /trường|đại học|học viện|cao đẳng/i, category: "school" },
  { pattern: /bệnh viện|phòng khám|y tế/i, category: "hospital" },
  { pattern: /chợ|siêu thị|co\.?op|vinmart/i, category: "market" },
  { pattern: /công viên|vườn hoa/i, category: "park" },
  { pattern: /khách sạn|hotel|resort/i, category: "hotel" },
  { pattern: /ủy ban|ubnd|công an|tòa án/i, category: "government" },
  { pattern: /hội nghị|trung tâm hội|convention/i, category: "conference" },
];

/**
 * Classify a feature's properties into a category.
 * Priority:
 *   1. OSM standard tags (amenity, leisure, tourism, shop)
 *   2. properties.type / properties.category
 *   3. Vietnamese name matching
 *
 * @param {object} props - feature properties
 * @returns {string|null} category key or null
 */
export function classify(props) {
  if (!props) return null;

  // Priority 1: OSM tags
  for (const [tagKey, tagMap] of Object.entries(OSM_MAP)) {
    const tagValue = props[tagKey];
    if (tagValue && tagMap[tagValue]) {
      return tagMap[tagValue];
    }
  }

  // Priority 2: type / category fields
  const typeField = props.type || props.category;
  if (typeField) {
    const lower = typeField.toLowerCase();
    // Check if it's already a valid category key
    const validCats = ["intersection", "school", "hospital", "park", "market", "hotel", "conference", "government"];
    if (validCats.includes(lower)) return lower;

    // Try mapping common type values
    for (const [tagKey, tagMap] of Object.entries(OSM_MAP)) {
      if (tagMap[lower]) return tagMap[lower];
    }
  }

  // Priority 3: Vietnamese name matching
  const name = props.name || props.ten || props.title || "";
  if (name) {
    for (const { pattern, category } of VN_NAME_PATTERNS) {
      if (pattern.test(name)) return category;
    }
  }

  return null;
}

/**
 * Classify raw OSM tags (used in adapters after fetching).
 */
export function classifyOSM(tags) {
  return classify(tags);
}
