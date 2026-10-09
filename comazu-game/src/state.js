// Shared, stable state reference. Course resets replace properties in place.
export const state = {};
export function resetState(nextState) {
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, nextState);
}
