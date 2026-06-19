import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const alias = {
  '@': path.resolve(__dirname, 'packages/app/src'),
  '@web': path.resolve(__dirname, 'apps/web'),
}

// Coverage is opt-in (set MUSICTRON_COVERAGE=1) so normal runs stay fast.
const coverageEnabled = process.env.MUSICTRON_COVERAGE === '1'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias,
    // Ensure a single React copy across packages (React 19 + RTL 16).
    dedupe: ['react', 'react-dom'],
  },
  test: {
    coverage: {
      enabled: coverageEnabled,
      provider: 'istanbul',
      reporter: ['text', 'html', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      include: ['packages/app/src/**', 'apps/web/lib/**', 'packages/ui/src/**'],
      exclude: [
        '**/*.d.ts',
        '**/types/**',
        'packages/app/src/test/**',
        'apps/web/lib/__test-helpers__/**',
        '**/*.test.*',
      ],
      // Report-only — no thresholds that fail the build.
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./tests/setup.node.ts'],
          include: [
            'packages/app/src/**/*.test.ts',
            'apps/web/**/*.test.ts',
            'packages/ui/**/*.test.ts',
          ],
          exclude: [
            '**/node_modules/**',
            '**/*.ui.test.*',
            '**/*.component.test.*',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          setupFiles: ['./tests/setup.jsdom.ts'],
          include: [
            'packages/app/src/**/*.ui.test.{ts,tsx}',
            'packages/app/src/**/*.component.test.{ts,tsx}',
          ],
          exclude: ['**/node_modules/**'],
        },
      },
    ],
  },
})
