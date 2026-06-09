import { offsetPoint, haversineM, segmentLengthM, interpolateAlong } from "../utils/bearing.js";

const LANE_OFFSET_M  = 2;    // lateral offset from road centreline (m)
const CAM_SETBACK_M  = 8;    // setback from intersection node for major road cams (m)
const CAM1_MIN_LEN   = 1000;
const CAM1_INTERVAL  = 3000;
const SIGNAL_RADIUS  = 60;   // snap radius for traffic signal nodes (m)
const ALLEY_CLASS    = 0;

let _id = 0;
function nextId(type) { return `cam-${type}-${++_id}`; }

// ─── CAM2 / CAM2.2: major arm WITH traffic signal ──────────────────────────
// Right lane: 2 cams at the same point (tips touch) — outbound + inbound.
// Left lane:  1 cam facing outbound.
function camsMajorWithSignal(intLat, intLng, armBearing, armCount) {
  const setback = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const rightPt = offsetPoint(setback.lat, setback.lng, (armBearing + 90) % 360, LANE_OFFSET_M);
  const leftPt  = offsetPoint(setback.lat, setback.lng, (armBearing + 270) % 360, LANE_OFFSET_M);
  const inbound = (armBearing + 180) % 360;
  const type    = armCount >= 4 ? "cam22" : "cam2";
  return [
    { ...rightPt, bearing: armBearing, type }, // outbound, right lane
    { ...rightPt, bearing: inbound,    type }, // inbound, right lane — tips touch
    { ...leftPt,  bearing: armBearing, type }, // outbound only, left lane
  ];
}

// ─── CAM2.1 / CAM2.3: pure major intersection, NO traffic signal ──────────
// 2 cams placed at the same point — tips touch, square bases face outward.
function camsMajorNoSignal(intLat, intLng, armBearing, armCount) {
  const setback = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const rightPt = offsetPoint(setback.lat, setback.lng, (armBearing + 90) % 360, LANE_OFFSET_M);
  const inbound = (armBearing + 180) % 360;
  const type    = armCount >= 4 ? "cam23" : "cam21";
  return [
    { ...rightPt, bearing: armBearing, type },
    { ...rightPt, bearing: inbound,    type }, // same point → tips touch at anchor
  ];
}

// ─── CAM alley: 2 entrance cams anchored at the alley mouth ──────────────
// No forward setback — cameras appear right at the intersection icon.
// Tips touch at the same anchor point; bases face into and out of the alley.
function camsAlley(intLat, intLng, armBearing) {
  // Slight lateral offset so the cameras sit on the alley lane, not centre-line
  const pt      = offsetPoint(intLat, intLng, (armBearing + 90) % 360, LANE_OFFSET_M);
  const inbound = (armBearing + 180) % 360;
  return [
    { ...pt, bearing: armBearing, type: "cam_alley" },
    { ...pt, bearing: inbound,    type: "cam_alley" }, // tips touch at pt
  ];
}

/**
 * Plan cameras for all detected intersections.
 *
 * Uses ix.intersectionShape (pre-computed or user-overridden) and ix.hasSignal.
 *
 *   "quad"  — with signal → CAM2.2 (3/arm), without → CAM2.3 (2/arm)
 *   "tri"   — with signal → CAM2   (3/arm), without → CAM2.1 (2/arm)
 *   "alley" — entrance cams on alley arm(s) only
 *   "minor" — skip
 */
export function planCamerasForIntersections(intersections, signalNodes) {
  const cameras = [];

  for (const ix of intersections) {
    if (!ix.armBearings || ix.armBearings.length < 2) continue;

    const armClasses = ix.armRoadClasses ?? ix.armBearings.map(() => ix.roadClass);
    const shape      = ix.intersectionShape || "minor";

    const hasSignal = ix.hasSignal !== undefined
      ? !!ix.hasSignal
      : signalNodes.some(sn => haversineM(ix.lat, ix.lng, sn.lat, sn.lng) <= SIGNAL_RADIUS);

    if (shape === "minor") continue;

    const effectiveArmCount = shape === "quad" ? 4 : shape === "tri" ? 3 : ix.armCount;

    for (let i = 0; i < ix.armBearings.length; i++) {
      const bearing  = ix.armBearings[i];
      const armClass = armClasses[i];
      let cams = [];

      if (shape === "quad" || shape === "tri") {
        cams = hasSignal
          ? camsMajorWithSignal(ix.lat, ix.lng, bearing, effectiveArmCount)
          : camsMajorNoSignal(ix.lat, ix.lng, bearing, effectiveArmCount);
      } else if (shape === "alley" && armClass === ALLEY_CLASS) {
        cams = camsAlley(ix.lat, ix.lng, bearing);
      }

      for (const c of cams) {
        cameras.push({
          id: nextId(c.type),
          lat: c.lat, lng: c.lng,
          bearing: Math.round(c.bearing),
          type: c.type,
          hasSignal: hasSignal && (shape === "quad" || shape === "tri"),
          intersectionId: ix.id,
        });
      }
    }
  }

  return cameras;
}

/**
 * Plan CAM1 cameras for long straight road segments (>1 km).
 */
export function planCamerasForRoads(ways) {
  const cameras = [];

  for (const way of ways) {
    const geom = way.geometry;
    if (!geom || geom.length < 2) continue;
    const totalLen = segmentLengthM(geom);
    if (totalLen < CAM1_MIN_LEN) continue;

    let dist = Math.min(CAM1_INTERVAL / 2, totalLen / 2);
    while (dist < totalLen) {
      const pt = interpolateAlong(geom, dist);
      cameras.push({
        id: nextId("cam1"),
        lat: pt.lat, lng: pt.lng,
        bearing: Math.round(pt.bearing),
        type: "cam1",
        wayId: way.id,
      });
      dist += CAM1_INTERVAL;
    }
  }

  return cameras;
}

export function planAllCameras({ intersections, ways, signalNodes }) {
  _id = 0;
  const cam1 = planCamerasForRoads(ways);
  const cam2 = planCamerasForIntersections(intersections, signalNodes);
  return [...cam1, ...cam2].slice(0, 5000);
}
