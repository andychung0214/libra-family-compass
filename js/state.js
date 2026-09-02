function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function createState(initialState, persistence) {
  const initial = clone(initialState);
  const listeners = new Set();
  let state = clone(initialState);

  function notify() {
    for (const listener of listeners) listener(clone(state));
  }

  function persist() {
    persistence.save('state', clone(state));
  }

  return {
    getState() {
      return clone(state);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    update(patch) {
      const resolvedPatch = typeof patch === 'function'
        ? patch(clone(state))
        : patch;
      state = { ...state, ...clone(resolvedPatch) };
      persist();
      notify();
      return clone(state);
    },

    reset() {
      state = clone(initial);
      persist();
      notify();
      return clone(state);
    },
  };
}
