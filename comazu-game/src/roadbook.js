// Roadbook canvas and trip / mode UI.
import { LANDMARK_TYPES } from './course.js?v=20261010-landmarks-v3';
import { state } from './state.js?v=20261010-landmarks-v3';
import { TAU, clamp, hypot } from './math.js?v=20261010-landmarks-v3';

const el = (id) => document.getElementById(id);
const paper = el('symbol').getContext('2d');

export function syncModes() {
  const s = state;
  for (const [id, on, label] of [
    ['runmode', s.runMode, '🏃 走る'],
    ['returnmode', s.returnMode, '↩ 戻る'],
  ]) {
    const button = el(id);
    button.classList.toggle('on', on);
    button.setAttribute('aria-pressed', String(on));
    button.textContent = `${label} ${on ? 'ON' : 'OFF'}`;
  }

  const status = el('tripmode');
  status.textContent = s.returnMode ? '減算中 −' : '加算中 ＋';
  status.classList.toggle('reverse', s.returnMode);
}

function drawLandmarkIcon(ctx, type, x, y, side = 'right', scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (type) {
    case 'rock': {
      ctx.fillStyle = '#6b7469';
      ctx.beginPath();
      ctx.moveTo(-12, 8);
      ctx.lineTo(-7, -4);
      ctx.lineTo(3, -10);
      ctx.lineTo(12, -2);
      ctx.lineTo(8, 10);
      ctx.lineTo(-2, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#9ea89a';
      ctx.beginPath();
      ctx.arc(-2, -1, 3.2, 0, TAU);
      ctx.fill();
      break;
    }
    case 'stump': {
      ctx.fillStyle = '#815737';
      ctx.beginPath();
      ctx.ellipse(0, 6, 9, 5, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(-8, -3, 16, 9);
      ctx.fillStyle = '#c9a27d';
      ctx.beginPath();
      ctx.ellipse(0, -3, 9, 5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#9f734c';
      ctx.beginPath();
      ctx.ellipse(0, -3, 4.5, 2.4, 0, 0, TAU);
      ctx.stroke();
      break;
    }
    case 'pole': {
      ctx.fillStyle = '#f4f4f2';
      ctx.fillRect(-2.5, -10, 5, 20);
      ctx.fillStyle = '#d65f53';
      ctx.fillRect(-3.5, -10, 7, 4);
      ctx.strokeStyle = '#8ca0a8';
      ctx.strokeRect(-2.5, -10, 5, 20);
      break;
    }
    case 'hut': {
      ctx.fillStyle = '#c59a66';
      ctx.fillRect(-11, -1, 22, 14);
      ctx.fillStyle = '#6b4f35';
      ctx.beginPath();
      ctx.moveTo(-13, -1);
      ctx.lineTo(0, -13);
      ctx.lineTo(13, -1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4d3724';
      ctx.fillRect(-3, 4, 6, 9);
      break;
    }
    case 'flag':
    default: {
      ctx.strokeStyle = '#6f624f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-6, 11);
      ctx.lineTo(-6, -11);
      ctx.stroke();
      ctx.fillStyle = '#c1463a';
      ctx.beginPath();
      ctx.moveTo(-5, -10);
      ctx.lineTo(12, -5);
      ctx.lineTo(-5, 1);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  if (side === 'left') {
    ctx.strokeStyle = '#355343';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
  }

  ctx.restore();
}

export function renderNote() {
  const s = state;
  const course = s.course;
  const entry = course.book[s.note];
  const point = course.pts[entry.id];

  el('pos').textContent = `${String(s.note + 1).padStart(2, '0')} / ${String(course.book.length).padStart(2, '0')}`;
  el('note').querySelector('.km').textContent = `${(entry.km / 1000).toFixed(3)} km`;
  el('note').querySelector('.detail').textContent =
    entry.landmark?.description ?? (entry.next === undefined ? 'ゴール' : entry.prev === undefined ? 'スタート' : entry.label);
  el('note').querySelector('.caption').textContent =
    entry.next === undefined
      ? 'この地点がゴールです。'
      : entry.prev === undefined
        ? 'ここから出発。最初の分岐と目印を探してください。'
        : entry.landmark
          ? `分岐で ${entry.landmark.description} を探して進みます。`
          : '分岐と目印を確認して、強調された方向へ進んでください。';

  paper.clearRect(0, 0, 230, 230);
  paper.fillStyle = '#f1f5e9';
  paper.fillRect(0, 0, 230, 230);

  let inx;
  let inz;
  if (entry.prev === undefined) {
    const n = course.pts[entry.next];
    inx = n.x - point.x;
    inz = n.z - point.z;
  } else {
    const n = course.pts[entry.prev];
    inx = point.x - n.x;
    inz = point.z - n.z;
  }

  const length = hypot(inx, inz) || 1;
  inx /= length;
  inz /= length;
  const right = { x: inz, z: -inx };

  function branchEnd(id) {
    const n = course.pts[id];
    const dx = n.x - point.x;
    const dz = n.z - point.z;
    const len = hypot(dx, dz) || 1;
    return {
      x: 115 + (80 * (dx * right.x + dz * right.z)) / len,
      y: 115 - (80 * (dx * inx + dz * inz)) / len,
    };
  }

  function stroke(x, y, color, width) {
    paper.beginPath();
    paper.moveTo(115, 115);
    paper.lineTo(x, y);
    paper.strokeStyle = color;
    paper.lineWidth = width;
    paper.lineCap = 'round';
    paper.stroke();
  }

  for (const neighbor of course.adj[entry.id]) {
    const end = branchEnd(neighbor);
    stroke(end.x, end.y, '#a4b1a7', 16);
  }

  stroke(115, 205, '#219b75', 12);

  if (entry.next !== undefined) {
    const end = branchEnd(entry.next);
    stroke(end.x, end.y, '#219b75', 12);
    const angle = Math.atan2(end.y - 115, end.x - 115);
    paper.fillStyle = '#177b5d';
    paper.beginPath();
    paper.moveTo(end.x, end.y);
    paper.lineTo(end.x - 19 * Math.cos(angle - 0.48), end.y - 19 * Math.sin(angle - 0.48));
    paper.lineTo(end.x - 19 * Math.cos(angle + 0.48), end.y - 19 * Math.sin(angle + 0.48));
    paper.fill();
  } else {
    paper.fillStyle = '#227f61';
    paper.beginPath();
    paper.arc(115, 115, 17, 0, TAU);
    paper.fill();
    paper.fillStyle = 'white';
    paper.font = 'bold 14px sans-serif';
    paper.textAlign = 'center';
    paper.fillText('G', 115, 120);
  }

  if (entry.landmark) {
    const iconX = entry.landmark.side === 'left' ? 58 : 172;
    drawLandmarkIcon(paper, entry.landmark.type, iconX, 118, entry.landmark.side, 0.95);
  }

  paper.beginPath();
  paper.arc(115, 115, 5, 0, TAU);
  paper.fillStyle = '#183e32';
  paper.fill();

  paper.fillStyle = '#344d3f';
  paper.font = 'bold 14px sans-serif';
  paper.textAlign = 'center';
  paper.fillText(String(s.note + 1), 200, 28);
}

export function note(delta) {
  state.note = clamp(state.note + delta, 0, state.course.book.length - 1);
  renderNote();
}