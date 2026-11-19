// Part lists: collect primitive geometries with colour, glow, roughness and metalness, then merge them once.
import * as THREE from '../../vendor/three.module.min.js';
import { mergeGeometries } from '../core/meshbuilder.js';

const NAMES = ['position', 'normal', 'color', 'aGlow', 'aSurface'];

/** add(geometry, matrix, colour, {glow, rough, metal}); build() returns one merged geometry for the prop shader. */
export function partList() {
  const parts = [];
  const constants = [];
  return {
    get size() {
      return parts.length;
    },
    add(geometry, matrix, colour, { glow = 0, rough = 0.6, metal = 0 } = {}) {
      if (geometry.attributes.uv) geometry.deleteAttribute('uv');
      if (geometry.attributes.uv1) geometry.deleteAttribute('uv1');
      if (matrix) geometry.applyMatrix4(matrix);
      if (!geometry.attributes.normal) geometry.computeVertexNormals();
      parts.push(geometry);
      const c = new THREE.Color(colour);
      constants.push({ color: [c.r, c.g, c.b], aGlow: glow, aSurface: [rough, metal] });
    },
    build() {
      return mergeGeometries(parts, NAMES, constants);
    },
  };
}

/** A lathe from [radius, height] pairs. */
export function lathe(profile, segments = 12) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}
