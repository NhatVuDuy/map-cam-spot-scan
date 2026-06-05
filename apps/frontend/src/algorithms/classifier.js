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

const VN_NAME_PATTERNS = [
  { pattern: /trường|đại học|học viện|cao đẳng/i, category: "school" },
  { pattern: /bệnh viện|phòng khám|y tế/i, category: "hospital" },
  { pattern: /chợ|siêu thị|co\.?op|vinmart/i, category: "market" },
  { pattern: /công viên|vườn hoa/i, category: "park" },
  { pattern: /khách sạn|hotel|resort/i, category: "hotel" },
  { pattern: /ủy ban|ubnd|công an|tòa án/i, category: "government" },
  { pattern: /hội nghị|trung tâm hội|convention/i, category: "conference" },
];

export function classifyTags(tags = {}) {
  for (const [key, mapping] of Object.entries(OSM_MAP)) {
    if (tags[key] && mapping[tags[key]]) return mapping[tags[key]];
  }
  const name = tags.name || tags["name:vi"] || "";
  for (const { pattern, category } of VN_NAME_PATTERNS) {
    if (pattern.test(name)) return category;
  }
  return null;
}
