// Police dispatch panel: units and stars in the head, the chase state, up to six unit rows with state chips, totals.
import { stateKey } from '../police/report.js';

const MAX_ROWS = 6;
const CLEAR_SECONDS = 4;

function make(parent, className, tag = 'div') {
  const node = document.createElement(tag);
  node.className = className;
  parent.appendChild(node);
  return node;
}

/** Distances read like a radio call: metres up close, kilometres past one. */
export function formatMetres(metres) {
  if (metres === null || metres === undefined) return '';
  return metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;
}

/** The panel's state word from the stars and the search flag. */
export const panelState = (stars, searching) => (stars <= 0 ? 'Clear' : searching ? 'Searching' : 'Pursuit');

/** createPolicePanel(parent) → { root, update(report, stars, searching) }; a null report hides it (after "Clear"). */
export function createPolicePanel(parent) {
  const root = make(parent, 'dispatch');
  const head = make(root, 'dispatch-head');
  make(head, 'dispatch-tag', 'span').textContent = 'PMPD DISPATCH';
  const units = make(head, 'dispatch-units', 'span');
  const stars = make(head, 'dispatch-stars', 'span');
  const status = make(root, 'dispatch-state');
  const list = make(root, 'dispatch-rows', 'ol');
  const rows = [];
  for (let i = 0; i < MAX_ROWS; i += 1) {
    const li = make(list, 'dispatch-row', 'li');
    rows.push({
      li,
      call: make(li, 'call', 'span'),
      detail: make(li, 'detail', 'span'),
      metres: make(li, 'metres', 'span'),
      state: make(li, 'state', 'span'),
      key: null,
    });
  }
  const count = make(root, 'dispatch-count');
  const last = { key: '', stars: 0, clearUntil: 0, shown: false };

  function show(on) {
    if (on === last.shown) return;
    last.shown = on;
    root.classList.toggle('show', on);
  }

  function paint(report, starCount, searching) {
    const word = panelState(starCount, searching);
    stars.innerHTML = Array.from({ length: 5 }, (_, i) => `<b class="${i < starCount ? 'lit' : ''}">&#9733;</b>`)
      .join('');
    status.textContent = word === 'Pursuit' ? 'Pursuit · units closing'
      : word === 'Searching' ? 'Searching · out of sight' : 'Clear · units returning';
    root.dataset.state = word.toLowerCase();
    const responding = report?.responding ?? 0;
    units.textContent = responding ? `${responding} ${responding === 1 ? 'UNIT' : 'UNITS'}` : '';
    const items = report?.rows ?? [];
    for (let i = 0; i < MAX_ROWS; i += 1) {
      const slot = rows[i];
      const row = items[i];
      const key = row ? `${row.call}|${row.detail}|${row.metres}|${row.state}` : '';
      if (key === slot.key) continue;
      slot.key = key;
      slot.li.style.display = row ? '' : 'none';
      if (!row) continue;
      slot.li.className = `dispatch-row ${row.kind}`;
      slot.call.textContent = row.call;
      slot.detail.textContent = row.brief ?? row.detail;
      slot.detail.title = row.detail;
      slot.metres.textContent = formatMetres(row.metres);
      slot.state.textContent = row.state;
      slot.state.dataset.chip = stateKey(row.state);
    }
    const extra = items.length > MAX_ROWS ? ` · +${items.length - MAX_ROWS} more` : '';
    count.textContent = report
      ? `${report.cars} ${report.cars === 1 ? 'car' : 'cars'} · ${report.officers} on foot${extra}`
      : 'No units assigned';
  }

  return {
    root,
    update(report, starCount = 0, searching = false) {
      const now = performance.now() / 1000;
      if (!report) {
        if (last.stars > 0) last.clearUntil = now + CLEAR_SECONDS;
        last.stars = 0;
        if (now >= last.clearUntil) {
          show(false);
          return;
        }
        if (last.key !== 'clear') {
          last.key = 'clear';
          paint(null, 0, false);
        }
        show(true);
        return;
      }
      last.stars = starCount;
      const key = `${starCount}|${searching}|${report.cars}|${report.officers}|${report.rows.length}|`
        + report.rows.slice(0, MAX_ROWS).map((r) => `${r.call}${r.metres}${r.state}${r.detail}`).join(',');
      show(true);
      if (key === last.key) return;
      last.key = key;
      paint(report, starCount, searching);
    },
  };
}
