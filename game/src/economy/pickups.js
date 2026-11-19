// Cash pickups: glowing bill stacks dropped by downed people; walk or drive over one to collect it.
import * as THREE from '../../vendor/three.module.min.js';
import { PICKUPS } from '../data/prices.js';
import { receive } from './wallet.js';

/** Pickups listening to 'drop' events; update(dt, collector, wallet, time) spins and collects them. */
export function createPickups(events, random, capacity = 24) {
  const geometry = new THREE.BoxGeometry(0.34, 0.12, 0.18);
  const material = new THREE.MeshStandardMaterial({ color: '#4fd27a', emissive: '#2bff7a', emissiveIntensity: 1.6,
    roughness: 0.5 });
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.name = 'pickups';
  const items = [];
  const matrix = new THREE.Matrix4();
  const euler = new THREE.Euler();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const unit = new THREE.Vector3(1, 1, 1);

  events.on('drop', (e) => {
    const range = e.kind === 'officer' ? PICKUPS.officerDrop : PICKUPS.pedestrianDrop;
    const amount = Math.round(range[0] + random.next() * (range[1] - range[0]));
    if (items.length >= capacity) items.shift();
    items.push({ x: e.x + 0.6, z: e.z + 0.4, amount, age: 0 });
  });

  return {
    mesh,
    items,
    update(dt, collector, wallet, time, heightAt) {
      for (let i = items.length - 1; i >= 0; i -= 1) {
        const item = items[i];
        item.age += dt;
        const reach = collector.driving ? 2.4 : 1.3;
        if (item.age > 0.6 && Math.hypot(item.x - collector.x, item.z - collector.z) < reach) {
          receive(wallet, item.amount);
          events.emit('cash', { amount: item.amount });
          items.splice(i, 1);
        } else if (item.age > 90) items.splice(i, 1);
      }
      items.forEach((item, index) => {
        euler.set(0, time * 2.4 + index, 0);
        quaternion.setFromEuler(euler);
        position.set(item.x, heightAt(item.x, item.z) + 0.35 + Math.sin(time * 3 + index) * 0.08, item.z);
        matrix.compose(position, quaternion, unit);
        mesh.setMatrixAt(index, matrix);
      });
      mesh.count = items.length;
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
