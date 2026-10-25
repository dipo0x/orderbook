// In-memory stand-in for AsyncStorage, so core modules that import it can run under Node.
const map = new Map();
const store = {
  getItem: async (key) => map.get(key) ?? null,
  setItem: async (key, value) => void map.set(key, value),
  removeItem: async (key) => void map.delete(key),
};
module.exports = { __esModule: true, default: store, ...store };
