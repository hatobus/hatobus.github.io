// CAP (compass azimuth): north = 000°, east = 090°, clockwise in 0..359°.
// In this game's world coordinates, +x is east and -z is north.
export function bearingDegrees(dx, dz) {
  return ((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360;
}

export function capFromYaw(yaw) {
  return bearingDegrees(Math.sin(yaw), Math.cos(yaw));
}

export function formatCap(cap) {
  if (cap == null) return '—';
  return `${String(((Math.round(cap) % 360) + 360) % 360).padStart(3, '0')}°`;
}

// Read the outgoing tangent of the actual generated road, not the straight
// line between junctions. This corresponds to the direction when leaving a note.
export function roadDepartureCap(roads, from, to) {
  if (to === undefined) return null; // GOAL has no outgoing road.
  const road = roads.find((edge) =>
    (edge.a === from && edge.b === to) || (edge.a === to && edge.b === from));
  if (!road) throw new Error(`Road missing from ${from} to ${to}`);
  const poly = road.poly;
  const start = road.a === from ? poly[0] : poly.at(-1);
  const forward = road.a === from ? poly[1] : poly.at(-2);
  return bearingDegrees(forward.x - start.x, forward.z - start.z);
}