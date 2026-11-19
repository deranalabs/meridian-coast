// Named places: shops, spray bay, food carts, safe house, clinic, police station and story spots, near targets.

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

/**
 * Story locations: where characters wait, where jobs start and end. Resolved like PLACES (kind 'mission' never
 * opens a menu); missions name them by id, and mission markers and minimap blips come from them.
 */
export const MISSION_PLACES = Object.freeze([
  { id: 'lantern', kind: 'mission', name: 'Lucky Lantern Noodles', district: 'neon', near: [-18, -52] },
  { id: 'newsbox', kind: 'mission', name: 'Kiosk on Coral Street', district: 'neon', near: [110, 30] },
  { id: 'pell-hotel', kind: 'mission', name: 'Hotel Aurelio', district: 'beach', near: [300, -30] },
  { id: 'voss-yard', kind: 'mission', name: 'Voss Freight Yard', district: 'harbor', near: [-30, 236] },
  { id: 'lockup-bay', kind: 'mission', name: "Tavi's Bay", district: 'heights', near: [-250, 112], drive: true },
  { id: 'pier-nine', kind: 'mission', name: 'Pier Nine Gate', district: 'harbor', near: [120, 290] },
  { id: 'cold-store', kind: 'mission', name: 'Brinewater Cold Store', district: 'harbor', near: [-150, 280] },
  { id: 'solis-steps', kind: 'mission', name: 'Precinct Steps', district: 'neon', near: [-96, -150] },
  { id: 'bluff', kind: 'mission', name: 'Calder Bluff Lookout', district: 'heights', near: [-330, -20] },
  { id: 'gull-dock', kind: 'mission', name: 'Gull Key Boat Dock', district: 'beach', near: [400, 80] },
]);
