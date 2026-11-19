// Full-screen banners: BUSTED and WASTED with the penalty line, fading to black before the respawn.

/** show(kind, lines) puts up the banner; black() fades it out; hide() removes it. */
export function createScreens() {
  const root = document.createElement('div');
  root.id = 'screen';
  root.innerHTML = '<div class="big"></div><div class="line"></div><div class="line sub"></div>';
  document.body.appendChild(root);
  const [big, line, sub] = root.children;
  return {
    show(kind, title, text, note = '') {
      root.className = `show ${kind}`;
      big.textContent = title;
      line.innerHTML = text;
      sub.innerHTML = note;
    },
    black() {
      root.classList.add('black');
    },
    hide() {
      root.className = '';
    },
  };
}
