// The pop-ups under the cash figure: three reused rows that show what ui/gainqueue.js has queued.
import { createGainState, noteValue, stepGains, gainLook, gainText, MAX_GAINS } from './gainqueue.js';

/** Rows inside `parent` (the HUD's status block); update(cash, respect, dt) each frame, quiet() after a load. */
export function createGainPops(parent) {
  const box = document.createElement('div');
  box.className = 'gains';
  parent.appendChild(box);
  const rows = [];
  for (let i = 0; i < MAX_GAINS; i += 1) {
    const row = document.createElement('div');
    row.className = 'gain';
    row.style.opacity = '0';
    box.appendChild(row);
    rows.push({ row, text: '', kind: '' });
  }
  let state = createGainState();

  return {
    /** Start a new warm-up so a loaded save's money and respect set the baseline instead of popping up. */
    quiet() {
      state = createGainState();
    },
    update(cash, respect, dt) {
      stepGains(state, dt);
      noteValue(state, 'cash', cash);
      if (respect !== undefined) noteValue(state, 'respect', respect);
      // The newest pop-up sits on top, nearest the cash figure; older ones drift down below it.
      for (let i = 0; i < MAX_GAINS; i += 1) {
        const slot = rows[i];
        const gain = state.gains[state.gains.length - 1 - i];
        if (!gain) {
          if (slot.text) {
            slot.text = '';
            slot.row.style.opacity = '0';
          }
          continue;
        }
        const text = gainText(gain.kind, gain.amount);
        if (text !== slot.text) {
          slot.text = text;
          slot.row.textContent = text;
        }
        if (gain.kind !== slot.kind) {
          slot.kind = gain.kind;
          slot.row.dataset.kind = gain.kind;
        }
        const look = gainLook(gain.age);
        slot.row.style.opacity = look.opacity.toFixed(3);
        slot.row.style.transform = `translateY(${(i * 4 - look.rise * 0.5).toFixed(1)}px)`;
      }
    },
  };
}
