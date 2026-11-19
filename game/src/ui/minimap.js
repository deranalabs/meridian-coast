// Minimap: the city pre-drawn once (water, beach, park, blocks, roads), shown rotated around the player.
import { WORLD_BOUNDS, BOARDWALK, WATER_LEVEL, heightAt } from '../world/heightfield.js';
import { PARK } from '../world/districts.js';
import { DISTRICTS } from '../palette.js';

const MAP_SIZE = 2048;
const VIEW_METRES = 260;

function toMap(x, z) {
  const sx = MAP_SIZE / (WORLD_BOUNDS.x1 - WORLD_BOUNDS.x0);
  const sz = MAP_SIZE / (WORLD_BOUNDS.z1 - WORLD_BOUNDS.z0);
  return [(x - WORLD_BOUNDS.x0) * sx, (z - WORLD_BOUNDS.z0) * sz];
}

function drawBase(layout) {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_SIZE;
  canvas.height = MAP_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3a2f4a';
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  const step = 8;
  const metres = (WORLD_BOUNDS.x1 - WORLD_BOUNDS.x0) / MAP_SIZE;
  for (let py = 0; py < MAP_SIZE; py += step) {
    for (let px = 0; px < MAP_SIZE; px += step) {
      const x = WORLD_BOUNDS.x0 + px * metres;
      const z = WORLD_BOUNDS.z0 + py * ((WORLD_BOUNDS.z1 - WORLD_BOUNDS.z0) / MAP_SIZE);
      const h = heightAt(x, z);
      if (h < WATER_LEVEL) ctx.fillStyle = '#1d5c78';
      else if (x > BOARDWALK.x0) ctx.fillStyle = '#c9a77a';
      else if (h > 3) ctx.fillStyle = `rgb(${60 + h},${74 + h * 0.6},${58})`;
      else continue;
      ctx.fillRect(px, py, step, step);
    }
  }
  const park = PARK.rect;
  const [px0, pz0] = toMap(park.x0, park.z0);
  const [px1, pz1] = toMap(park.x1, park.z1);
  ctx.fillStyle = '#3f7a4a';
  ctx.fillRect(px0, pz0, px1 - px0, pz1 - pz0);
  ctx.strokeStyle = '#d8d0e4';
  ctx.lineCap = 'round';
  for (const edge of layout.graph.edges) {
    const a = layout.graph.nodes[edge.from];
    const b = layout.graph.nodes[edge.to];
    const [ax, az] = toMap(a.x, a.z);
    const [bx, bz] = toMap(b.x, b.z);
    ctx.lineWidth = Math.max(4, edge.width * 0.9);
    ctx.beginPath();
    ctx.moveTo(ax, az);
    ctx.lineTo(bx, bz);
    ctx.stroke();
  }
  for (const block of layout.blocks) {
    const accent = DISTRICTS[block.district]?.accent ?? '#888888';
    ctx.fillStyle = '#5a4c6e';
    ctx.beginPath();
    block.polygon.forEach((p, index) => {
      const [x, z] = toMap(p.x, p.z);
      if (index === 0) ctx.moveTo(x, z);
      else ctx.lineTo(x, z);
    });
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  return canvas;
}

/** A circular minimap inside `container`; update(x, z, heading, blips) redraws it. */
export function createMinimap(container, layout) {
  const base = drawBase(layout);
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 420;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const scale = MAP_SIZE / (WORLD_BOUNDS.x1 - WORLD_BOUNDS.x0);
  return {
    update(x, z, heading, blips = []) {
      const size = canvas.width;
      const zoom = size / (VIEW_METRES * scale);
      ctx.save();
      ctx.fillStyle = '#2a2236';
      ctx.fillRect(0, 0, size, size);
      ctx.translate(size / 2, size / 2);
      ctx.rotate(heading - Math.PI);
      ctx.scale(zoom, zoom);
      const [mx, mz] = toMap(x, z);
      ctx.drawImage(base, -mx, -mz);
      for (const blip of blips) {
        const [bx, bz] = toMap(blip.x, blip.z);
        ctx.fillStyle = blip.colour;
        ctx.beginPath();
        ctx.arc(bx - mx, bz - mz, 7 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(20,8,30,0.55)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#c45cff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(13, 14);
      ctx.lineTo(0, 7);
      ctx.lineTo(-13, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      const nx = size / 2 - Math.sin(heading) * (size / 2 - 22);
      const ny = size / 2 + Math.cos(heading) * (size / 2 - 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 26px "Avenir Next", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', nx, ny);
    },
  };
}
