export const BLOCKS = {
  B01:    { id:"B01",   name:"Ngã tư / Ngã năm có đèn",          unit:"nút",     color:"#FF6B6B", detect:"intersection",
            cams:{ ITS1:2, ITS2:0, P2:1, P1:0, B3:1, B2:2, B1:0 } },
  B02:    { id:"B02",   name:"Ngã ba có đèn tín hiệu",            unit:"nút",     color:"#FF8C42", detect:"intersection",
            cams:{ ITS1:1, ITS2:0, P2:0, P1:0, B3:1, B2:2, B1:0 } },
  B03:    { id:"B03",   name:"Ngã tư / ba không đèn (tỉnh / quốc lộ)", unit:"nút", color:"#FCC419", detect:"intersection",
            cams:{ ITS1:1, ITS2:0, P2:0, P1:0, B3:0, B2:2, B1:0 } },
  B04:    { id:"B04",   name:"Bùng binh / Vòng xuyến",            unit:"nút",     color:"#51CF66", detect:"roundabout",
            cams:{ ITS1:1, ITS2:0, P2:1, P1:0, B3:0, B2:2, B1:0 } },
  B05:    { id:"B05",   name:"Tuyến đường thẳng trọng điểm",      unit:"km",      color:"#339AF0", detect:"road_segment",
            cams:{ ITS1:1, ITS2:0, P2:0, P1:0, B3:0, B2:4, B1:0 } },
  B06:    { id:"B06",   name:"Cửa ngõ TP / Trạm kiểm soát",       unit:"cửa ngõ", color:"#845EF7", detect:"checkpoint",
            note:"OSM data hạn chế tại VN",
            cams:{ ITS1:3, ITS2:1, P2:0, P1:1, B3:1, B2:2, B1:0 } },
  B07:    { id:"B07",   name:"Đầu hẻm / Ngõ vào khu dân cư",      unit:"đầu hẻm", color:"#22D3EE", detect:"intersection",
            cams:{ ITS1:0, ITS2:0, P2:0, P1:0, B3:0, B2:0, B1:1 } },
  "B07-S":{ id:"B07-S", name:"Giao cắt nhỏ trong hẻm",            unit:"giao cắt",color:"#74C0FC", detect:"intersection",
            cams:{ ITS1:0, ITS2:0, P2:0, P1:0, B3:0, B2:0, B1:1 } },
  B08:    { id:"B08",   name:"Khu vực công cộng đông người",       unit:"khu",     color:"#F06595", detect:"poi",
            cams:{ ITS1:1, ITS2:0, P2:0, P1:1, B3:3, B2:2, B1:0 } },
  B09:    { id:"B09",   name:"Bến xe / Bến tàu / Sân bay / Nhà ga",unit:"đầu mối",color:"#A9E34B", detect:"poi",
            cams:{ ITS1:3, ITS2:0, P2:0, P1:1, B3:6, B2:2, B1:0 } },
  B10:    { id:"B10",   name:"Trường học / Bệnh viện / Cơ quan",   unit:"khu",     color:"#FF8787", detect:"poi",
            cams:{ ITS1:1, ITS2:0, P2:0, P1:0, B3:0, B2:1, B1:3 } },
  B11:    { id:"B11",   name:"Khu công nghiệp / Khu chế xuất",     unit:"khu",     color:"#FFA94D", detect:"area",
            note:"Detect qua landuse=industrial",
            cams:{ ITS1:2, ITS2:0, P2:0, P1:1, B3:1, B2:0, B1:2 } },
  B12:    { id:"B12",   name:"Cầu vượt / Hầm chui / Khu ngập lụt",unit:"điểm",    color:"#66D9E8", detect:"road_feature",
            note:"Ngập lụt không detect qua OSM",
            cams:{ ITS1:0, ITS2:0, P2:0, P1:0, B3:1, B2:2, B1:1 } },
  B13:    { id:"B13",   name:"Trục nội bộ khu đô thị tư nhân",     unit:"giao lộ", color:"#A8B2C1", detect:"none",
            note:"Không detect qua OSM — nhập thủ công",
            cams:{ ITS1:0, ITS2:0, P2:0, P1:0, B3:0, B2:0, B1:1 } },
};

export const BLOCK_KEYS = Object.keys(BLOCKS);
export const DEFAULT_BLOCKS = BLOCK_KEYS.filter(k => BLOCKS[k].detect !== "none");
export const CAM_TYPES = ["ITS1", "ITS2", "P2", "P1", "B3", "B2", "B1"];
export const CAM_COLORS = {
  ITS1:"#FF6B6B", ITS2:"#FF8C42", P2:"#845EF7", P1:"#F06595",
  B3:"#339AF0", B2:"#51CF66", B1:"#A8B2C1",
};

export function camTotal(block) {
  return Object.values(block.cams).reduce((a, b) => a + b, 0);
}

// Map old category keys to block ids (for backward compat)
export const CATEGORY_TO_BLOCK = {
  intersection: null,  // handled separately via intersectionShape
  school:       "B10",
  hospital:     "B10",
  government:   "B10",
  park:         "B08",
  market:       "B08",
  hotel:        "B08",
  conference:   "B08",
};

// Map intersectionShape + hasSignal → block id
export function shapeToBlock(shape, hasSignal, roadClass) {
  if (shape === "quad" && hasSignal)  return "B01";
  if (shape === "tri"  && hasSignal)  return "B02";
  if ((shape === "quad" || shape === "tri") && !hasSignal) return "B03";
  if (shape === "alley")             return "B07";
  if (shape === "alley_minor")       return "B07-S";
  return null; // "minor" has no block assignment
}
