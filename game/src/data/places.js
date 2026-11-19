// Named places: shops, the spray bay, food carts, the safe house, clinic and police station, near target spots.

/**
 * kind picks the menu; near is the target (x, z) the place snaps to (the closest sidewalk of a block in that
 * district); colour tints the marker and minimap blip.
 */
export const PLACES = Object.freeze([
  { id: 'gun', kind: 'gun', name: 'Halcyon Arms', district: 'neon', near: [64, -40], colour: '#ff5a4f' },
  { id: 'clothes', kind: 'clothes', name: 'Saltwater Threads', district: 'beach', near: [292, -96], colour: '#ff5fa2' },
  { id: 'dealer', kind: 'dealer', name: 'Marlin Motors', district: 'neon', near: [-150, 120], colour: '#ffc94a' },
  { id: 'spray', kind: 'spray', name: 'Quick Coat Spray Bay', district: 'harbor', near: [40, 262], colour: '#2ec4c9' },
  { id: 'food1', kind: 'food', name: 'Taco Tide Cart', district: 'neon', near: [20, -84], colour: '#9dff6a' },
  { id: 'food2', kind: 'food', name: 'Taco Tide Cart', district: 'beach', near: [330, 20], colour: '#9dff6a' },
  { id: 'food3', kind: 'food', name: 'Taco Tide Cart', district: 'heights', near: [-300, -80], colour: '#9dff6a' },
  { id: 'safehouse', kind: 'safehouse', name: "Ilo's Flat", district: 'heights', near: [-262, 40], colour: '#f2f0ea' },
  { id: 'garage', kind: 'garage', name: "Ilo's Lock-up", district: 'heights', near: [-262, 100], colour: '#c0c5ce' },
  { id: 'clinic', kind: 'clinic', name: 'Saint Brine Clinic', district: 'beach', near: [250, 60], colour: '#ff8aa8' },
  { id: 'station', kind: 'station', name: 'Meridian PD Central', district: 'neon', near: [-110, -160],
    colour: '#3b6bff' },
]);

/** Kinds the player can walk into and press E to use. */
export const USABLE = new Set(['gun', 'clothes', 'dealer', 'spray', 'food', 'safehouse', 'garage']);
