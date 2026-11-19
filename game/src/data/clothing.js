// Clothing: Saltwater Threads stock and the story pieces missions hand out; each item sets one wardrobe slot to a
// style and colour (prices live in prices.js).

/** slot is top, bottom, outer or hat; style is a wardrobe variant name (null removes the piece). */
export const CLOTHING = Object.freeze([
  { id: 'coral-tee', slot: 'top', style: 'tee', colour: '#ff7f6a', name: 'Coral Tee' },
  { id: 'palm-shirt', slot: 'top', style: 'shirt', colour: '#3fd0c4', name: 'Lagoon Shirt' },
  { id: 'night-hoodie', slot: 'top', style: 'hoodie', colour: '#2a2f45', name: 'Night Shift Hoodie' },
  { id: 'linen-polo', slot: 'top', style: 'polo', colour: '#f4ead6', name: 'Linen Polo' },
  { id: 'sunset-tank', slot: 'top', style: 'tank', colour: '#ffd166', name: 'Sunset Tank' },
  { id: 'board-shorts', slot: 'bottom', style: 'shorts', colour: '#7ec8ff', name: 'Board Shorts' },
  { id: 'cargo', slot: 'bottom', style: 'cargo', colour: '#4f5e3a', name: 'Dock Cargos' },
  { id: 'joggers', slot: 'bottom', style: 'joggers', colour: '#1f2430', name: 'Track Joggers' },
  { id: 'raw-denim', slot: 'bottom', style: 'jeans', colour: '#2c3546', name: 'Raw Denim' },
  { id: 'olive-bomber', slot: 'outer', style: 'bomber', colour: '#6a7a45', lining: '#ff7a1a', name: 'Olive Bomber' },
  { id: 'denim-jacket', slot: 'outer', style: 'denim', colour: '#5a6a80', lining: '#d8cfc0', name: 'Wash Denim' },
  { id: 'pink-blazer', slot: 'outer', style: 'blazer', colour: '#ff5fa2', lining: '#2b2b2e', name: 'Flamingo Blazer' },
  { id: 'windbreaker', slot: 'outer', style: 'windbreaker', colour: '#c45cff', lining: '#3fe0d0',
    name: 'Squall Shell' },
  { id: 'no-jacket', slot: 'outer', style: null, name: 'No Jacket' },
  // Rank pieces (missions/respect.js locks them until the street knows Ilo's name).
  { id: 'gilt-blazer', slot: 'outer', style: 'blazer', colour: '#d9a531', lining: '#1c1a24', name: 'Gilt Blazer' },
  { id: 'tide-cap', slot: 'hat', style: 'cap', colour: '#16857c', name: 'Tide Caller Cap' },
  { id: 'ball-cap', slot: 'hat', style: 'cap', colour: '#d7263d', name: 'Port Cap' },
  { id: 'sun-hat', slot: 'hat', style: 'sunhat', colour: '#e3c18f', name: 'Straw Sun Hat' },
  { id: 'beanie', slot: 'hat', style: 'beanie', colour: '#2a3d66', name: 'Harbor Beanie' },
  { id: 'no-hat', slot: 'hat', style: 'crop', name: 'No Hat' },
]);

/**
 * Story pieces: never sold. A mission lists them in `outfit`, Ilo wears them for the job, and his own clothes come
 * back when it ends (passed, failed off or quit).
 */
export const STORY_CLOTHING = Object.freeze([
  { id: 'courier-jacket', slot: 'outer', style: 'windbreaker', colour: '#ffc94a', lining: '#5e2382',
    name: 'Lantern Courier Jacket', mission: 'lantern-run' },
  { id: 'courier-cap', slot: 'hat', style: 'cap', colour: '#5e2382', name: 'Lantern Courier Cap',
    mission: 'lantern-run' },
  // The heist goes in as the hotel's laundry: Seabright Linen shells and caps, gull-white with a sea-blue trim.
  { id: 'linen-shell', slot: 'outer', style: 'windbreaker', colour: '#eef2f0', lining: '#2f7fa8',
    name: 'Seabright Linen Shell', mission: 'gilded-tide' },
  { id: 'linen-cap', slot: 'hat', style: 'cap', colour: '#2f7fa8', name: 'Seabright Linen Cap',
    mission: 'gilded-tide' },
  { id: 'linen-slacks', slot: 'bottom', style: 'cargo', colour: '#c9d2d4', name: 'Seabright Work Slacks',
    mission: 'gilded-tide' },
]);

/** A story piece by id, or null. */
export const storyPiece = (id) => STORY_CLOTHING.find((piece) => piece.id === id) ?? null;
