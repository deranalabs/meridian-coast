// Weapon bar: the four weapon slots with their number keys and ammo, owned ones lit, the held one highlighted.
import { WEAPONS, WEAPON_ORDER } from '../combat/weapons.js';

const SHORT = { fists: 'Fists', pistol: 'H9', smg: 'SMG', shotgun: 'B12' };

/** Build the bar inside `parent`; update(arsenal) refreshes it from {owned, current}. */
export function createWeaponBar(parent) {
  const root = document.createElement('div');
  root.className = 'weaponbar';
  const slots = WEAPON_ORDER.map((id, index) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerHTML = `<kbd>${index + 1}</kbd><span class="n">${SHORT[id] ?? WEAPONS[id].name}</span>`
      + '<span class="a"></span>';
    root.appendChild(slot);
    return { id, slot, ammo: slot.querySelector('.a') };
  });
  parent.appendChild(root);
  let last = '';
  return {
    root,
    update(arsenal) {
      const parts = slots.map(({ id }) => {
        const owned = arsenal.owned[id];
        return owned ? `${id}:${owned.clip + owned.reserve}` : '-';
      });
      const key = `${arsenal.current}|${parts.join()}`;
      if (key === last) return;
      last = key;
      for (const { id, slot, ammo } of slots) {
        const owned = arsenal.owned[id];
        slot.classList.toggle('owned', Boolean(owned));
        slot.classList.toggle('current', id === arsenal.current);
        ammo.textContent = owned && !WEAPONS[id].melee ? String(owned.clip + owned.reserve) : '';
      }
    },
  };
}
