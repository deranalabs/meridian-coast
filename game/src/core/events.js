// Event bus: systems announce gunshots, hits, crimes and purchases; others (police, crowd, audio, HUD) listen.

/** on(type, handler) subscribes and returns an unsubscribe function; emit(type, data) calls handlers in order. */
export function createEvents() {
  const handlers = new Map();
  return {
    on(type, handler) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(handler);
      return () => {
        const list = handlers.get(type);
        list.splice(list.indexOf(handler), 1);
      };
    },
    emit(type, data = {}) {
      const list = handlers.get(type);
      if (list) for (const handler of [...list]) handler(data);
    },
  };
}
