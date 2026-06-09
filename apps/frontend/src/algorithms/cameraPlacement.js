import { offsetPoint, haversineM, segmentLengthM, interpolateAlong } from "../utils/bearing.js";

const LANE_OFFSET_M = 2;   // lateral offset from road centreline (m)
const CAM_SETBACK_M = 8;   // distance back from intersection node (m)
const PAIR_OFFSET_M = 3;   // separation between back-to-back cams (m)
const CAM1_MIN_LEN  = 1000;
const CAM1_INTERVAL = 3000;
const SIGNAL_RADIUS = 60;  // snap radius for traffic signal nodes (m)
const ALLEY_CLASS   = 0;

let _id = 0;
function nextId(type) { return `cam-${type}-${++_id}`; }

// ─── CAM2 / CAM2.2: major arm WITH traffic signal ─────────────────────────
// 1 cam on right lane (outbound) + 1 cam on left lane (inbound) per arm
function camsMajorWithSignal(intLat, intLng, armBearing, armCount) {
  const setback  = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const rightPt  = offsetPoint(setback.lat, setback.lng, (armBearing + 90) % 360, LANE_OFFSET_M);
  const leftPt   = offsetPoint(setback.lat, setback.lng, (armBearing + 270) % 360, LANE_OFFSET_M);
  const inbound  = (armBearing + 180) % 360;
  const type     = armCount >= 4 ? "cam22" : "cam2";
  return [
    { ...rightPt, bearing: armBearing, type },
    { ...leftPt,  bearing: inbound,    type },
  ];
}

// ─── CAM2.1 / CAM2.3: pure major intersection, NO traffic signal ──────────
// 2 back-to-back cams on the outbound lane — tips touch, bases face outward.
function camsMajorNoSignal(intLat, intLng, armBearing, armCount) {
  const setback  = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const rightPt  = offsetPoint(setback.lat, setback.lng, (armBearing + 90) % 360, LANE_OFFSET_M);
  const inbound  = (armBearing + 180) % 360;

  const camA = offsetPoint(rightPt.lat, rightPt.lng, armBearing, PAIR_OFFSET_M / 2);
  const camB = offsetPoint(rightPt.lat, rightPt.lng, inbound,    PAIR_OFFSET_M / 2);

  const type = armCount >= 4 ? "cam23" : "cam21";
  return [
    { ...camA, bearing: armBearing, type },
    { ...camB, bearing: inbound,    type },
  ];
}

// ─── CAM alley: 2 entrance cams at alley mouth ───────────────────────────
function camsAlley(intLat, intLng, armBearing) {
  const setback = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const inbound = (armBearing + 180) % 360;

  const camA = offsetPoint(setback.lat, setback.lng, armBearing, PAIR_OFFSET_M / 2);
  const camB = offsetPoint(setback.lat, setback.lng, inbound,    PAIR_OFFSET_M / 2);

  return [
    { ...camA, bearing: armBearing, type: "cam_alley" },
    { ...camB, bearing: inbound,    type: "cam_alley" },
  ];
}

/**
 * Plan cameras for all detected intersections.
 *
 * Uses ix.intersectionShape (pre-computed or user-overridden) and ix.hasSignal.
 *
 *   "quad"  — 4-arm all-major; with signal → CAM2.2, without → CAM2.3 (per arm)
 *   "tri"   — 3-arm all-major; with signal → CAM2,   without → CAM2.1 (per arm)
 *   "alley" — mixed; place entrance cams only on alley arm(s)
 *   "minor" — skip
 */
export function planCamerasForIntersections(intersections, signalNodes) {
  const cameras = [];

  for (const ix of intersections) {
    if (!ix.armBearings || ix.armBearings.length < 2) continue;

    const armClasses = ix.armRoadClasses ?? ix.armBearings.map(() => ix.roadClass);
    const shape      = ix.intersectionShape || "minor";

    // Respect pre-computed / user-overridden hasSignal; fall back to spatial lookup
    const hasSignal = ix.hasSignal !== undefined
      ? !!ix.hasSignal
      : signalNodes.some(sn => haversineM(ix.lat, ix.lng, sn.lat, sn.lng) <= SIGNAL_RADIUS);

    if (shape === "minor") continue;

    // Cam type variant is driven by shape, not physical arm count, so user can override
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
  _id = 0; // reset counter on each full replan so IDs stay stable
  const cam1 = planCamerasForRoads(ways);
  const cam2 = planCamerasForIntersections(intersections, signalNodes);
  return [...cam1, ...cam2].slice(0, 5000);
}
