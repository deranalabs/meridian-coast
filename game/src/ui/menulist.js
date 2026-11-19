// Keyboard menu list: rows with an optional value, Up/Down (or W/S) to move, Left/Right to change, Enter to choose.

const UP = ['ArrowUp', 'KeyW'];
const DOWN = ['ArrowDown', 'KeyS'];
const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const OK = ['Enter', 'Space'];

const any = (input, codes) => codes.some((code) => input.pressed(code));

/** What a frame of input asks the menu: { move, change, choose, back } (move and change are -1, 0 or 1). */
export function readMenuInput(input) {
  return {
    move: any(input, DOWN) - any(input, UP),
    change: any(input, RIGHT) - any(input, LEFT),
    choose: any(input, OK),
    back: input.pressed('Escape') || input.pressed('Backspace'),
  };
}

/**
 * createMenuList(parent, items) with items { id, label, value?: () => string, hint?: string };
 * returns { root, items, index, render(), handle(input) → { id, action } | null }, action 'choose' or 'change'.
 */
export function createMenuList(parent, items, className = 'menu-list') {
  const root = document.createElement('ul');
  root.className = className;
  parent.appendChild(root);
  const rows = items.map((item) => {
    const li = document.createElement('li');
    li.innerHTML = '<span class="label"></span><span class="value"></span>';
    li.firstChild.textContent = item.label;
    root.appendChild(li);
    return li;
  });
  const list = {
    root,
    items,
    index: 0,
    render() {
      rows.forEach((li, i) => {
        li.classList.toggle('active', i === list.index);
        const value = items[i].value?.() ?? '';
        if (li.lastChild.innerHTML !== value) li.lastChild.innerHTML = value;
      });
    },
    select(id) {
      const i = items.findIndex((item) => item.id === id);
      if (i >= 0) list.index = i;
      list.render();
    },
    handle(input) {
      const ask = readMenuInput(input);
      if (ask.move) {
        list.index = (list.index + ask.move + items.length) % items.length;
        list.render();
        return { id: items[list.index].id, action: 'move' };
      }
      const item = items[list.index];
      if (ask.change && item.value) return { id: item.id, action: 'change', direction: ask.change };
      if (ask.choose) return { id: item.id, action: 'choose', direction: 1 };
      if (ask.back) return { id: 'back', action: 'back' };
      return null;
    },
  };
  list.render();
  return list;
}
