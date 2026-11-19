// Crowd mesh: every character in one instanced draw, bones/variants/colours read from a float data texture.
import * as THREE from '../../vendor/three.module.min.js';
import { mergeGeometries } from '../core/meshbuilder.js';
import { buildBodyPieces } from './bodyparts.js';
import { buildWardrobePieces } from './wardrobe.js';
import { PART_NAMES, COLOUR_CHANNELS } from '../palette.js';

const COLUMNS = 64;
const VARIANT_TEXEL = 51;
const FLAGS_TEXEL = 52;
const COLOUR_TEXEL = 53;
export const BONE_FLOATS = PART_NAMES.length * 12;

const VERTEX_PARS = /* glsl */ `
attribute vec4 aRig;
attribute vec2 aSurf;
uniform highp sampler2D uCrowd;
varying vec3 vCrowdColour;
varying vec2 vCrowdSurf;
varying vec3 vCrowdLocal;
mat4 crowdMatrix;
float crowdHide;
vec4 crowdTexel(float column) {
  return texelFetch(uCrowd, ivec2(int(column), gl_InstanceID), 0);
}
mat4 crowdBone(float bone) {
  vec4 r0 = crowdTexel(bone * 3.0);
  vec4 r1 = crowdTexel(bone * 3.0 + 1.0);
  vec4 r2 = crowdTexel(bone * 3.0 + 2.0);
  return mat4(r0.x, r1.x, r2.x, 0.0, r0.y, r1.y, r2.y, 0.0, r0.z, r1.z, r2.z, 0.0, r0.w, r1.w, r2.w, 1.0);
}
float crowdHidden() {
  vec4 variants = crowdTexel(${VARIANT_TEXEL}.0);
  vec4 flags = crowdTexel(${FLAGS_TEXEL}.0);
  if (flags.z < 0.5) return 1.0;
  float slot = aRig.y;
  if (slot < 0.5) return 0.0;
  float chosen = slot < 1.5 ? variants.x : slot < 2.5 ? variants.y : slot < 3.5 ? variants.z
    : slot < 4.5 ? variants.w : slot < 5.5 ? flags.x : flags.y;
  return abs(chosen - aRig.z) > 0.5 ? 1.0 : 0.0;
}
`;

/** Fetch visibility first and the bone only for visible vertices; hidden variants collapse to one point. */
const FETCH_BONE = /* glsl */ `
  crowdHide = crowdHidden();
  crowdMatrix = crowdHide > 0.5 ? mat4(0.0) : crowdBone(aRig.x);
`;

const SKIN_VERTEX = /* glsl */ `
  vCrowdLocal = position;
  transformed = crowdHide > 0.5 ? vec3(0.0, -9000.0, 0.0) : (crowdMatrix * vec4(transformed, 1.0)).xyz;
  vCrowdColour = crowdHide > 0.5 ? vec3(0.0) : crowdTexel(${COLOUR_TEXEL}.0 + aRig.w).rgb;
  vCrowdSurf = aSurf;
`;

const FRAGMENT_PARS = /* glsl */ `
uniform sampler2D uFabric;
varying vec3 vCrowdColour;
varying vec2 vCrowdSurf;
varying vec3 vCrowdLocal;
`;

function inject(shader, uniforms, withNormals) {
  Object.assign(shader.uniforms, uniforms);
  let vertex = shader.vertexShader.replace('#include <common>', `#include <common>\n${VERTEX_PARS}`);
  if (withNormals) {
    vertex = vertex.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${FETCH_BONE}
  objectNormal = crowdHide > 0.5 ? vec3(0.0, 1.0, 0.0) : normalize(mat3(crowdMatrix) * objectNormal);`);
    shader.vertexShader = vertex.replace('#include <begin_vertex>', `#include <begin_vertex>\n${SKIN_VERTEX}`);
  } else {
    shader.vertexShader = vertex.replace('#include <begin_vertex>',
      `#include <begin_vertex>\n${FETCH_BONE}\n${SKIN_VERTEX}`);
  }
}

function createMaterials(dataTexture, fabric) {
  const uniforms = { uCrowd: { value: dataTexture }, uFabric: { value: fabric } };
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  material.onBeforeCompile = (shader) => {
    inject(shader, uniforms, true);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float weave = texture2D(uFabric, vCrowdLocal.xy * 7.0 + vCrowdLocal.zx * 4.0).g;
  float fold = texture2D(uFabric, vCrowdLocal.yz * 1.6).r;
  diffuseColor.rgb *= vCrowdColour * (0.86 + weave * 0.22) * (0.9 + fold * 0.2);`)
      .replace('#include <roughnessmap_fragment>', `
  float roughnessFactor = clamp(vCrowdSurf.x * (0.85 + weave * 0.3), 0.05, 1.0);`)
      .replace('#include <metalnessmap_fragment>', `
  float metalnessFactor = vCrowdSurf.y;`);
  };
  material.customProgramCacheKey = () => 'crowd-v1';
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = (shader) => inject(shader, uniforms, false);
  depth.customProgramCacheKey = () => 'crowd-depth-v1';
  return { material, depth };
}

function buildGeometry() {
  const pieces = [...buildBodyPieces(), ...buildWardrobePieces()];
  const geometries = [];
  const constants = [];
  for (const p of pieces) {
    if (!p.geometry.attributes.normal) p.geometry.computeVertexNormals();
    geometries.push(p.geometry);
    constants.push({ aRig: [p.bone, p.slot, p.variant, p.channel], aSurf: [p.rough, p.metal] });
  }
  const merged = mergeGeometries(geometries, ['position', 'normal', 'aRig', 'aSurf'], constants);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = merged.index;
  for (const name of ['position', 'normal', 'aRig', 'aSurf']) geometry.setAttribute(name, merged.attributes[name]);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return geometry;
}

/**
 * A crowd of up to `capacity` characters. Row i holds character i: call setAppearance once, setBones every
 * frame, then commit() to upload.
 */
export function createCrowd(capacity, fabricTexture) {
  const data = new Float32Array(COLUMNS * capacity * 4);
  const texture = new THREE.DataTexture(data, COLUMNS, capacity, THREE.RGBAFormat, THREE.FloatType);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  const geometry = buildGeometry();
  geometry.instanceCount = capacity;
  const { material, depth } = createMaterials(texture, fabricTexture);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.customDepthMaterial = depth;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'crowd';

  const texel = (row, column) => (row * COLUMNS + column) * 4;
  return {
    mesh,
    capacity,
    vertexCount: geometry.attributes.position.count,
    setAppearance(row, appearance) {
      const v = appearance.variants;
      data.set([v.hair, v.top, v.bottom, v.outer], texel(row, VARIANT_TEXEL));
      data.set([v.shoes, v.accessory, 1, 0], texel(row, FLAGS_TEXEL));
      COLOUR_CHANNELS.forEach((name, index) => {
        const colour = appearance.colours[name];
        data.set([colour.r, colour.g, colour.b, 1], texel(row, COLOUR_TEXEL + index));
      });
    },
    setVisible(row, visible) {
      data[texel(row, FLAGS_TEXEL) + 2] = visible ? 1 : 0;
    },
    /** 17 bones x 12 floats (3x4 rows), as rig.solvePose writes them. */
    setBones(row, bones) {
      data.set(bones, texel(row, 0));
    },
    commit() {
      texture.needsUpdate = true;
    },
  };
}
