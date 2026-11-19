// Distance-culled instancing: keeps all instance matrices on the CPU and uploads only those near the camera.
import * as THREE from '../../vendor/three.module.min.js';

const REFRESH_DISTANCE = 12;

/**
 * Wraps an InstancedMesh holding `matrices` (THREE.Matrix4[]) and optional `colours` (THREE.Color[]). refresh(point)
 * re-uploads the instances within `radius` of point, but only after the point moved REFRESH_DISTANCE metres.
 */
export function createCulledInstances(mesh, matrices, colours, radius) {
  const positions = matrices.map((m) => new THREE.Vector3().setFromMatrixPosition(m));
  const last = new THREE.Vector3(Infinity, 0, 0);
  const radiusSq = radius * radius;
  mesh.frustumCulled = false;
  return {
    mesh,
    total: matrices.length,
    refresh(point, force = false) {
      if (!force && last.distanceToSquared(point) < REFRESH_DISTANCE * REFRESH_DISTANCE) return;
      last.copy(point);
      let count = 0;
      for (let index = 0; index < matrices.length; index += 1) {
        const p = positions[index];
        const dx = p.x - point.x;
        const dz = p.z - point.z;
        if (dx * dx + dz * dz > radiusSq) continue;
        mesh.setMatrixAt(count, matrices[index]);
        if (colours && mesh.instanceColor) mesh.setColorAt(count, colours[index]);
        count += 1;
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
}
