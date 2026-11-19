// Shop menu overlay: the shop's name, a list of items with prices, the highlighted row, cash and key hints.

function escape(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
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
      const price = (item) => (item.price ? `$${item.price.toLocaleString('en-US')}` : 'Free');
      list.innerHTML = items.map((item, i) => `<li class="${i === index ? 'active' : ''} ${item.disabled
        ? 'disabled' : ''}"><span class="label">${escape(item.label)}<small>${escape(item.reason || item.detail)}
        </small></span><span class="price">${price(item)}</span></li>`).join('');
      q('.cash').textContent = `$${cash.toLocaleString('en-US')}`;
      q('.note').textContent = note;
    },
  };
}
