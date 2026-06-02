export const CATEGORIES = {
  intersection: { label: 'Ngã tư / Ngã ba', color: '#FF6B6B', icon: '🔴', priority: 1 },
  school:       { label: 'Trường học',        color: '#339AF0', icon: '🏫', priority: 2 },
  hospital:     { label: 'Bệnh viện',         color: '#FF8787', icon: '🏥', priority: 2 },
  park:         { label: 'Công viên',         color: '#51CF66', icon: '🌳', priority: 3 },
  market:       { label: 'Chợ / Siêu thị',   color: '#22D3EE', icon: '🛒', priority: 3 },
  hotel:        { label: 'Khách sạn',         color: '#FCC419', icon: '🏨', priority: 4 },
  conference:   { label: 'Hội nghị / Sự kiện', color: '#CC5DE8', icon: '🏛️', priority: 4 },
  government:   { label: 'Cơ quan HC',        color: '#A8B2C1', icon: '🏢', priority: 5 },
};

export const CATEGORY_LIST = Object.entries(CATEGORIES).map(([id, cfg]) => ({ id, ...cfg }));
