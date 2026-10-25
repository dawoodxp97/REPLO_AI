import { landingBoundaries, noComments } from '@replo/config/eslint'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const config = [
  { ignores: ['.next/**', 'out/**', 'next-env.d.ts'] },
  ...nextVitals,
  ...nextTs,
  landingBoundaries,
  noComments,
]

export default config
