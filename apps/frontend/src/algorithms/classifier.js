const OSM_MAP = {
  amenity: {
    school: "school", university: "school", college: "school", kindergarten: "school",
    hospital: "hospital", clinic: "hospital", health_centre: "hospital",
    marketplace: "market",
    conference_centre: "conference", events_venue: "conference", community_centre: "conference",
    townhall: "government", police: "government", fire_station: "government",
    courthouse: "government", embassy: "government",
  },
  leisure: { park: "park", garden: "park" },
  tourism: { hotel: "hotel", motel: "hotel", hostel: "hotel", guest_house: "hotel" },
  shop: { supermarket: "market", mall: "market" },
};

const VN_PATTERNS = [
  { pattern: /trường|đại học|học viện|cao đẳng/i, category: "school" },
  { pattern: /bệnh viện|phòng khám|y tế/i, category: "hospital" },
  { pattern: /chợ|siêu thị|co\.?op|vinmart/i, category: "market" },
  { pattern: /công viên|vườn hoa/i, category: "park" },
  { pattern: /khách sạn|hotel|resort/i, category: "hotel" },
  { pattern: /ủy ban|ubnd|công an|tòa án/i, category: "government" },
  { pattern: /hội nghị|trung tâm hội|convention/i, category: "conference" },
];

export function classifyTags(tags) {
  if (!tags) return null;
  for (const [key, map] of Object.entries(OSM_MAP)) {
    const val = tags[key];
    if (val && map[val]) return map[val];
  }
  const name = tags.name || tags["name:vi"] || tags["name:en"] || "";
  for (const { pattern, category } of VN_PATTERNS) {
    if (pattern.test(name)) return category;
  }
  return null;
}

// New block-aware classifier
const BLOCK_POI_MAP = {
  amenity: {
    school:"B10", university:"B10", college:"B10", kindergarten:"B10",
    hospital:"B10", clinic:"B10", health_centre:"B10",
    townhall:"B10", police:"B10", fire_station:"B10", courthouse:"B10", embassy:"B10",
    marketplace:"B08",
    conference_centre:"B08", events_venue:"B08", community_centre:"B08",
    bus_station:"B09", ferry_terminal:"B09",
    customs:"B06",
  },
  leisure: { park:"B08", garden:"B08", stadium:"B08" },
  tourism: { hotel:"B08", motel:"B08", hostel:"B08", guest_house:"B08", attraction:"B08" },
  shop: { supermarket:"B08", mall:"B08" },
  railway: { station:"B09", halt:"B09", tram_stop:"B09" },
  aeroway: { terminal:"B09", aerodrome:"B09" },
  barrier: { toll_booth:"B06", border_control:"B06" },
  landuse: { industrial:"B11", industrial_estate:"B11" },
};

export function classifyTagsToBlock(tags) {
  if (!tags) return null;
  for (const [key, map] of Object.entries(BLOCK_POI_MAP)) {
    const val = tags[key];
    if (val && map[val]) return map[val];
  }
  return null;
}
