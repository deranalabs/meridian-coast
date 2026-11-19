// Mesh building: a vertex/index accumulator with named custom attributes, and a geometry merger.
import * as THREE from '../../vendor/three.module.min.js';

/**
 * Accumulates triangles. `layout` maps attribute names to item sizes, e.g. {position: 3, normal: 3, uv: 2}.
 * vertex(values) takes {name: number | number[]}; missing attributes default to `defaults`.
 */
export class MeshBuilder {
  constructor(layout, defaults = {}, uvName = 'uv') {
    this.layout = layout;
    this.defaults = defaults;
    this.uvName = uvName;
    this.data = Object.fromEntries(Object.keys(layout).map((name) => [name, []]));
    this.indices = [];
    this.count = 0;
  }

  vertex(values) {
    for (const [name, size] of Object.entries(this.layout)) {
      const value = values[name] ?? this.defaults[name];
      const target = this.data[name];
      if (size === 1) target.push(value ?? 0);
      else for (let k = 0; k < size; k += 1) target.push(value ? value[k] : 0);
    }
    this.count += 1;
    return this.count - 1;
  }

  triangle(a, b, c) {
    this.indices.push(a, b, c);
  }

  /** A quad from four corners in counter-clockwise order (seen from the front), with shared extras. */
  quad(corners, normal, uvs, extras = {}) {
    const base = this.count;
    for (let index = 0; index < 4; index += 1) {
      this.vertex({ ...extras, position: corners[index], normal, [this.uvName]: uvs[index] });
    }
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  /**
   * A closed drum facing +z: centre [x, y, z] of its back face, `radius`, `depth` towards +z and `segments` round.
   * The side gets smooth normals, the front a flat cap; uv.x runs 0..1 round the rim (or the cap's angle), so a
   * shader can light an arc of it. `extras` are shared attribute values. Returns the first vertex index.
   */
  cylinder([x, y, z], radius, depth, segments = 24, extras = {}) {
    const first = this.count;
    for (let i = 0; i <= segments; i += 1) {
      const a = (i / segments) * Math.PI * 2;
      const s = Math.sin(a);
      const c = Math.cos(a);
      for (const dz of [0, depth]) {
        this.vertex({ ...extras, position: [x + s * radius, y + c * radius, z + dz], normal: [s, c, 0],
          [this.uvName]: [i / segments, dz ? 1 : 0] });
      }
      if (i > 0) {
        const b = first + i * 2;
        this.indices.push(b - 2, b + 1, b, b - 2, b - 1, b + 1);
      }
    }
    const centre = this.vertex({ ...extras, position: [x, y, z + depth], normal: [0, 0, 1], [this.uvName]: [0.5, 0.5] });
    for (let i = 0; i <= segments; i += 1) {
      const a = (i / segments) * Math.PI * 2;
      this.vertex({ ...extras, position: [x + Math.sin(a) * radius, y + Math.cos(a) * radius, z + depth],
        normal: [0, 0, 1], [this.uvName]: [i / segments, 0.98] });
      if (i > 0) this.indices.push(centre, centre + i + 1, centre + i);
    }
    return first;
  }

  build() {
    const geometry = new THREE.BufferGeometry();
    for (const [name, size] of Object.entries(this.layout)) {
      geometry.setAttribute(name, new THREE.Float32BufferAttribute(this.data[name], size));
    }
    const IndexArray = this.count > 65535 ? Uint32Array : Uint16Array;
    geometry.setIndex(new THREE.BufferAttribute(new IndexArray(this.indices), 1));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return geometry;
  }
}

/**
 * Merge indexed or non-indexed geometries into one indexed geometry. Every input must carry the attributes
 * in `names`; per-geometry constant attributes can be supplied with `constants[i] = {name: value}`.
 */
export function mergeGeometries(geometries, names, constants = []) {
  const sizes = {};
  let vertexTotal = 0;
  let indexTotal = 0;
  for (const geometry of geometries) {
    vertexTotal += geometry.attributes.position.count;
    indexTotal += geometry.index ? geometry.index.count : geometry.attributes.position.count;
  }
  const arrays = {};
  for (const name of names) {
    const sample = geometries.find((g) => g.attributes[name]);
    const constantSample = constants.find((c) => c && c[name] !== undefined);
    sizes[name] = sample ? sample.attributes[name].itemSize : [constantSample[name]].flat().length;
    arrays[name] = new Float32Array(vertexTotal * sizes[name]);
  }
  const IndexArray = vertexTotal > 65535 ? Uint32Array : Uint16Array;
  const indices = new IndexArray(indexTotal);
  let vertexOffset = 0;
  let indexOffset = 0;
  geometries.forEach((geometry, gi) => {
    const count = geometry.attributes.position.count;
    for (const name of names) {
      const size = sizes[name];
      const constant = constants[gi]?.[name];
      const target = arrays[name];
      if (constant !== undefined) {
        const values = [constant].flat();
        for (let v = 0; v < count; v += 1) {
          for (let k = 0; k < size; k += 1) target[(vertexOffset + v) * size + k] = values[k];
        }
      } else {
        const source = geometry.attributes[name];
        for (let v = 0; v < count; v += 1) {
          for (let k = 0; k < size; k += 1) target[(vertexOffset + v) * size + k] = source.getComponent(v, k);
        }
      }
    }
    if (geometry.index) {
      for (let i = 0; i < geometry.index.count; i += 1) {
        indices[indexOffset + i] = geometry.index.getX(i) + vertexOffset;
      }
      indexOffset += geometry.index.count;
    } else {
      for (let i = 0; i < count; i += 1) indices[indexOffset + i] = vertexOffset + i;
      indexOffset += count;
    }
    vertexOffset += count;
  });
  const merged = new THREE.BufferGeometry();
  for (const name of names) merged.setAttribute(name, new THREE.BufferAttribute(arrays[name], sizes[name]));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

/** Bake a matrix into a geometry clone (positions and normals). */
export function transformed(geometry, matrix) {
  const copy = geometry.clone();
  copy.applyMatrix4(matrix);
  return copy;
}

const tempMatrix = new THREE.Matrix4();
const tempQuaternion = new THREE.Quaternion();
const tempEuler = new THREE.Euler();

/** A matrix from position [x, y, z], Euler rotation [x, y, z] and scale (number or [x, y, z]). */
export function composeMatrix(position, rotation = [0, 0, 0], scale = 1) {
  tempEuler.set(rotation[0], rotation[1], rotation[2]);
  tempQuaternion.setFromEuler(tempEuler);
  const s = Array.isArray(scale) ? scale : [scale, scale, scale];
  return tempMatrix.compose(
    new THREE.Vector3(position[0], position[1], position[2]),
    tempQuaternion,
    new THREE.Vector3(s[0], s[1], s[2]),
  ).clone();
}
