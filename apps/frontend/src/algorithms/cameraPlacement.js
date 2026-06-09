import { offsetPoint, haversineM, segmentLengthM, interpolateAlong } from "../utils/bearing.js";

const LANE_OFFSET_M    = 2;    // lateral offset from road centerline (m)
const CAM_SETBACK_M    = 8;    // distance back from intersection node (m)
const PAIR_OFFSET_M    = 3;    // separation between back-to-back cams so they don't overlap (m)
const CAM1_MIN_LEN     = 1000; // minimum way length to trigger CAM1 (m)
const CAM1_INTERVAL    = 3000; // CAM1 spacing (m)
const SIGNAL_RADIUS    = 60;   // snap radius for traffic signal nodes (m) — signals are often at corners
const MAJOR_CLASS      = 2;    // tertiary = 2; only arms >= this get CAM2 rules
const ALLEY_CLASS      = 0;    // service / living_street

let _id = 0;
function nextId(type) { return `cam-${type}-${++_id}`; }

// ─── CAM2 / CAM2.2: major arm, WITH traffic signal ────────────────────────
// 1 cam on right lane (outbound) + 1 cam on left lane (inbound) = 2 per arm
function camsMajorWithSignal(intLat, intLng, armBearing, armCount) {
  const setback = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const rightPt = offsetPoint(setback.lat, setback.lng, (armBearing + 90) % 360, LANE_OFFSET_M);
  const leftPt  = offsetPoint(setback.lat, setback.lng, (armBearing + 270) % 360, LANE_OFFSET_M);
  const inbound = (armBearing + 180) % 360;
  const type = armCount >= 4 ? "cam22" : "cam2";
  return [
    { ...rightPt, bearing: armBearing, type }, // outbound lane
    { ...leftPt,  bearing: inbound,    type }, // inbound lane
  ];
}

// ─── CAM2.1 / CAM2.3: PURE major intersection, NO traffic signal ──────────
// 2 back-to-back cams on outbound lane, separated by PAIR_OFFSET_M so they don't overlap.
// Only called for intersections where every arm is a major road (no alleys).
function camsMajorNoSignal(intLat, intLng, armBearing, armCount) {
  const setback = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const rightPt = offsetPoint(setback.lat, setback.lng, (armBearing + 90) % 360, LANE_OFFSET_M);
  const inbound = (armBearing + 180) % 360;

  // Separate the pair slightly so icons don't render on top of each other
  const camA = offsetPoint(rightPt.lat, rightPt.lng, armBearing, PAIR_OFFSET_M / 2);
  const camB = offsetPoint(rightPt.lat, rightPt.lng, inbound,    PAIR_OFFSET_M / 2);

  const type = armCount >= 4 ? "cam23" : "cam21";
  return [
    { ...camA, bearing: armBearing, type }, // facing outbound
    { ...camB, bearing: inbound,    type }, // facing inbound (back-to-back)
  ];
}

// ─── CAM alley: 2 entrance cams at alley mouth ───────────────────────────
// Separated slightly so icons don't overlap.
function camsAlley(intLat, intLng, armBearing) {
  const setback = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const inbound = (armBearing + 180) % 360;

  const camA = offsetPoint(setback.lat, setback.lng, armBearing, PAIR_OFFSET_M / 2);
  const camB = offsetPoint(setback.lat, setback.lng, inbound,    PAIR_OFFSET_M / 2);

  return [
    { ...camA, bearing: armBearing, type: "cam_alley" }, // exit cam
    { ...camB, bearing: inbound,    type: "cam_alley" }, // entry cam
  ];
}

/**
 * Plan cameras for all detected intersections.
 *
 * Per-arm rules (armRoadClasses[] from intersection.js):
 *
 *   1. Major arm (class >= 2) at a PURE major intersection (all arms >= 2):
 *        with signal  → CAM2 / CAM2.2 (2 cams, 1 per lane)
 *        no signal    → CAM2.1 / CAM2.3 (2 back-to-back on outbound lane)
 *
 *   2. Major arm at a MIXED intersection (some alley arms present):
 *        skip — no cameras on the main-road side
 *
 *   3. Alley arm (class == 0) at an intersection where maxRoadClass >= 1:
 *        → 2 entrance cams (cam_alley), separated to avoid overlap
 *
 *   4. Everything else (residential arm, alley–alley): skip
 */
export function planCamerasForIntersections(intersections, signalNodes) {
  const cameras = [];

  for (const ix of intersections) {
    if (!ix.armBearings || ix.armBearings.length < 2) continue;

    const armClasses = ix.armRoadClasses ?? ix.armBearings.map(() => ix.roadClass);

    const isMajor       = ix.roadClass >= MAJOR_CLASS;
    const isAllMajorArms = armClasses.every(cls => cls >= MAJOR_CLASS);
    const hasMinorRoads  = ix.roadClass >= 1;

    const hasSignal = isMajor && signalNodes.some(
      sn => haversineM(ix.lat, ix.lng, sn.lat, sn.lng) <= SIGNAL_RADIUS
    );

    for (let i = 0; i < ix.armBearings.length; i++) {
      const bearing  = ix.armBearings[i];
      const armClass = armClasses[i];

      let cams = [];

      if (armClass >= MAJOR_CLASS && isMajor) {
        if (hasSignal) {
          // Rule 1a: major arm, signal present → CAM2/2.2
          cams = camsMajorWithSignal(ix.lat, ix.lng, bearing, ix.armCount);
        } else if (isAllMajorArms) {
          // Rule 1b: major arm, no signal, pure major intersection → CAM2.1/2.3
          cams = camsMajorNoSignal(ix.lat, ix.lng, bearing, ix.armCount);
        }
        // Rule 2: mixed intersection (some alley arms) → skip major arm
      } else if (armClass === ALLEY_CLASS && hasMinorRoads) {
        // Rule 3: alley entrance cam
        cams = camsAlley(ix.lat, ix.lng, bearing);
      }
      // Rule 4: residential or alley–alley → skip

      for (const c of cams) {
        cameras.push({
          id: nextId(c.type),
          lat: c.lat, lng: c.lng,
          bearing: Math.round(c.bearing),
          type: c.type,
          hasSignal: hasSignal && armClass >= MAJOR_CLASS,
          intersectionId: ix.id,
        });
      }
    }
  }

  return cameras;
}

/**
 * Plan CAM1 cameras for long straight road segments (>1km).
 * ways: [{ id, geometry: [[lng,lat],...], highway }]
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
  const cam1 = planCamerasForRoads(ways);
  const cam2 = planCamerasForIntersections(intersections, signalNodes);
  return [...cam1, ...cam2].slice(0, 5000);
}
