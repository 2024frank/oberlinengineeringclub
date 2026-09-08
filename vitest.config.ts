import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  cacheDir: './.cache/vitest',
  plugins: [react()],
  test: {
    include: ['tests/{unit,integration}/**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'tests/e2e/**', 'tests/node/**'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts']
  },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)), 'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)) } }
})
