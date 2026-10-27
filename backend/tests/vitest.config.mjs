import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    globals: true,
    environment: 'node',
    globalSetup: [path.resolve(__dirname, 'globalSetup.mjs')],
    include: ['tests/**/*.test.js'],
    testTimeout: 20000,
  },
});
