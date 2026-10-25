import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/main.http.ts', 'src/main.worker.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node24',
  clean: true,
  sourcemap: true,
  noExternal: [/^@replo\//],
})
