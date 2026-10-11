// Seeded course / route / roadbook generation: no browser dependencies.
import { clamp, hypot, rng } from './math.js?v=20261010-landmarks-v4';
import { roadDepartureCap } from './heading.js?v=20261010-cap-v9';

// One landmark record is shared by the field, roadbook and debug map.
export const LANDMARK_TYPES = {
  rock: { label: '大きな岩', sideOffset: 12, forwardOffset: 5, scale: 1.35 },
  stump: { label: '切り株', sideOffset: 10, forwardOffset: 4, scale: 1.45 },
  log: { label: '丸太', sideOffset: 12, forwardOffset: 6, scale: 1.2 },
  sign: { label: '木製看板', sideOffset: 11, forwardOffset: 5, scale: 1.15 },
  monument: { label: '石碑', sideOffset: 12, forwardOffset: 5, scale: 1.2 },
  mirror: { label: 'カーブミラー', sideOffset: 10, forwardOffset: 5, scale: 1.1 },
  hut: { label: '小さな小屋', sideOffset: 15, forwardOffset: 7, scale: 1.15 },
};

// Natural features appear more often than man-made features.
const LANDMARK_WEIGHTS = ['rock','rock','stump','stump','log','log','sign','sign','monument','mirror','hut'];

function normalize(x, z) {
  const len = Math.hypot(x, z) || 1;
  return { x: x / len, z: z / len };
}

function buildLandmark(bookItem, pts, random) {
  if (bookItem.prev === undefined || bookItem.next === undefined) {
    return null;
  }

  const center = pts[bookItem.id];
  const prev = pts[bookItem.prev];
  const next = pts[bookItem.next];
  const forward = normalize(center.x - prev.x, center.z - prev.z);
  const right = { x: forward.z, z: -forward.x };

  const type = LANDMARK_WEIGHTS[Math.floor(random() * LANDMARK_WEIGHTS.length)];
  const meta = LANDMARK_TYPES[type];
  const side = random() < 0.5 ? 'left' : 'right';
  const sideSign = side === 'left' ? -1 : 1;

  const x = center.x + right.x * meta.sideOffset * sideSign + forward.x * meta.forwardOffset;
  const z = center.z + right.z * meta.sideOffset * sideSign + forward.z * meta.forwardOffset;

  return {
    id: `landmark-${bookItem.id}`,
    nodeId: bookItem.id,
    type,
    label: meta.label,
    side,
    description: `${side === 'left' ? '左' : '右'}に${meta.label}`,
    x,
    z,
    scale: meta.scale,
  };
}

// Roadbook convention: if the route continues approximately straight at a junction,
// the rider proceeds without a separate note. The irregular grid needs tolerance.
const STRAIGHT_COSINE = Math.cos(40 * Math.PI / 180);
export function isStraightThrough(prev, current, next) {
  const ax = current.x - prev.x;
  const az = current.z - prev.z;
  const bx = next.x - current.x;
  const bz = next.z - current.z;
  return ax * bx + az * bz >= STRAIGHT_COSINE * hypot(ax, az) * hypot(bx, bz);
}

export function generate(seed) {
  const random = rng(seed);
  const pts = [];
  const adj = Array.from({ length: 25 }, () => []);
  const edges = [];
  const possible = [];

  for (let z = 0; z < 5; z++) {
    for (let x = 0; x < 5; x++) {
      const id = z * 5 + x;
      pts.push({
        id,
        x: (x - 2) * 59 + (random() - 0.5) * 15,
        z: (z - 2) * 59 + (random() - 0.5) * 15,
      });
      if (x) possible.push([id - 1, id]);
      if (z) possible.push([id - 5, id]);
    }
  }

  function link(a, b) {
    adj[a].push(b);
    adj[b].push(a);
    edges.push([a, b]);
  }

  const visitedSet = new Set([0]);
  while (visitedSet.size < 25) {
    const fringe = possible.filter(([a, b]) => visitedSet.has(a) !== visitedSet.has(b));
    const [a, b] = fringe[Math.floor(random() * fringe.length)];
    link(a, b);
    visitedSet.add(a);
    visitedSet.add(b);
  }

  const parent = Array(25).fill(-1);
  const queue = [0];
  const routeSearchVisited = new Set([0]);
  for (let i = 0; i < queue.length; i++) {
    for (const next of adj[queue[i]]) {
      if (routeSearchVisited.has(next)) continue;
      routeSearchVisited.add(next);
      parent[next] = queue[i];
      queue.push(next);
    }
  }

  const route = [24];
  while (route[0] !== 0) {
    route.unshift(parent[route[0]]);
  }

  for (const [a, b] of possible) {
    if (!adj[a].includes(b) && random() < 0.24) {
      link(a, b);
    }
  }

  const roads = [];
  const lengths = {};
  for (const [a, b] of edges) {
    const p = pts[a];
    const t = pts[b];
    const dx = t.x - p.x;
    const dz = t.z - p.z;
    const len = hypot(dx, dz);
    const bend = (random() - 0.5) * 14;
    const poly = [];

    for (let i = 0; i <= 9; i++) {
      const v = i / 9;
      const offset = Math.sin(Math.PI * v) * bend;
      poly.push({
        x: p.x + dx * v - (dz / len) * offset,
        z: p.z + dz * v + (dx / len) * offset,
      });
    }

    let length = 0;
    for (let i = 1; i < poly.length; i++) {
      length += hypot(poly[i].x - poly[i - 1].x, poly[i].z - poly[i - 1].z);
    }

    roads.push({ a, b, poly, length });
    lengths[`${a},${b}`] = length;
    lengths[`${b},${a}`] = length;
  }

  let mileage = 0;
  const book = [];
  for (let i = 0; i < route.length; i++) {
    const id = route[i];
    if (i) {
      mileage += lengths[`${route[i - 1]},${id}`];
    }
    // The physical route and cumulative mileage include skipped junctions.
    if (i > 0 && i < route.length - 1 &&
        isStraightThrough(pts[route[i - 1]], pts[id], pts[route[i + 1]])) {
      continue;
    }
    book.push({
      id,
      km: mileage,
      prev: route[i - 1],
      next: route[i + 1],
      label: i === 0 ? 'スタート' : i === route.length - 1 ? 'ゴール' : '分岐',
    });
  }

  // Direction of the road leaving each note; the goal has no outgoing road.
  for (const item of book) {
    item.cap = roadDepartureCap(roads, item.id, item.next);
  }

  const landmarks = [];
  for (const item of book) {
    item.landmark = buildLandmark(item, pts, random);
    if (item.landmark) {
      landmarks.push(item.landmark);
    }
  }

  const total = mileage;

  const dRoad = (x, z) => {
    let best = 1e9;
    for (const road of roads) {
      const pp = road.poly;
      for (let i = 1; i < pp.length; i++) {
        const a = pp[i - 1];
        const b = pp[i];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
        best = Math.min(best, hypot(x - a.x - dx * t, z - a.z - dz * t));
      }
    }
    return best;
  };

  const trees = [];
  for (let i = 0; i < 560; i++) {
    const x = (random() - 0.5) * 390;
    const z = (random() - 0.5) * 390;
    if (dRoad(x, z) < 8.5) continue;
    // Keep the actual roadbook landmarks visible from the junction.
    if (landmarks.some((landmark) => hypot(x - landmark.x, z - landmark.z) < (landmark.type === 'stump' ? 7 : 5.5))) continue;
    trees.push({
      x,
      z,
      h: 5 + random() * 9,
      dark: random(),
    });
  }

  const rocks = [];
  for (let i = 0; i < 85; i++) {
    const x = (random() - 0.5) * 385;
    const z = (random() - 0.5) * 385;
    if (dRoad(x, z) > 6 && !landmarks.some(mark => hypot(x - mark.x, z - mark.z) < 5)) {
      rocks.push({ x, z, h: 0.5 + random() * 1.3 });
    }
  }

  return {
    seed,
    pts,
    roads,
    route,
    book,
    total,
    adj,
    trees,
    rocks,
    landmarks,
    dRoad,
  };
}