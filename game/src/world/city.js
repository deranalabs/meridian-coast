// City assembly: builds the layout, then terrain, water, roads, sidewalks, buildings, signs and props.
import * as THREE from '../../vendor/three.module.min.js';
import { buildLayout } from './layout.js';
import { createTerrain } from './terrain.js';
import { createWater } from './water.js';
import { createRoads } from './roads.js';
import { createSidewalks } from './sidewalks.js';
import { createSurfaceTextures } from './surfaces.js';
import { createFacadeAtlas } from './facades.js';
import { createFacadeMaterial } from './facadematerial.js';
import { createFacadeBuilder } from './buildingkit.js';
import { buildBuildings } from './buildings.js';
import { addCasino } from './casino.js';
import { DISTRICT_BY_ID } from './districts.js';
import { createSigns } from './signs.js';
import { createProps } from './props.js';
import { createLightPools } from './lightpools.js';

/** Build the static city; returns {group, layout, buildings, props, update(time)}. */
export function createCity(seed, timeOfDay) {
  const group = new THREE.Group();
  group.name = 'city';
  const layout = buildLayout(seed);
  const surfaces = createSurfaceTextures(seed + 2);
  const terrain = createTerrain(surfaces, timeOfDay);
  group.add(terrain);
  const water = createWater(timeOfDay);
  group.add(water.mesh);
  const roads = createRoads(layout, terrain.material, seed);
  group.add(roads.ribbons, roads.paint);
  group.add(createSidewalks(layout, surfaces, timeOfDay));

  const atlas = createFacadeAtlas(seed + 4);
  const facadeMaterial = createFacadeMaterial(atlas, timeOfDay);
  const builder = createFacadeBuilder();
  const buildings = buildBuildings(builder, layout, seed);
  const casinoBlock = layout.blocks.find((block) => block.reserved === 'casino');
  const casino = casinoBlock ? addCasino(builder, casinoBlock, DISTRICT_BY_ID.neon.sidewalk) : null;
  if (casino) buildings.signs.push(...casino.signs);
  const buildingMesh = new THREE.Mesh(builder.build(), facadeMaterial);
  buildingMesh.name = 'buildings';
  buildingMesh.castShadow = true;
  buildingMesh.receiveShadow = true;
  group.add(buildingMesh);

  const signs = createSigns(buildings, timeOfDay, seed);
  group.add(signs.group);
  const props = createProps(layout, buildings, signs.billboards, surfaces, timeOfDay, seed);
  group.add(props.group);
  const pools = createLightPools(props.lamps, [...buildings.glows, ...signs.glows], timeOfDay);
  group.add(pools.group);

  return {
    group,
    layout,
    buildings,
    casino,
    props,
    surfaces,
    update(time) {
      water.update(time);
      signs.update(time);
    },
    /** Re-cull instanced props and light pools around the camera. */
    cull(point) {
      props.update(point);
      pools.update(point);
    },
  };
}
