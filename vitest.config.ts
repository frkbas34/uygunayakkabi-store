import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/app/**/context/**'],
      reporter: ['text', 'lcov'],
    },
  },
})
