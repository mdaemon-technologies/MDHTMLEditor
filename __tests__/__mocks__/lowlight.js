/**
 * Mock for lowlight module
 * This mock is needed because lowlight is ESM-only
 */

module.exports = {
  common: {},
  createLowlight: () => ({
    register: () => {},
    highlight: () => ({ type: 'root', children: [] }),
    listLanguages: () => [],
  }),
};
