import { bearingBetween, offsetPoint, haversineM, segmentLengthM, interpolateAlong } from "../utils/bearing.js";

const LANE_OFFSET_M    = 2;    // lateral offset from road centerline
const CAM_SETBACK_M    = 8;    // distance back from intersection node
const CAM1_MIN_LEN     = 1000; // minimum road length for CAM1 (meters)
const CAM1_INTERVAL    = 3000; // place CAM1 every N meters
const SIGNAL_RADIUS    = 20;   // max distance to match a traffic signal node
const MAJOR_ROAD_CLASS = 2;    // minimum class for CAM2 rules (tertiary = 2)

let _id = 0;
function nextId(type) { return `cam-${type}-${++_id}`; }

/**
 * Generate cameras for one arm of a MAJOR intersection (CAM2 rules).
 */
function armCamerasMajor(intLat, intLng, armBearing, hasSignal, armCount) {
  const setback = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const rightPt = offsetPoint(setback.lat, setback.lng, (armBearing + 90) % 360, LANE_OFFSET_M);
  const leftPt  = offsetPoint(setback.lat, setback.lng, (armBearing + 270) % 360, LANE_OFFSET_M);
  const inbound = (armBearing + 180) % 360;

  const type = hasSignal
    ? (armCount >= 4 ? "cam22" : "cam2")
    : (armCount >= 4 ? "cam23" : "cam21");

  if (hasSignal) {
    return [
      { lat: rightPt.lat, lng: rightPt.lng, bearing: armBearing, type },
      { lat: leftPt.lat,  lng: leftPt.lng,  bearing: inbound,    type },
      { lat: leftPt.lat,  lng: leftPt.lng,  bearing: armBearing, type },
    ];
  } else {
    return [
      { lat: rightPt.lat, lng: rightPt.lng, bearing: inbound, type },
      { lat: leftPt.lat,  lng: leftPt.lng,  bearing: inbound, type },
    ];
  }
}

/**
 * Generate 2 entrance cameras for one arm of a MINOR (alley) intersection.
 * One cam watches traffic entering the alley, one watches traffic exiting.
 */
function armCamerasAlley(intLat, intLng, armBearing) {
  const setback = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);
  const inbound = (armBearing + 180) % 360;
  return [
    { lat: setback.lat, lng: setback.lng, bearing: armBearing, type: "cam_alley" }, // exit cam
    { lat: setback.lat, lng: setback.lng, bearing: inbound,    type: "cam_alley" }, // entry cam
  ];
}

/**
 * Plan intersection cameras.
 * Major roads (roadClass >= MAJOR_ROAD_CLASS) → CAM2/2.1/2.2/2.3 rules
 * Alley intersections (roadClass < MAJOR_ROAD_CLASS) → 2 entrance cams per arm
 */
export function planCamerasForIntersections(intersections, signalNodes) {
  const cameras = [];

  for (const ix of intersections) {
    if (!ix.armBearings || ix.armBearings.length < 2) continue;

    const isMajor = (ix.roadClass ?? 0) >= MAJOR_ROAD_CLASS;

    if (isMajor) {
      const hasSignal = signalNodes.some(
        sn => haversineM(ix.lat, ix.lng, sn.lat, sn.lng) <= SIGNAL_RADIUS
      );
      for (const bearing of ix.armBearings) {
        const cams = armCamerasMajor(ix.lat, ix.lng, bearing, hasSignal, ix.armCount);
        for (const c of cams) {
          cameras.push({
            id: nextId(c.type),
            lat: c.lat, lng: c.lng,
            bearing: Math.round(c.bearing),
            type: c.type,
            hasSignal,
            intersectionId: ix.id,
          });
        }
      }
    } else {
      // Alley: 2 entrance cams per arm
      for (const bearing of ix.armBearings) {
        const cams = armCamerasAlley(ix.lat, ix.lng, bearing);
        for (const c of cams) {
          cameras.push({
            id: nextId(c.type),
            lat: c.lat, lng: c.lng,
            bearing: Math.round(c.bearing),
            type: c.type,
            hasSignal: false,
            intersectionId: ix.id,
          });
        }
      }
    }
  }

  return cameras;
}

/**
 * Plan CAM1 cameras for long straight road segments.
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

