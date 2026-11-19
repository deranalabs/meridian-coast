// Mission crews: armed people of a faction who stand guard, turn on Ilo when he comes close or opens fire,
// shoot with the police hit model, and go down when shot; the director counts who is still standing.
import { createPoliceGunfire } from '../police/gunfire.js';
import { createRandom } from '../core/random.js';
import { knockDown, stepRagdoll } from '../actors/ragdoll.js';
import { castAppearance } from '../actors/castlook.js';
import { FACTION_INFO } from '../palette.js';

const HAIR = ['buzz', 'beanie', 'crop', 'cap'];
const TOPS = ['hoodie', 'tee', 'sweater', 'longsleeve'];

/** A crew look in a faction's colours, varied by index. */
function crewLook(faction, index) {
  const info = FACTION_INFO[faction] ?? FACTION_INFO.saltDogs;
  return castAppearance({
    id: `${faction}-${index}`,
    look: { skin: (index * 3 + 1) % 5, build: index % 2 ? 'broad' : 'average', hair: HAIR[index % 4],
      hairColour: index % 2 ? '#1b1410' : info.shade, top: TOPS[index % 4], bottom: 'cargo',
      outer: index % 3 === 2 ? '' : 'windbreaker', shoes: 'boots', accessory: '',
      colours: { top: '#22232b', bottom: '#3a3a40', outer: info.colour, outerLining: info.shade, shoe: '#1a1214',
        accent: info.colour } },
  });
}

/**
 * Crew `group` standing at `spots` ([{x, z}]). options: faction, hp, range (m they notice Ilo from), weapon,
 * rate (seconds between shots). Pools the characters on the game so restarts reuse them.
 */
export function createCrew(game, group, spots, { faction = 'saltDogs', hp = 45, range = 26, weapon = 'pistol',
  rate = 1.5 } = {}) {
  const { characters, ground, colliders, player, ilo } = game;
  const pool = (game.crewPool ??= []);
  const random = createRandom(group.length * 97 + spots.length);
  const gunfire = createPoliceGunfire({ effects: game.action.effects, events: game.action.events, colliders,
    random: () => random.next() });
  const target = { x: 0, y: 0, z: 0, driving: false, speed: 0 };
  const members = spots.map((spot, index) => {
    if (!pool[index]) pool[index] = characters.add(crewLook(faction, index));
    const character = pool[index];
    characters.restyle(character, crewLook(faction, index));
    character.visible = true;
    character.tilt = 0;
    character.lift = 0;
    character.ragdoll = null;
    character.position.set(spot.x, ground.surfaceAt(spot.x, spot.z).height, spot.z);
    character.heading = random.next() * Math.PI * 2;
    character.play('idle');
    const member = { kind: 'crew', group, character, weapon, hp, down: false, alert: false,
      cooldown: 0.6 + random.next() * rate };
    member.hurt = (hit) => {
      if (member.down) return { killed: false };
      member.alert = true;
      member.hp -= hit.damage;
      if (member.hp > 0) return { killed: false };
      member.down = true;
      knockDown(character, hit.dirX ?? 0, hit.dirZ ?? 1, 3);
      return { killed: true };
    };
    character.owner = member;
    return member;
  });
  const crew = { group, standing: members.length };

  crew.update = (dt) => {
    const p = player.state;
    const at = p.car ? p.car.position : ilo.position;
    Object.assign(target, { x: at.x, y: at.y, z: at.z, driving: p.mode === 'driving',
      speed: p.mode === 'driving' ? p.vehicle.speed : ilo.speed });
    let standing = 0;
    for (const m of members) {
      const c = m.character;
      if (m.down) {
        stepRagdoll(c, dt, (x, z) => ground.surfaceAt(x, z).height, (x, z, r) => colliders.resolveCircle(x, z, r));
        continue;
      }
      standing += 1;
      const d = Math.hypot(at.x - c.position.x, at.z - c.position.z);
      if (d < range) m.alert = true;
      if (!m.alert || p.down) continue;
      c.heading = Math.atan2(at.x - c.position.x, at.z - c.position.z);
      c.play('aim');
      m.cooldown -= dt;
      if (m.cooldown <= 0 && d < range * 1.6) {
        m.cooldown = rate * (0.7 + random.next() * 0.6);
        gunfire.fire(m, target, player);
      }
    }
    crew.standing = standing;
  };
  crew.addBlips = (list) => {
    for (const m of members) {
      if (!m.down) list.push({ x: m.character.position.x, z: m.character.position.z, colour: '#ff4a5a' });
    }
  };
  crew.dispose = () => {
    for (const m of members) {
      m.character.visible = false;
      m.character.owner = null;
    }
  };
  return crew;
}
