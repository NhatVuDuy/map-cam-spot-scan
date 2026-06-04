// Single source of truth for category config — shared between backend and frontend
export const CATEGORIES = {
  intersection: {
    label: "Ngã tư / Ngã ba",
    osmTags: { highway: ["primary", "secondary", "tertiary", "residential", "trunk"] },
    color: "#FF6B6B",
    icon: "intersection",
    priority: 1,
  },
  school: {
    label: "Trường học",
    osmTags: { amenity: ["school", "university", "college", "kindergarten"] },
    color: "#339AF0",
    icon: "school",
    priority: 2,
  },
  hospital: {
    label: "Bệnh viện",
    osmTags: { amenity: ["hospital", "clinic", "health_centre"] },
    color: "#FF8787",
    icon: "hospital",
    priority: 2,
  },
  park: {
    label: "Công viên",
    osmTags: { leisure: ["park", "garden"] },
    color: "#51CF66",
    icon: "park",
    priority: 3,
  },
  market: {
    label: "Chợ / Siêu thị",
    osmTags: { amenity: ["marketplace"], shop: ["supermarket", "mall"] },
    color: "#22D3EE",
    icon: "market",
    priority: 3,
  },
  hotel: {
    label: "Khách sạn",
    osmTags: { tourism: ["hotel", "motel", "hostel", "guest_house"] },
    color: "#FCC419",
    icon: "hotel",
    priority: 4,
  },
  conference: {
    label: "Hội nghị / Sự kiện",
    osmTags: { amenity: ["conference_centre", "events_venue", "community_centre"] },
    color: "#CC5DE8",
    icon: "conference",
    priority: 4,
  },
  government: {
    label: "Cơ quan hành chính",
    osmTags: { amenity: ["townhall", "police", "fire_station", "courthouse", "embassy"] },
    color: "#A8B2C1",
    icon: "government",
    priority: 5,
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);
