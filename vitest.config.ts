import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/main.ts',
        'src/env.d.ts',
        'src/**/*.d.ts',
        'src/mock-web-worker.js',
        'src/metrics/test-*.ts',
        'src/metrics/debug-ui.ts'
      ],
      all: true,
      lines: 95,
      functions: 95,
      branches: 95,
      statements: 95
    },
    include: [
      'tests/**/*.spec.ts',
      'tests/**/*.test.ts',
    ],
    exclude: [
      'tests-e2e/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'dist/**',
    ],
  },
  resolve: {
    alias: [
      { find: 'web-worker', replacement: fileURLToPath(new URL('./src/mock-web-worker.js', import.meta.url)) },
      { find: '@engine', replacement: fileURLToPath(new URL('./src/engine', import.meta.url)) },
    ],
  },
})
