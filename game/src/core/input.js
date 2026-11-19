// Keyboard and mouse input: held keys, one-shot presses, pointer-lock mouse look.

const BLOCKED = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

/** Tracks keys by KeyboardEvent.code; pressed(code) is true once per key press. */
export function createInput(target) {
  const held = new Set();
  const presses = new Set();
  const mouse = { dx: 0, dy: 0, locked: false };

  window.addEventListener('keydown', (event) => {
    if (BLOCKED.has(event.code)) event.preventDefault();
    if (!held.has(event.code)) presses.add(event.code);
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  target.addEventListener('click', () => {
    if (!mouse.locked && target.requestPointerLock) {
      const request = target.requestPointerLock();
      if (request && request.catch) request.catch(() => {});
    }
  });
  document.addEventListener('pointerlockchange', () => {
    mouse.locked = document.pointerLockElement === target;
  });
  window.addEventListener('mousemove', (event) => {
    if (!mouse.locked) return;
    mouse.dx += event.movementX;
    mouse.dy += event.movementY;
  });

  return {
    mouse,
    down(...codes) {
      return codes.some((code) => held.has(code));
    },
    pressed(code) {
      return presses.has(code);
    },
    axis(negative, positive) {
      return (this.down(...positive) ? 1 : 0) - (this.down(...negative) ? 1 : 0);
    },
    /** Call once at the end of each frame. */
    endFrame() {
      presses.clear();
      mouse.dx = 0;
      mouse.dy = 0;
    },
  };
}
