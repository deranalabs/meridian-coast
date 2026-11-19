// Saltwater Threads stock: each item sets one wardrobe slot to a style and colour (prices live in prices.js).

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
  { id: 'ball-cap', slot: 'hat', style: 'cap', colour: '#d7263d', name: 'Port Cap' },
  { id: 'sun-hat', slot: 'hat', style: 'sunhat', colour: '#e3c18f', name: 'Straw Sun Hat' },
  { id: 'beanie', slot: 'hat', style: 'beanie', colour: '#2a3d66', name: 'Harbor Beanie' },
  { id: 'no-hat', slot: 'hat', style: 'crop', name: 'No Hat' },
]);
