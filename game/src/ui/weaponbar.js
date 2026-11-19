// Weapon bar: one numbered slot per weapon, lit when owned, framed when held, with clip + reserve under guns.
import { WEAPONS, WEAPON_ORDER } from '../combat/weapons.js';

/** The ammo line for a slot: empty for melee and for guns not owned. */
export function ammoText(weapon, owned) {
  if (weapon.melee || !owned) return '';
  return `${owned.clip} + ${owned.reserve}`;
}

/** createWeaponBar(parent) → { root, update(arsenal) }; update skips the DOM when nothing changed. */
export function createWeaponBar(parent) {
  const root = document.createElement('div');
  root.className = 'weaponbar';
  parent.appendChild(root);
  const ids = WEAPON_ORDER.filter((id) => WEAPONS[id]);
  for (const id of Object.keys(WEAPONS)) if (!ids.includes(id)) ids.push(id);
  const slots = ids.map((id, index) => {
    const weapon = WEAPONS[id];
    const node = document.createElement('div');
    node.className = `wslot ${weapon.melee ? 'melee' : 'gun'}`;
    node.innerHTML = `<kbd>${index + 1}</kbd><span class="wname"></span><span class="wammo"></span>`;
    node.querySelector('.wname').textContent = weapon.name;
    root.appendChild(node);
    return { id, weapon, node, ammo: node.querySelector('.wammo'), owned: null, current: null, clip: -1, reserve: -1 };
  });

  return {
    root,
    update(arsenal) {
      if (!arsenal) return;
      for (const slot of slots) {
        const owned = arsenal.owned[slot.id];
        const has = Boolean(owned) || slot.weapon.melee === true;
        const held = arsenal.current === slot.id;
        const clip = owned?.clip ?? 0;
        const reserve = owned?.reserve ?? 0;
        if (has === slot.owned && held === slot.current && clip === slot.clip && reserve === slot.reserve) continue;
        if (has !== slot.owned) slot.node.classList.toggle('owned', has);
        if (held !== slot.current) slot.node.classList.toggle('current', held);
        slot.node.classList.toggle('dry', has && !slot.weapon.melee && clip + reserve === 0);
        slot.ammo.textContent = ammoText(slot.weapon, owned);
        slot.owned = has;
        slot.current = held;
        slot.clip = clip;
        slot.reserve = reserve;
      }
    },
  };
}
