// The story cast: ten named people of Port Meridian, each with a profile, a home spot, a look and a portrait style.

/**
 * look: skin (index into SKIN_TONES), build (rig build name), wardrobe pieces by name and their colours.
 * portrait: back (card background), jaw (0 narrow .. 1 wide), neck, brow and a mark ('scar', 'mole', 'beard', '').
 */
export const CAST = Object.freeze([
  {
    id: 'ilo', name: 'Ilo Rask', role: 'You', faction: 'player', home: 'safehouse',
    profile: 'Ex-courier, twenty-six, owes forty grand and knows every back street from the bike days.',
    look: { skin: 2, build: 'average', hair: 'crop', hairColour: '#1b1410', top: 'tee', bottom: 'jeans',
      outer: 'bomber', shoes: 'hitops', accessory: 'chain', colours: { top: '#e9e4d6', bottom: '#2c3546',
        outer: '#6a7a45', outerLining: '#ff7a1a', shoe: '#efe6cf', accent: '#d4b25a' } },
    portrait: { back: '#3d4a2a', jaw: 0.5, neck: 0.5, brow: 0.5, mark: '' },
  },
  {
    id: 'nell', name: 'Nell Okafor', role: 'The fixer', faction: 'velvetHand', home: 'lantern',
    profile: 'Runs quiet jobs from the back booth of the Lucky Lantern. Trusts nobody, pays on time.',
    look: { skin: 4, build: 'slim', hair: 'ponytail', hairColour: '#1b1410', top: 'shirt', bottom: 'skirt',
      outer: 'blazer', shoes: 'loafers', accessory: 'sunglasses', colours: { top: '#f4e9ff', bottom: '#2a1838',
        outer: '#7b2fa8', outerLining: '#c45cff', shoe: '#1a1214', accent: '#ffd6ff' } },
    portrait: { back: '#5e2382', jaw: 0.25, neck: 0.4, brow: 0.35, mark: '' },
  },
  {
    id: 'gus', name: 'Augustin "Gus" Pell', role: 'Loan shark', faction: 'gildedWake', home: 'pell-hotel',
    profile: 'Owns the Hotel Aurelio and half the debts on the beach. Smiles while he adds the interest.',
    look: { skin: 0, build: 'heavy', hair: 'buzz', hairColour: '#8c8c8c', top: 'shirt', bottom: 'shorts',
      outer: 'blazer', shoes: 'loafers', accessory: 'chain', colours: { top: '#ff8a5c', bottom: '#f2ead8',
        outer: '#f7f0dd', outerLining: '#ff8a5c', shoe: '#7a4a2a', accent: '#ffcf4a' } },
    portrait: { back: '#8a3a1c', jaw: 0.95, neck: 0.95, brow: 0.7, mark: 'mole' },
  },
  {
    id: 'voss', name: 'Harlan Voss', role: 'Harbour boss', faction: 'saltDogs', home: 'voss-yard',
    profile: 'Runs Harbor Row from a freight office. Every crate that lands on the quay pays him first.',
    look: { skin: 1, build: 'broad', hair: 'beanie', hairColour: '#2e5f63', top: 'sweater', bottom: 'cargo',
      outer: 'denim', shoes: 'boots', accessory: '', colours: { top: '#1d3b40', bottom: '#4a4436',
        outer: '#2b6f75', outerLining: '#9fe0e2', shoe: '#3a2a1c', accent: '#2ec4c9' } },
    portrait: { back: '#136c70', jaw: 0.85, neck: 0.85, brow: 0.9, mark: 'beard' },
  },
  {
    id: 'solis', name: 'Capt. Renata Solis', role: 'Police captain', faction: 'police', home: 'solis-steps',
    profile: 'Meridian PD\'s rising star. Clears cases fast; nobody asks where the evidence goes after.',
    look: { skin: 2, build: 'average', hair: 'bun', hairColour: '#3b2516', top: 'shirt', bottom: 'jeans',
      outer: 'blazer', shoes: 'boots', accessory: '', colours: { top: '#dfe6f5', bottom: '#1a2340',
        outer: '#1d3d8f', outerLining: '#3b6bff', shoe: '#14151c', accent: '#ffd166' } },
    portrait: { back: '#1d3d8f', jaw: 0.45, neck: 0.5, brow: 0.8, mark: '' },
  },
  {
    id: 'tavi', name: 'Tavi Rask', role: 'Cousin, mechanic', faction: 'calderCrew', home: 'garage',
    profile: 'Ilo\'s younger cousin. Keeps the lock-up running and can make any car vanish in an hour.',
    look: { skin: 2, build: 'slim', hair: 'curls', hairColour: '#b5322c', top: 'tank', bottom: 'cargo',
      outer: '', shoes: 'sneakers', accessory: 'backpack', colours: { top: '#f2b84b', bottom: '#5a5040',
        shoe: '#e8e2d2', accent: '#2a2a2a' } },
    portrait: { back: '#7f5a17', jaw: 0.3, neck: 0.35, brow: 0.3, mark: '' },
  },
  {
    id: 'dex', name: 'Dex Marrow', role: 'Voss\'s driver', faction: 'saltDogs', home: 'pier-nine',
    profile: 'Drives Voss\'s white van and his problems away. Ex-boxer, never in a hurry.',
    look: { skin: 3, build: 'broad', hair: 'buzz', hairColour: '#1b1410', top: 'hoodie', bottom: 'joggers',
      outer: 'windbreaker', shoes: 'sneakers', accessory: '', colours: { top: '#2a2a33', bottom: '#2a2a33',
        outer: '#136c70', outerLining: '#2ec4c9', shoe: '#f2f2f2', accent: '#2ec4c9' } },
    portrait: { back: '#0f4b4e', jaw: 1, neck: 1, brow: 0.95, mark: 'scar' },
  },
  {
    id: 'priya', name: 'Priya Castell', role: 'Calder Crew boss', faction: 'calderCrew', home: 'bluff',
    profile: 'Street racer who turned the hill gangs into a crew. Owes Tavi a favour and pays her own.',
    look: { skin: 1, build: 'petite', hair: 'cap', hairColour: '#1b1410', top: 'hoodie', bottom: 'joggers',
      outer: '', shoes: 'hitops', accessory: 'bag', colours: { top: '#f2b84b', bottom: '#2a2018',
        shoe: '#1a1214', accent: '#ff5a4f' } },
    portrait: { back: '#a8741a', jaw: 0.2, neck: 0.3, brow: 0.45, mark: '' },
  },
  {
    id: 'juno', name: 'Juno Clement', role: 'Night DJ, Talk Meridian', faction: null, home: 'lantern',
    profile: 'Hosts the late call-in show. Hears every rumour in town and sells the good ones.',
    look: { skin: 4, build: 'average', hair: 'afro', hairColour: '#3b2516', top: 'crop', bottom: 'longskirt',
      outer: '', shoes: 'sandals', accessory: 'sunglasses', colours: { top: '#ff5fa2', bottom: '#2ec4c9',
        shoe: '#d9a47c', accent: '#ffd166' } },
    portrait: { back: '#a2306a', jaw: 0.35, neck: 0.45, brow: 0.4, mark: '' },
  },
  {
    id: 'benny', name: 'Benny Larch', role: 'Boatman, Gull Key', faction: null, home: 'gull-dock',
    profile: 'Runs a water taxi to Gull Key and anything else that fits under a tarp.',
    look: { skin: 1, build: 'heavy', hair: 'sunhat', hairColour: '#d9d4c8', top: 'polo', bottom: 'shorts',
      outer: 'vest', shoes: 'sandals', accessory: '', colours: { top: '#9fd3e8', bottom: '#c9b28a',
        outer: '#e07a2e', outerLining: '#f2d06b', shoe: '#7a4a2a', accent: '#e8dcb5' } },
    portrait: { back: '#2a5d7a', jaw: 0.8, neck: 0.75, brow: 0.6, mark: 'beard' },
  },
]);

export const CAST_BY_ID = new Map(CAST.map((person) => [person.id, person]));

/** A cast member by id (null for unknown ids). */
export const castMember = (id) => CAST_BY_ID.get(id) ?? null;
