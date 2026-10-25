import { base, leafPackageBoundaries, noComments } from '@replo/config/eslint'

export default [{ ignores: ['fixtures/**'] }, ...base, leafPackageBoundaries, noComments]
