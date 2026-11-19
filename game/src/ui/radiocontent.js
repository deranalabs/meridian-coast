// Radio content: Port Meridian's stations, their hosts, songs and DJ patter, the satirical ads every station
// runs, and the news lines the city reads out when Ilo makes the headlines.

export const STATIONS = Object.freeze([
  {
    name: 'CORAL 98.1', host: 'Marisol Vey',
    tracks: [['The Low Tides', 'Salt on the Dashboard'], ['Velma Sunday', 'Neon Undertow'],
      ['Harbor Lights Club', 'Pink Hour'], ['Coastline Kids', 'Sunburn Season']],
    dj: ['Marisol on Coral. It is still warm out, and so are we.', 'If you are stuck on the Diagonal, sing louder.',
      'Coral 98.1, the sound of a sunset you cannot afford.'],
  },
  {
    name: 'KDRIFT 104.7', host: 'Juno Clement',
    tracks: [['Static Palms', 'Causeway at 3AM'], ['Mira Okonjo', 'Overpass'], ['Gearbox Saints', 'Handbrake Heart'],
      ['Nightjar', 'Pier Nine']],
    dj: ['Juno after dark. Somebody is doing ninety on the causeway and I respect it, legally not at all.',
      'KDRIFT, for people who signal after the turn.', 'Tip line is open. You know who you are.'],
  },
  {
    name: 'CALDER CLASSIC', host: 'Edmund Grail',
    tracks: [['The Bellfry Quartet', 'Olive Steps Waltz'], ['Rosa Quintero', 'Hill Road Serenade'],
      ['Calder Chamber Players', 'Nocturne for a Parked Car']],
    dj: ['Edmund Grail here, playing music older than your car and better maintained.',
      'A waltz, for those of you idling on the switchbacks. Three, two, one, brake.'],
  },
  {
    name: 'TALK MERIDIAN', host: 'Dawn Ruiz',
    tracks: [['Dawn Ruiz', 'Late Calls on the Coast'], ['Ben Achterberg', 'Parking Tickets Hour'],
      ['Dawn Ruiz', 'Is Your Landlord a Seagull?']],
    dj: ['Caller says the harbour smells of money. Caller, that is fish.',
      'Next hour: is the casino tower leaning, or are we?', 'Lines are open. Please stop calling about the pelican.'],
  },
]);

/** Ads run on every station in turn. */
export const ADS = Object.freeze([
  'Gilded Wake Lending. Why wait for money, when money can wait for you? Interest compounding nightly.',
  'Marlin Crown Casino. The house always wins, so why not live in the house? Valet for every budget.',
  'Halcyon Arms. Protect what is yours, and what is nearly yours. Ask about our weekend lance.',
  'Seabright Linen. We clean everything. Everything. No questions asked, none answered.',
  'The Port Meridian Police are hiring. Good pension, great sunglasses, flexible paperwork.',
  'Saltwater Threads. Dress like you already got away with it.',
  'Marlin Motors. Zero down, zero questions, zero chance you read the contract.',
]);

/** A news line for each story job when it is passed. */
export const MISSION_NEWS = Object.freeze({
  'lantern-run': 'A courier in purple was seen delivering a parcel on time. Experts call it unprecedented.',
  'salt-and-chrome': 'A silver coupe has vanished from Voss Freight. Mr Voss says he is "relaxed". He is not.',
  'white-van': 'Brinewater Cold Store reports a disturbance and denies storing anything but fish.',
  headline: 'Shots at the Voss Freight yard tonight. Police say they were busy elsewhere. Mostly.',
  'hill-favour': 'Calder Heights residents report a gold coupe going down the switchbacks without brakes.',
  'tarp-run': 'Pier Nine searched by men in teal jackets. The harbour master says it was a fishing club.',
  'tide-tables': 'Seabright Linen reports a missing van, and asks the thief to at least return the towels.',
  'gilded-tide': 'Hotel Aurelio "laundry incident". Guests report a van, a lance and a very quiet manager.',
});

/** News for what the city notices: a chase, the helicopter, an arrest, a hospital run, a job that went wrong. */
export const EVENT_NEWS = Object.freeze({
  chase: 'Traffic alert: a high-speed police pursuit across Port Meridian. Drivers, please stay out of it.',
  helicopter: 'Air-1 Gull is up over the city tonight. If you are innocent, wave. If not, do not wave.',
  busted: 'Another arrest tonight. Captain Solis calls it "a good evening for paperwork".',
  wasted: 'Paramedics were called to the street again tonight. They would like everyone to stop.',
  failed: 'Police scanners report a job gone sideways. Nobody is saying whose job.',
  race: 'Street racing reported on the Gull Key causeway. Police say the winner should still pay the toll.',
});
