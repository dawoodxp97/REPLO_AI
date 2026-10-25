import { frontendBoundaries, noComments } from '@replo/config/eslint'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const config = [
  {
    ignores: ['.next/**', 'out/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'],
  },
  ...nextVitals,
  ...nextTs,
  frontendBoundaries,
  noComments,
]

export default config
