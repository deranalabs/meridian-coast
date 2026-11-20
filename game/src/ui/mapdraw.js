// Full-map painting: the shared city canvas, district names, the job route, labelled blips and Ilo's arrow.
import { WORLD_BOUNDS } from '../world/heightfield.js';
import { DISTRICT_LIST, PARK } from '../world/districts.js';

const FONT = '"Avenir Next", "Helvetica Neue", Arial, sans-serif';
const INK = '#1a0f28';
const AREAS = [...DISTRICT_LIST, { ...PARK, accent: '#7fd18b' }];
const a = {};
const b = {};

function label(ctx, text, x, y, size, colour, weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.lineWidth = Math.max(3, size * 0.28);
  ctx.strokeStyle = 'rgba(16, 6, 30, 0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
}

function districtNames(ctx, projection) {
  const size = Math.min(34, 16 + projection.view.zoom * 4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.82;
  for (const area of AREAS) {
    const r = area.rect;
    projection.toScreen((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, a);
    const small = area === AREAS[AREAS.length - 1];
    label(ctx, area.name.toUpperCase(), a.x, a.y, small ? size * 0.62 : size, area.accent, 900);
  }
  ctx.globalAlpha = 1;
}

function route(ctx, projection, points) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    projection.toScreen(points[i].x, points[i].z, a);
    if (i === 0) ctx.moveTo(a.x, a.y);
    else ctx.lineTo(a.x, a.y);
  }
  ctx.strokeStyle = 'rgba(255, 201, 74, 0.35)';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.strokeStyle = '#ffc94a';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();
}

function pin(ctx, colour, s) {
  ctx.fillStyle = colour;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-13 * s, -16 * s, -10 * s, -30 * s, 0, -30 * s);
  ctx.bezierCurveTo(10 * s, -30 * s, 13 * s, -16 * s, 0, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = (i % 2 ? 2.6 : 6) * s;
    const t = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(t) * r, -19 * s + Math.sin(t) * r);
  }
  ctx.fill();
}

/** One blip's mark at the origin; returns how far above the point its label should sit. */
function mark(ctx, blip) {
  if (blip.mission && !blip.target) {
    pin(ctx, blip.colour ?? '#ffc94a', 1);
    return 36;
  }
  ctx.fillStyle = blip.colour ?? '#ffffff';
  ctx.strokeStyle = blip.mission ? INK : 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (blip.target) ctx.arc(0, 0, 9, 0, Math.PI * 2);
  else if (blip.air) {
    ctx.moveTo(0, -10);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-9, 0);
    ctx.closePath();
  } else if (blip.police) ctx.rect(-7, -7, 14, 14);
  else if (blip.shop) ctx.roundRect(-10, -10, 20, 20, 4);
  else {
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.stroke();
    return 14;
  }
  ctx.fill();
  ctx.stroke();
  if (blip.letter) {
    ctx.fillStyle = INK;
    ctx.font = `800 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(blip.letter, 0, 1);
  }
  return 16;
}

function blips(ctx, projection, list) {
  const zoom = projection.view.zoom;
  for (const blip of list) {
    projection.toScreen(blip.x, blip.z, a);
    ctx.save();
    ctx.translate(a.x, a.y);
    const rise = mark(ctx, blip);
    ctx.restore();
    const named = blip.label && (blip.mission || blip.landmark || zoom >= 2);
    if (!named) continue;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    label(ctx, blip.label, a.x, a.y - rise, blip.mission ? 14 : 12, blip.mission ? '#ffe3a0' : '#f4ecff', 700);
  }
}

function player(ctx, projection, x, z, heading, time) {
  projection.toScreen(x, z, a);
  const pulse = 14 + 6 * ((time * 1.5) % 1);
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.strokeStyle = `rgba(196, 92, 255, ${0.9 - ((time * 1.5) % 1) * 0.8})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(Math.PI - heading);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#c45cff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(10, 11);
  ctx.lineTo(0, 5);
  ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Paint the whole map into ctx: view = {x, z, heading, blips, route}; base is the shared city canvas. */
export function paintMap(ctx, projection, base, view, time) {
  const { width, height } = projection.view;
  ctx.fillStyle = '#2fa2d0';
  ctx.fillRect(0, 0, width, height);
  projection.toScreen(WORLD_BOUNDS.x0, WORLD_BOUNDS.z0, a);
  projection.toScreen(WORLD_BOUNDS.x1, WORLD_BOUNDS.z1, b);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(base, a.x, a.y, b.x - a.x, b.y - a.y);
  districtNames(ctx, projection);
  if (view.route?.length > 1) route(ctx, projection, view.route);
  blips(ctx, projection, view.blips);
  player(ctx, projection, view.x, view.z, view.heading, time);
}
