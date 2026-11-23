// Shops: place markers, the walk-in prompt, menu navigation, live clothing preview and what each purchase does.
import * as THREE from '../../vendor/three.module.min.js';
import { PLACES, USABLE } from '../data/places.js';
import { CLOTHING } from '../data/clothing.js';
import { findPlaces } from '../world/placefinder.js';
import { createMarkers } from './markers.js';
import { itemsFor, buy, SHOP_TITLES } from './catalog.js';
import { withItem, dressed } from './outfit.js';
import { createShopMenu } from '../ui/shopmenu.js';
import { CAR_PAINTS } from '../palette.js';

const KIND_LABEL = { gun: 'Gun shop', clothes: 'Clothing', dealer: 'Car dealer', spray: 'Spray bay', food: 'Food stand',
  safehouse: 'Safe house', garage: 'Garage' };
const REACH = { spray: 6, dealer: 4.5, garage: 4.5 };
const BLIP_LETTER = { gun: 'G', clothes: 'C', dealer: 'D', spray: 'S', food: 'F', safehouse: 'H', garage: 'L' };
const makeColour = (hex) => new THREE.Color(hex);

/** Build shops over a game; hooks = {save(), say(html)}. update(dt, input) returns true while a menu is open. */
export function createShops(game, hooks) {
  const places = findPlaces(game.city.layout, PLACES).map((place) => ({
    ...place, y: game.ground.surfaceAt(place.x, place.z).height, kindLabel: KIND_LABEL[place.kind],
  }));
  const markers = createMarkers(places);
  game.scene.add(markers.mesh);
  const menu = createShopMenu();
  const player = game.player;
  const state = { place: null, index: 0, note: '', outfit: game.outfit };
  const blips = places.filter((place) => USABLE.has(place.kind)).map((place) => ({ x: place.x, z: place.z,
    colour: place.colour, shop: true, letter: BLIP_LETTER[place.kind], label: place.name }));

  function context() {
    const p = player.state;
    return { wallet: p.wallet, arsenal: p.arsenal, vitals: p.vitals, outfit: game.outfit, cars: game.ownedCars,
      driving: p.mode === 'driving', stars: game.action.police.wanted.stars,
      gear: game.missions?.gearWanted() ?? [], lockedBy: game.respect?.lockedBy ?? null };
  }

  function wear(outfit) {
    game.characters.restyle(game.ilo, dressed(game.baseLook, outfit, makeColour));
  }

  function preview() {
    if (state.place?.kind !== 'clothes') return;
    const items = itemsFor('clothes', context());
    const item = CLOTHING.find((c) => `wear:${c.id}` === items[state.index]?.id);
    wear(item ? withItem(game.outfit, item) : game.outfit);
  }

  function nearest() {
    const p = player.state;
    const at = p.mode === 'driving' ? p.car.position : game.ilo.position;
    let best = null;
    for (const place of places) {
      if (!USABLE.has(place.kind)) continue;
      const d = Math.hypot(place.x - at.x, place.z - at.z);
      if (d < (REACH[place.kind] ?? 2.2) && (!best || d < best.d)) best = { place, d };
    }
    return best?.place ?? null;
  }

  function placeCar(type, colour, place) {
    const car = game.fleet.reuse(type, colour);
    if (!car) return null;
    const x = place.x + place.outX * 2.5;
    const z = place.z + place.outZ * 2.5;
    car.position.set(x, game.ground.surfaceAt(x, z).height, z);
    car.heading = Math.atan2(-place.outZ, place.outX);
    car.owned = true;
    car.parked = true;
    return car;
  }

  function apply(effect) {
    if (effect.outfit) {
      game.outfit = effect.outfit;
      wear(game.outfit);
    }
    if (effect.respray) {
      const car = player.state.car;
      const colour = CAR_PAINTS[(Math.floor(game.time * 7) + car.index) % CAR_PAINTS.length];
      game.fleet.setColour(car, colour);
      car.owned = true;
      game.action.police.standDown();
      game.action.events.emit('respray', { car });
    }
    if (effect.spawnCar) {
      const car = placeCar(effect.spawnCar, CAR_PAINTS[game.ownedCars.length * 5 % CAR_PAINTS.length], state.place);
      if (car) game.ownedCars[game.ownedCars.length - 1].colour = `#${car.colour.getHexString()}`;
    }
    if (effect.fetchCar !== undefined) {
      const saved = game.ownedCars[effect.fetchCar];
      if (saved) placeCar(saved.type, saved.colour, state.place);
      close();
    }
    if (effect.save) hooks.save();
  }

  function open(place) {
    state.place = place;
    state.index = 0;
    state.note = '';
    player.state.frozen = true;
    menu.show(place, SHOP_TITLES[place.kind] ?? '');
    // The shop's id goes with it, so the career record knows which doors Ilo has been through.
    game.action.events.emit('ui', { kind: 'open', place: place.id });
    preview();
  }

  function close() {
    if (!state.place) return;
    if (state.place.kind === 'clothes') wear(game.outfit);
    state.place = null;
    player.state.frozen = false;
    menu.hide();
    game.action.events.emit('ui', { kind: 'close' });
  }

  function updateMenu(input) {
    const items = itemsFor(state.place.kind, context());
    const step = (input.pressed('KeyS') || input.pressed('ArrowDown') ? 1 : 0)
      - (input.pressed('KeyW') || input.pressed('ArrowUp') ? 1 : 0);
    if (step) {
      state.index = (state.index + step + items.length) % items.length;
      state.note = '';
      game.action.events.emit('ui', { kind: 'move' });
      preview();
    }
    if (input.pressed('Enter') || input.pressed('KeyE') || input.pressed('Space')) {
      const result = buy(state.place.kind, items[state.index].id, context());
      state.note = result.message;
      game.action.events.emit('ui', { kind: result.ok ? 'buy' : 'deny' });
      if (result.ok) {
        game.action.events.emit('purchase', { id: items[state.index].id, kind: state.place.kind });
        apply(result.effect ?? {});
        hooks.say?.(result.message);
      }
    }
    if (input.pressed('Escape') || input.pressed('Backspace') || input.pressed('KeyQ')) close();
    if (!state.place) return;
    menu.render(itemsFor(state.place.kind, context()), state.index, player.state.wallet.cash, state.note);
  }

  return {
    places,
    blips,
    markers,
    open,
    close,
    get openPlace() {
      return state.place;
    },
    /** One step; returns the prompt text when standing at a usable place. */
    update(dt, input) {
      markers.update(game.time);
      if (state.place) {
        updateMenu(input);
        return null;
      }
      const place = nearest();
      if (!place || player.state.mode === 'entering' || player.state.mode === 'exiting') return null;
      const driving = player.state.mode === 'driving';
      if (driving !== (place.kind === 'spray') && place.kind !== 'garage') return null;
      if (input.pressed('KeyE')) {
        input.consume?.('KeyE');
        open(place);
        return null;
      }
      return `Press <kbd>E</kbd> &mdash; ${place.name}`;
    },
  };
}
