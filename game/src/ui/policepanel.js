// Police panel: the units on Ilo while wanted — callsign, role, distance and state per row, with a header count.

const ICON = { car: '&#9632;', air: '&#9670;', block: '&#9644;' };
const MAX_ROWS = 5;

/** Build the panel inside `parent`; update(report, stars, searching) refreshes it (hidden at zero stars). */
export function createPolicePanel(parent) {
  const root = document.createElement('div');
  root.className = 'police';
  root.innerHTML = '<div class="head"><span class="title">MPD Dispatch</span><span class="count"></span></div>'
    + '<ul></ul><div class="foot"></div>';
  parent.appendChild(root);
  const count = root.querySelector('.count');
  const list = root.querySelector('ul');
  const foot = root.querySelector('.foot');
  let last = '';
  return {
    update(report, stars, searching) {
      root.classList.toggle('show', stars > 0);
      root.classList.toggle('searching', searching);
      if (stars === 0) return;
      const rows = report.rows.slice(0, MAX_ROWS).map((row) => `<li class="${row.kind}"><i>${ICON[row.kind]}</i>`
        + `<b>${row.call}</b><span class="detail">${row.detail}</span><span class="m">${row.metres} m</span>`
        + `<span class="st">${row.state}</span></li>`).join('');
      const head = `${report.cars} car${report.cars === 1 ? '' : 's'} · ${report.officers} on foot`;
      const tail = report.nearest === null ? 'No units in range'
        : `${searching ? 'Searching' : 'In pursuit'} · nearest ${report.nearest} m`;
      const key = `${rows}|${head}|${tail}`;
      if (key === last) return;
      last = key;
      count.textContent = head;
      list.innerHTML = rows;
      foot.textContent = tail;
    },
  };
}
