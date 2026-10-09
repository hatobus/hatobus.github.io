// Restrict player movement to the painted road surface (including junctions).
// ROAD_HALF_WIDTH is a little smaller than the brown shoulder in scene.js (4.65m).
export const ROAD_HALF_WIDTH = 4.45;
const MAX_STEP_METERS = 0.75;

/** Find the closest point on any road centerline. */
export function closestRoadPoint(course, x, z) {
  let bestDistanceSquared = Infinity;
  let bestX = x;
  let bestZ = z;

  for (const road of course.roads) {
    const points = road.poly;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const lengthSquared = dx * dx + dz * dz;
      const t = lengthSquared > 0
        ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared))
        : 0;
      const px = a.x + dx * t;
      const pz = a.z + dz * t;
      const distanceSquared = (x - px) ** 2 + (z - pz) ** 2;
      if (distanceSquared < bestDistanceSquared) {
        bestDistanceSquared = distanceSquared;
        bestX = px;
        bestZ = pz;
      }
    }
  }

  return { x: bestX, z: bestZ, distance: Math.sqrt(bestDistanceSquared) };
}

/**
 * Move the player only over roads, sliding along the edge when moving diagonally.
 * Small sub-steps prevent a fast player from jumping over a narrow road boundary.
 * Trip calculations must use the returned displacement, not the requested one.
 */
export function moveWithinRoad(course, x, z, dx, dz) {
  const distance = Math.hypot(dx, dz);
  if (distance === 0) return { x, z };

  const steps = Math.max(1, Math.ceil(distance / MAX_STEP_METERS));
  const stepX = dx / steps;
  const stepZ = dz / steps;
  const limit = ROAD_HALF_WIDTH - 0.001;

  for (let i = 0; i < steps; i++) {
    const nextX = x + stepX;
    const nextZ = z + stepZ;
    const nearest = closestRoadPoint(course, nextX, nextZ);

    if (nearest.distance <= limit) {
      x = nextX;
      z = nextZ;
      continue;
    }

    // Clamp to the visible road edge. This removes the outward component of the
    // movement while preserving movement along the road boundary.
    const factor = limit / nearest.distance;
    x = nearest.x + (nextX - nearest.x) * factor;
    z = nearest.z + (nextZ - nearest.z) * factor;
  }

  return { x, z };
}