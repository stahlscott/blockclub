import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.integration.ts'],
    include: ['src/**/*.integration.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@blockclub/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
