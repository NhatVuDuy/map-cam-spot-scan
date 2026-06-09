import { offsetPoint, haversineM, segmentLengthM, interpolateAlong } from "../utils/bearing.js";

const LANE_OFFSET_M    = 2;    // lateral offset from road centerline (m)
const CAM_SETBACK_M    = 8;    // distance back from intersection node (m)
const CAM1_MIN_LEN     = 1000; // minimum way length to trigger CAM1 (m)
const CAM1_INTERVAL    = 3000; // CAM1 spacing (m)
const SIGNAL_RADIUS    = 20;   // max distance to snap a traffic signal node (m)
const MAJOR_CLASS      = 2;    // tertiary = 2, only major arms (>=2) get CAM2 rules
const ALLEY_CLASS      = 0;    // service/living_street = 0

let _id = 0;
function nextId(type) { return `cam-${type}-${++_id}`; }

// ─── CAM2: major road arm, WITH traffic signal ─────────────────────────────
// 1 cam on right lane (outbound), 1 cam on left lane (inbound) = 2 cams per arm
function camsMajorWithSignal(intLat, intLng, armBearing, armCount) {
  const setback  = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const rightPt  = offsetPoint(setback.lat, setback.lng, (armBearing + 90) % 360, LANE_OFFSET_M);
  const leftPt   = offsetPoint(setback.lat, setback.lng, (armBearing + 270) % 360, LANE_OFFSET_M);
  const inbound  = (armBearing + 180) % 360;
  const type = armCount >= 4 ? "cam22" : "cam2";
  return [
    { ...rightPt, bearing: armBearing, type }, // outbound lane cam
    { ...leftPt,  bearing: inbound,    type }, // inbound lane cam
  ];
}

// ─── CAM2.1/2.3: major road arm, NO traffic signal ────────────────────────
// 2 back-to-back cams on outbound lane only (facing both directions)
function camsMajorNoSignal(intLat, intLng, armBearing, armCount) {
  const setback = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const rightPt = offsetPoint(setback.lat, setback.lng, (armBearing + 90) % 360, LANE_OFFSET_M);
  const inbound = (armBearing + 180) % 360;
  const type = armCount >= 4 ? "cam23" : "cam21";
  return [
    { ...rightPt, bearing: armBearing, type }, // facing outbound
    { ...rightPt, bearing: inbound,    type }, // facing inbound (back-to-back)
  ];
}

// ─── CAM alley: 2 entrance cams at alley mouth, back-to-back ──────────────
function camsAlley(intLat, intLng, armBearing) {
  const setback = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const inbound = (armBearing + 180) % 360;
  return [
    { ...setback, bearing: armBearing, type: "cam_alley" }, // exit cam
    { ...setback, bearing: inbound,    type: "cam_alley" }, // entry cam
  ];
}

/**
 * Plan cameras for all detected intersections.
 *
 * Per-arm rules (using armRoadClasses[] from intersection.js):
 *   arm.class >= MAJOR_CLASS AND ix.roadClass >= MAJOR_CLASS
 *     → CAM2 / CAM2.2 (with signal) or CAM2.1 / CAM2.3 (no signal)
 *   arm.class == ALLEY_CLASS AND ix.roadClass >= 1
 *     → 2 entrance cams (cam_alley)
 *   everything else (e.g. residential arm, alley–alley): skip
 */
export function planCamerasForIntersections(intersections, signalNodes) {
  const cameras = [];

  for (const ix of intersections) {
    if (!ix.armBearings || ix.armBearings.length < 2) continue;

    const isMajor = ix.roadClass >= MAJOR_CLASS;
    const hasMinorRoads = ix.roadClass >= 1;   // connects to at least residential

    const hasSignal = isMajor && signalNodes.some(
      sn => haversineM(ix.lat, ix.lng, sn.lat, sn.lng) <= SIGNAL_RADIUS
    );

    for (let i = 0; i < ix.armBearings.length; i++) {
      const bearing   = ix.armBearings[i];
      const armClass  = ix.armRoadClasses ? ix.armRoadClasses[i] : ix.roadClass;

      let cams = [];

      if (armClass >= MAJOR_CLASS && isMajor) {
        // Major arm at a major intersection → CAM2 rules
        cams = hasSignal
          ? camsMajorWithSignal(ix.lat, ix.lng, bearing, ix.armCount)
          : camsMajorNoSignal(ix.lat, ix.lng, bearing, ix.armCount);

      } else if (armClass === ALLEY_CLASS && hasMinorRoads) {
        // Alley/service arm connecting to any non-alley road → entrance cams only
        cams = camsAlley(ix.lat, ix.lng, bearing);
      }
      // else: residential arm at minor intersection, alley–alley → skip

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
