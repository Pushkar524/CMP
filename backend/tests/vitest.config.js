const { defineConfig } = require('vitest/config');
const path = require('path');

module.exports = defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    globals: true,
    environment: 'node',
    globalSetup: [path.resolve(__dirname, 'globalSetup.mjs')],
    include: ['tests/**/*.test.js'],
    testTimeout: 20000,
  },
});
