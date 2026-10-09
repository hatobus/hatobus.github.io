// Lightweight perspective projection: flat 3D-like world on Canvas 2D.
import { state } from './state.js?v=20261010-landmarks-v3';
import { TAU, clamp, hypot } from './math.js?v=20261010-landmarks-v3';

const el = (id) => document.getElementById(id);
const view = el('view');
const ctx = view.getContext('2d');
const mini = el('map').getContext('2d');

export function resize() {
  const width = view.getBoundingClientRect().width;
  const height = view.getBoundingClientRect().height;
  const pr = Math.min(window.devicePixelRatio || 1, 1.6);
  view.width = Math.round(width * pr);
  view.height = Math.round(height * pr);
  ctx.setTransform(pr, 0, 0, pr, 0, 0);
}

function drawMapIcon(context, type, x, y, scale = 1) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.lineWidth = 1.5;
  context.lineJoin = 'round';
  context.lineCap = 'round';

  switch (type) {
    case 'rock':
      context.fillStyle = '#7e8779';
      context.beginPath();
      context.moveTo(-5, 4);
      context.lineTo(-2, -3);
      context.lineTo(4, -5);
      context.lineTo(6, 1);
      context.lineTo(2, 5);
      context.lineTo(-3, 5);
      context.closePath();
      context.fill();
      break;
    case 'stump':
      context.fillStyle = '#93633d';
      context.beginPath();
      context.ellipse(0, 0, 5, 4, 0, 0, TAU);
      context.fill();
      context.strokeStyle = '#d2af89';
      context.beginPath();
      context.ellipse(0, 0, 2.4, 1.6, 0, 0, TAU);
      context.stroke();
      break;
    case 'pole':
      context.fillStyle = '#f2f4f5';
      context.fillRect(-1.5, -6, 3, 12);
      context.fillStyle = '#db6556';
      context.fillRect(-2.5, -6, 5, 3);
      break;
    case 'hut':
      context.fillStyle = '#c59a66';
      context.fillRect(-5, -1, 10, 7);
      context.fillStyle = '#6b4f35';
      context.beginPath();
      context.moveTo(-6, -1);
      context.lineTo(0, -7);
      context.lineTo(6, -1);
      context.closePath();
      context.fill();
      break;
    case 'flag':
    default:
      context.strokeStyle = '#6f624f';
      context.beginPath();
      context.moveTo(-2, 6);
      context.lineTo(-2, -6);
      context.stroke();
      context.fillStyle = '#c1463a';
      context.beginPath();
      context.moveTo(-1, -5);
      context.lineTo(6, -3);
      context.lineTo(-1, 0);
      context.closePath();
      context.fill();
      break;
  }

  context.restore();
}

export function render() {
  const s = state;
  if (!s.course) return;

  const width = view.getBoundingClientRect().width;
  const height = view.getBoundingClientRect().height;
  const horizon = height * 0.4;
  const focal = width * 0.85;
  const yaw = s.yaw;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  function camera(x, z) {
    const dx = x - s.x;
    const dz = z - s.z;
    return {
      r: dx * cos - dz * sin,
      f: dx * sin + dz * cos,
    };
  }

  function project(v, y = 0) {
    const depth = Math.max(0.8, v.f);
    return {
      x: width / 2 + (v.r * focal) / depth,
      y: horizon + ((1.72 - y) * focal) / depth,
    };
  }

  function fillWorldPolygon(points, fill) {
    const projected = points.map((p) => ({ ...camera(p.x, p.z), y: p.y || 0 }));
    const clipped = [];

    for (let i = 0; i < projected.length; i++) {
      const a = projected[i];
      const b = projected[(i + 1) % projected.length];
      const insideA = a.f >= 0.75;
      const insideB = b.f >= 0.75;
      if (insideA) clipped.push(a);
      if (insideA !== insideB) {
        const t = (0.75 - a.f) / (b.f - a.f);
        clipped.push({
          r: a.r + (b.r - a.r) * t,
          f: 0.75,
          y: a.y + (b.y - a.y) * t,
        });
      }
    }

    if (clipped.length < 3) return;

    ctx.beginPath();
    clipped.forEach((p, index) => {
      const q = project(p, p.y);
      if (!index) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawLandmarkSprite(landmark) {
    const v = camera(landmark.x, landmark.z);
    if (v.f < 1 || v.f > 150 || Math.abs(v.r) > v.f * 1.5 + 15) return null;

    return {
      depth: v.f,
      draw() {
        switch (landmark.type) {
          case 'rock': {
            const base = project(v, 0);
            const top = project(v, 1.8 * landmark.scale);
            const size = (base.y - top.y) * 0.8;
            ctx.fillStyle = '#667164';
            ctx.beginPath();
            ctx.moveTo(base.x - size * 0.9, base.y);
            ctx.lineTo(base.x - size * 0.4, base.y - size * 1.2);
            ctx.lineTo(base.x + size * 0.1, base.y - size * 1.4);
            ctx.lineTo(base.x + size * 0.9, base.y - size * 0.8);
            ctx.lineTo(base.x + size * 0.7, base.y);
            ctx.lineTo(base.x - size * 0.1, base.y + size * 0.15);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#94a091';
            ctx.beginPath();
            ctx.ellipse(base.x - size * 0.15, base.y - size * 0.75, size * 0.18, size * 0.11, -0.4, 0, TAU);
            ctx.fill();
            break;
          }
          case 'stump': {
            const base = project(v, 0);
            const top = project(v, 1.2 * landmark.scale);
            const h = base.y - top.y;
            const w = h * 0.42;
            ctx.fillStyle = '#7b5537';
            ctx.fillRect(base.x - w * 0.45, top.y + h * 0.2, w * 0.9, h * 0.8);
            ctx.fillStyle = '#d0a37a';
            ctx.beginPath();
            ctx.ellipse(base.x, top.y + h * 0.2, w * 0.5, h * 0.15, 0, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = '#a6764f';
            ctx.lineWidth = Math.max(1, h * 0.05);
            ctx.beginPath();
            ctx.ellipse(base.x, top.y + h * 0.2, w * 0.25, h * 0.07, 0, 0, TAU);
            ctx.stroke();
            break;
          }
          case 'pole': {
            const base = project(v, 0);
            const top = project(v, 2.6 * landmark.scale);
            const h = base.y - top.y;
            const w = Math.max(4, h * 0.1);
            ctx.fillStyle = '#eff3f4';
            ctx.fillRect(base.x - w / 2, top.y, w, h);
            ctx.fillStyle = '#d6584a';
            ctx.fillRect(base.x - w * 0.7, top.y, w * 1.4, h * 0.22);
            ctx.strokeStyle = '#90a0a5';
            ctx.lineWidth = 1;
            ctx.strokeRect(base.x - w / 2, top.y, w, h);
            break;
          }
          case 'hut': {
            const base = project(v, 0);
            const top = project(v, 2.3 * landmark.scale);
            const h = base.y - top.y;
            const w = h * 0.9;
            ctx.fillStyle = '#be915c';
            ctx.fillRect(base.x - w * 0.45, top.y + h * 0.38, w * 0.9, h * 0.62);
            ctx.fillStyle = '#6b4d35';
            ctx.beginPath();
            ctx.moveTo(base.x - w * 0.55, top.y + h * 0.42);
            ctx.lineTo(base.x, top.y);
            ctx.lineTo(base.x + w * 0.55, top.y + h * 0.42);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#4b3727';
            ctx.fillRect(base.x - w * 0.1, top.y + h * 0.63, w * 0.2, h * 0.37);
            break;
          }
          case 'flag':
          default: {
            const base = project(v, 0);
            const top = project(v, 2.9 * landmark.scale);
            const h = base.y - top.y;
            ctx.strokeStyle = '#6d624e';
            ctx.lineWidth = Math.max(2, h * 0.04);
            ctx.beginPath();
            ctx.moveTo(base.x, base.y);
            ctx.lineTo(base.x, top.y);
            ctx.stroke();
            ctx.fillStyle = '#c1453a';
            ctx.beginPath();
            ctx.moveTo(base.x, top.y + h * 0.08);
            ctx.lineTo(base.x + h * 0.5, top.y + h * 0.2);
            ctx.lineTo(base.x, top.y + h * 0.34);
            ctx.closePath();
            ctx.fill();
            break;
          }
        }
      },
    };
  }

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#79b5c7');
  sky.addColorStop(1, '#c9ddd1');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#7e9e93';
  ctx.beginPath();
  ctx.moveTo(0, horizon + 20);
  for (let i = 0; i <= width + 12; i += 8) {
    const a = (i / width) * TAU * 2 + yaw * 0.2;
    ctx.lineTo(i, horizon - 17 + Math.sin(a) * 11 + Math.sin(a * 2.7) * 9);
  }
  ctx.lineTo(width, horizon + 35);
  ctx.lineTo(0, horizon + 35);
  ctx.fill();

  const grass = ctx.createLinearGradient(0, horizon, 0, height);
  grass.addColorStop(0, '#718f62');
  grass.addColorStop(1, '#2e583c');
  ctx.fillStyle = grass;
  ctx.fillRect(0, horizon + 12, width, height);

  const items = [];
  const course = s.course;

  for (const road of course.roads) {
    for (let i = 1; i < road.poly.length; i++) {
      const a = road.poly[i - 1];
      const b = road.poly[i];
      const middle = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      const pos = camera(middle.x, middle.z);
      if (pos.f < -15 || pos.f > 180 || Math.abs(pos.r) > pos.f * 2 + 22) continue;

      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = hypot(dx, dz) || 1;
      const px = -dz / len;
      const pz = dx / len;

      items.push({
        depth: pos.f,
        draw() {
          for (const [roadWidth, color] of [
            [5.8, '#405d41'],
            [4.65, '#a18d68'],
            [3.98, '#b3a283'],
          ]) {
            fillWorldPolygon(
              [
                { x: a.x + px * roadWidth, z: a.z + pz * roadWidth },
                { x: b.x + px * roadWidth, z: b.z + pz * roadWidth },
                { x: b.x - px * roadWidth, z: b.z - pz * roadWidth },
                { x: a.x - px * roadWidth, z: a.z - pz * roadWidth },
              ],
              color,
            );
          }
        },
      });
    }
  }

  for (const point of course.pts) {
    const at = camera(point.x, point.z);
    if (at.f < -5 || at.f > 170 || Math.abs(at.r) > at.f * 2 + 15) continue;
    items.push({
      depth: at.f - 0.2,
      draw() {
        const ring = [];
        for (let i = 0; i < 14; i++) {
          const a = (TAU * i) / 14;
          ring.push({ x: point.x + Math.cos(a) * 4.6, z: point.z + Math.sin(a) * 4.6 });
        }
        fillWorldPolygon(ring, '#b3a083');
      },
    });
  }

  for (const tree of course.trees) {
    const v = camera(tree.x, tree.z);
    if (v.f < 1 || v.f > 160 || Math.abs(v.r) > v.f * 1.4 + 15) continue;
    items.push({
      depth: v.f,
      draw() {
        const bottom = project(v, 0);
        const top = project(v, tree.h);
        const heightPx = bottom.y - top.y;
        if (heightPx < 2) return;

        const cx = top.x;
        const tw = heightPx * 0.3;
        ctx.fillStyle = '#4c4430';
        ctx.fillRect(cx - heightPx * 0.024, top.y + heightPx * 0.6, heightPx * 0.052, heightPx * 0.4);
        ctx.fillStyle = tree.dark > 0.5 ? '#214837' : '#2c6242';
        for (let k = 0; k < 3; k++) {
          const yy = top.y + heightPx * (k * 0.17);
          const bh = heightPx * (0.56 - k * 0.1);
          const hw = tw * (0.6 + k * 0.34);
          ctx.beginPath();
          ctx.moveTo(cx, yy);
          ctx.lineTo(cx - hw, yy + bh);
          ctx.lineTo(cx + hw, yy + bh);
          ctx.closePath();
          ctx.fill();
        }
      },
    });
  }

  for (const rock of course.rocks) {
    const v = camera(rock.x, rock.z);
    if (v.f < 1 || v.f > 140) continue;
    items.push({
      depth: v.f,
      draw() {
        const base = project(v);
        const top = project(v, rock.h);
        const size = (base.y - top.y) * 1.5;
        ctx.fillStyle = '#6b7469';
        ctx.beginPath();
        ctx.moveTo(base.x - size, base.y);
        ctx.lineTo(base.x - size * 0.5, top.y);
        ctx.lineTo(base.x + size * 0.5, top.y - size * 0.2);
        ctx.lineTo(base.x + size, base.y);
        ctx.fill();
      },
    });
  }

  for (const landmark of course.landmarks) {
    const sprite = drawLandmarkSprite(landmark);
    if (sprite) items.push(sprite);
  }

  items.sort((a, b) => b.depth - a.depth);
  for (const item of items) {
    item.draw();
  }

  let closestLabel = '林道・森';
  let minLandmark = 10;
  for (const landmark of course.landmarks) {
    const dist = hypot(s.x - landmark.x, s.z - landmark.z);
    if (dist < minLandmark) {
      minLandmark = dist;
      closestLabel = landmark.label;
    }
  }

  el('landmark').textContent = closestLabel;
  el('feedback').textContent = `近くの目印：${closestLabel}`;

  if (el('mapwrap').classList.contains('on')) {
    drawMap();
  }
}

export function drawMap() {
  const course = state.course;
  if (!course) return;

  const width = 420;
  const height = 360;
  const scale = width / 350;
  const cx = width / 2;
  const cy = height / 2;
  const p = (x, z) => ({ x: cx + x * scale, y: cy + z * scale });

  mini.clearRect(0, 0, width, height);
  mini.fillStyle = '#172c26';
  mini.fillRect(0, 0, width, height);

  mini.strokeStyle = '#7f9287';
  mini.lineWidth = 4;
  for (const road of course.roads) {
    mini.beginPath();
    road.poly.forEach((pt, index) => {
      const a = p(pt.x, pt.z);
      if (!index) mini.moveTo(a.x, a.y);
      else mini.lineTo(a.x, a.y);
    });
    mini.stroke();
  }

  mini.strokeStyle = '#d7ef7a';
  mini.lineWidth = 6;
  mini.beginPath();
  course.route.forEach((id, index) => {
    const a = p(course.pts[id].x, course.pts[id].z);
    if (!index) mini.moveTo(a.x, a.y);
    else mini.lineTo(a.x, a.y);
  });
  mini.stroke();

  for (const point of course.pts) {
    const a = p(point.x, point.z);
    mini.fillStyle = '#d5decb';
    mini.beginPath();
    mini.arc(a.x, a.y, 3.5, 0, TAU);
    mini.fill();
  }

  for (const landmark of course.landmarks) {
    const a = p(landmark.x, landmark.z);
    drawMapIcon(mini, landmark.type, a.x, a.y, 1);
  }

  const player = p(state.x, state.z);
  mini.fillStyle = '#ffffff';
  mini.beginPath();
  mini.arc(player.x, player.y, 6, 0, TAU);
  mini.fill();

  mini.strokeStyle = '#fff';
  mini.beginPath();
  mini.moveTo(player.x, player.y);
  mini.lineTo(player.x + Math.sin(state.yaw) * 18, player.y + Math.cos(state.yaw) * 18);
  mini.stroke();
}