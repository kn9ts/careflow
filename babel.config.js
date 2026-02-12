/**
 * Babel Configuration for Jest
 * Required for transforming ESM modules in tests
 */

module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "current",
        },
      },
    ],
  ],
  plugins: [],
  env: {
    test: {
      plugins: [],
    },
  },
};
