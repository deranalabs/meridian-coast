// City assembly: builds the layout, then the terrain, water, sidewalks and building meshes into one group.
import * as THREE from '../../vendor/three.module.min.js';
import { buildLayout } from './layout.js';
import { createTerrain } from './terrain.js';
import { createWater } from './water.js';
import { createSidewalks } from './sidewalks.js';
import { createSurfaceTextures } from './surfaces.js';
import { createFacadeAtlas } from './facades.js';
import { createFacadeMaterial } from './facadematerial.js';
import { createFacadeBuilder } from './buildingkit.js';
import { buildBuildings } from './buildings.js';

/** Build the static city; returns {group, layout, buildings, update(time)}. */
export function createCity(seed, timeOfDay) {
  const group = new THREE.Group();
  group.name = 'city';
  const layout = buildLayout(seed);
  const surfaces = createSurfaceTextures(seed + 2);
  group.add(createTerrain(surfaces, timeOfDay));
  const water = createWater(timeOfDay);
  group.add(water.mesh);
  group.add(createSidewalks(layout, surfaces, timeOfDay));

  const atlas = createFacadeAtlas(seed + 4);
  const facadeMaterial = createFacadeMaterial(atlas, timeOfDay);
  const builder = createFacadeBuilder();
  const buildings = buildBuildings(builder, layout, seed);
  const buildingMesh = new THREE.Mesh(builder.build(), facadeMaterial);
  buildingMesh.name = 'buildings';
  buildingMesh.castShadow = true;
  buildingMesh.receiveShadow = true;
  group.add(buildingMesh);

  return {
    group,
    layout,
    buildings,
    surfaces,
    update(time) {
      water.update(time);
    },
  };
}
