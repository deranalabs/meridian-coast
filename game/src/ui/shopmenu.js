// Shop menu overlay: the shop's name, a list of items with prices, the highlighted row, cash and key hints.

const ROWS = 8;
/** A stock this short gets the large type (menus.css, `#shop.few`). */
const FEW_ROWS = 5;
const OWNED = 'Owned';

function escape(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

/** What the right end of a row says: the price, or that Ilo has it already. */
function priceText(item) {
  if (item.reason === OWNED) return OWNED;
  return item.price ? `$${item.price.toLocaleString('en-US')}` : 'Free';
}

function tagHtml(item) {
  if (item.job) return '<b class="tag">Job</b>';
  return item.locked ? '<b class="tag">Locked</b>' : '';
}

/** The line under a row's name: why it cannot be bought, else what it is. */
function detailText(item) {
  return item.reason === OWNED ? 'In your holster' : item.reason || item.detail;
}

/** A hidden menu; open(title, subtitle, items) shows it, render(items, index, cash, note) refreshes it. */
export function createShopMenu() {
  const root = document.createElement('div');
  root.id = 'shop';
  root.innerHTML = `<div class="panel"><div class="kicker"></div><div class="name"></div><div class="sub"></div>
    <ul></ul><div class="note"></div><div class="foot"><span class="cash"></span><span class="keys">
    <kbd>W</kbd><kbd>S</kbd> choose &nbsp;<kbd>Enter</kbd> buy &nbsp;<kbd>Esc</kbd> leave</span></div></div>`;
  document.body.appendChild(root);
  const q = (selector) => root.querySelector(selector);
  const list = q('ul');
  let open = false;
  return {
    get open() {
      return open;
    },
    show(place, subtitle) {
      q('.kicker').textContent = place.kindLabel ?? '';
      q('.name').textContent = place.name;
      q('.sub').textContent = subtitle;
      root.style.setProperty('--accent', place.colour);
      root.classList.add('open');
      open = true;
    },
    hide() {
      root.classList.remove('open');
      open = false;
    },
    render(items, index, cash, note = '') {
      const first = Math.max(0, Math.min(items.length - ROWS, index - Math.floor(ROWS / 2)));
      root.classList.toggle('few', items.length <= FEW_ROWS);
      list.classList.toggle('more-above', first > 0);
      list.classList.toggle('more-below', first + ROWS < items.length);
      const shown = items.slice(first, first + ROWS);
      const flags = (item, row) => [row + first === index ? 'active' : '', item.disabled ? 'disabled' : '',
        item.job ? 'job' : '', item.locked ? 'locked' : '', item.reason === OWNED ? 'owned' : ''].join(' ');
      list.innerHTML = shown.map((item, row) => `<li class="${flags(item, row)}"><span class="label">${tagHtml(item)}${
        escape(item.label)}<small>${escape(detailText(item))}</small></span><span class="price">${
        priceText(item)}</span></li>`).join('');
      q('.cash').textContent = `$${cash.toLocaleString('en-US')}`;
      q('.note').textContent = note;
    },
  };
}
