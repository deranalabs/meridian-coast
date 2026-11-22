// Hidden packages in play: collecting them, the HUD's count, the full map's dots and the set a save keeps.
import { packageSpots } from '../world/packagespots.js';
import { createParcels } from '../economy/parcels.js';
import { PACKAGE_COUNT, PACKAGE_PAY, createFound, collectAt, cleanFound, restoreFound } from '../economy/packages.js';

const DOT = '#ffc94a';

/** The HUD's line for the `found`th package. */
function foundLine(found) {
  const count = found === PACKAGE_COUNT ? `All ${PACKAGE_COUNT} packages found` : `Packages ${found}/${PACKAGE_COUNT}`;
  return `${count} <em>+$${PACKAGE_PAY}</em>`;
}

/**
 * game.packages. A staged scene only counts them: it has no parcels, dots or collecting, so its frame and its
 * staged totals stay as they were staged.
 */
export function createPackages(game, { staged = false } = {}) {
  const { city, ground, colliders } = game;
  const found = createFound();
  const spots = staged ? [] : packageSpots({ layout: city.layout, ground, colliders }, game.seed);
  const parcels = staged ? null : createParcels(spots);
  if (parcels) game.scene.add(parcels.group);
  const who = { x: 0, z: 0, driving: false };

  return {
    spots,
    active: !staged,
    get count() {
      return found.size;
    },
    total: PACKAGE_COUNT,
    list: () => cleanFound([...found]),
    restore: (saved) => restoreFound(found, saved),
    /** The full map's dots, one for each still out there. */
    dots: () => spots.filter((spot, index) => !found.has(index))
      .map(({ x, z }) => ({ x, z, parcel: true, colour: DOT })),
    update(time) {
      if (!parcels) return;
      const { mode, car, wallet } = game.player.state;
      who.driving = mode === 'driving' && Boolean(car);
      const at = who.driving ? car.position : game.ilo.position;
      who.x = at.x;
      who.z = at.z;
      if (!game.services.respawn.active && collectAt(spots, found, who, wallet) >= 0) {
        game.action.events.emit('cash', { amount: PACKAGE_PAY });
        // Said after the event's own "+$150", which it replaces.
        game.hud.say(foundLine(found.size), 3);
      }
      parcels.update(found, time);
    },
  };
}
