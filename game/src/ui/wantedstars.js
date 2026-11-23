// Wanted stars: five star slots under the cash, lit for the level: solid while seen, flashing while the police
// search, hollow once the trail goes cold.

const STAR = '<svg viewBox="0 0 24 24"><path d="M12 1.8l3.1 6.6 7.1.9-5.2 4.9 1.3 7.1L12 17.8 5.7 21.3'
  + 'l1.3-7.1L1.8 9.3l7.1-.9z"/></svg>';

/**
 * Build the star row inside `parent`; update(stars, state) refreshes it, where state is police/wanted.js
 * starState(): solid while 'seen', flashing while 'searching', hollow outlines once 'cold'.
 */
export function createWantedStars(parent) {
  const row = document.createElement('div');
  row.className = 'wanted';
  const slots = [];
  for (let index = 0; index < 5; index += 1) {
    const star = document.createElement('span');
    star.className = 'star';
    star.innerHTML = STAR;
    row.prepend(star);
    slots.push(star);
  }
  parent.appendChild(row);
  let last = '';
  return {
    update(stars, state) {
      const key = `${stars}:${state}`;
      if (key === last) return;
      last = key;
      row.classList.toggle('active', stars > 0);
      row.classList.toggle('seen', state === 'seen');
      row.classList.toggle('searching', state === 'searching');
      row.classList.toggle('cold', state === 'cold');
      row.dataset.state = state;
      slots.forEach((star, index) => star.classList.toggle('lit', index < stars));
    },
  };
}
