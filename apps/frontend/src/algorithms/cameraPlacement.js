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

// ─── CAM alley: 2 entrance cams placed inside the alley mouth ────────────
// Offset a few metres INTO the alley (along armBearing) so the icons appear
// inside the alley, not on the major road.  With icon-anchor:"bottom" in the
// map layer both tips meet at the same anchor; one body faces out, one faces in.
const CAM_ALLEY_DEPTH_M = 5; // metres inside alley from the intersection node

function camsAlley(intLat, intLng, armBearing) {
  const pt      = offsetPoint(intLat, intLng, armBearing, CAM_ALLEY_DEPTH_M);
  const inbound = (armBearing + 180) % 360;
  return [
    { ...pt, bearing: armBearing, type: "cam_alley" }, // facing outbound (exit)
    { ...pt, bearing: inbound,    type: "cam_alley" }, // facing inbound  (entry)
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

    // Pre-compute which arm indices are "alley arms" for shape === "alley".
    // If arms have mixed classes: pick only the lowest-class arms.
    // If all arms share the same class (manual override edge case): pick only the
    // single arm whose bearing is closest to ix.alleyBearing to avoid cameras on all arms.
    let alleyArmIndices = new Set();
    if (shape === "alley") {
      const minClass = Math.min(...armClasses);
      const maxClass = Math.max(...armClasses);
      if (minClass < maxClass) {
        armClasses.forEach((c, i) => { if (c === minClass) alleyArmIndices.add(i); });
      } else {
        const ab = ix.alleyBearing ?? ix.armBearings[0];
        let bestIdx = 0, bestDiff = Infinity;
        ix.armBearings.forEach((b, j) => {
          const diff = Math.abs(((b - ab + 540) % 360) - 180);
          if (diff < bestDiff) { bestDiff = diff; bestIdx = j; }
        });
        alleyArmIndices.add(bestIdx);
      }
    }

    for (let i = 0; i < ix.armBearings.length; i++) {
      const bearing  = ix.armBearings[i];
      let cams = [];

      if (shape === "quad" || shape === "tri") {
        cams = hasSignal
          ? camsMajorWithSignal(ix.lat, ix.lng, bearing, effectiveArmCount)
          : camsMajorNoSignal(ix.lat, ix.lng, bearing, effectiveArmCount);
      } else if (shape === "alley" && alleyArmIndices.has(i)) {
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

export function planAllCameras({ intersections, ways, signalNodes, center, radiusM }) {
  _id = 0;
  const cam1Raw = planCamerasForRoads(ways);
  // Filter CAM1 to the scan area so roads that extend beyond the boundary don't
  // produce cameras outside the user's selected zone.
  const cam1 = (center && radiusM)
    ? cam1Raw.filter(c => haversineM(c.lat, c.lng, center.lat, center.lng) <= radiusM)
    : cam1Raw;
  const cam2 = planCamerasForIntersections(intersections, signalNodes);
  return [...cam1, ...cam2].slice(0, 5000);
}
