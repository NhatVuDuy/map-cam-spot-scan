import { bearingBetween, offsetPoint, haversineM, segmentLengthM, interpolateAlong } from "../utils/bearing.js";

const LANE_OFFSET_M  = 2;     // lateral offset from road centerline
const CAM_SETBACK_M  = 8;     // distance back from intersection node
const CAM1_MIN_LEN   = 1000;  // minimum road length for CAM1 (meters)
const CAM1_INTERVAL  = 3000;  // place CAM1 every N meters
const SIGNAL_RADIUS  = 20;    // max distance to match a traffic signal node

let _id = 0;
function nextId(type) { return `cam-${type}-${++_id}`; }

/**
 * Generate cameras for one arm of an intersection.
 * armBearing: direction FROM intersection center TOWARD the arm (degrees)
 * hasSignal / armCount → selects CAM rule
 */
function armCameras(intLat, intLng, armBearing, hasSignal, armCount) {
  const setback = offsetPoint(intLat, intLng, armBearing, CAM_SETBACK_M);

  // Right lane = traffic going outbound (leaving intersection)
  const rightPt = offsetPoint(setback.lat, setback.lng, (armBearing + 90) % 360, LANE_OFFSET_M);
  // Left lane = traffic coming inbound (entering intersection)
  const leftPt  = offsetPoint(setback.lat, setback.lng, (armBearing + 270) % 360, LANE_OFFSET_M);

  const inbound = (armBearing + 180) % 360; // direction toward intersection

  const type = hasSignal
    ? (armCount >= 4 ? "cam22" : "cam2")
    : (armCount >= 4 ? "cam23" : "cam21");

  if (hasSignal) {
    // CAM2 / CAM2.2 (with traffic signal): 3 cams per arm
    // 1 cam: right lane, facing outbound (captures plates of exiting vehicles)
    // 2 cams: left lane, facing both ways (entering and exiting the intersection on this side)
    return [
      { lat: rightPt.lat, lng: rightPt.lng, bearing: armBearing, type }, // outbound cam
      { lat: leftPt.lat,  lng: leftPt.lng,  bearing: inbound,    type }, // inbound cam facing toward intersection
      { lat: leftPt.lat,  lng: leftPt.lng,  bearing: armBearing, type }, // secondary cam on left lane
    ];
  } else {
    // CAM2.1 / CAM2.3 (no signal): 2 cams per arm
    // Both cams watch traffic going toward intersection (inbound)
    return [
      { lat: rightPt.lat, lng: rightPt.lng, bearing: inbound, type }, // right lane inbound
      { lat: leftPt.lat,  lng: leftPt.lng,  bearing: inbound, type }, // left lane inbound
    ];
  }
}

/**
 * Plan intersection cameras for all detected intersections.
 * signalNodes: [{lat, lng}, ...] from OSM traffic_signals query
 */
export function planCamerasForIntersections(intersections, signalNodes) {
  const cameras = [];

  for (const ix of intersections) {
    if (!ix.armBearings || ix.armBearings.length < 2) continue;

    const hasSignal = signalNodes.some(
      sn => haversineM(ix.lat, ix.lng, sn.lat, sn.lng) <= SIGNAL_RADIUS
    );

    for (const bearing of ix.armBearings) {
      const cams = armCameras(ix.lat, ix.lng, bearing, hasSignal, ix.armCount);
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

    // Place first camera at CAM1_INTERVAL/2, then every CAM1_INTERVAL
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

/**
 * Plan all cameras for a scan result.
 * Returns array of camera objects capped at 5000.
 */
export function planAllCameras({ intersections, ways, signalNodes }) {
  const cam1 = planCamerasForRoads(ways);
  const cam2 = planCamerasForIntersections(intersections, signalNodes);
  return [...cam1, ...cam2].slice(0, 5000);
}
