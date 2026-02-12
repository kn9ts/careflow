/**
 * Babel Configuration for Jest
 * Required for transforming ESM modules and JSX in tests
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
    ["@babel/preset-react", { runtime: "automatic" }],
  ],
  plugins: [],
  env: {
    test: {
      plugins: [],
    },
  },
};
