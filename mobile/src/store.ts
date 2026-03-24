type Listener = () => void;

export function createStore<T extends Record<string, any>>(initial: T) {
  let state = { ...initial };
  const listeners = new Set<Listener>();

  return {
    get: () => state,
    set: (partial: Partial<T>) => {
      state = { ...state, ...partial };
      listeners.forEach((l) => l());
    },
    subscribe: (fn: Listener) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
