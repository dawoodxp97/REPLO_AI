import { Store } from './util.js'
import { add } from '@lib/math/add'
import legacy from './legacy'

export * from './math'
export { Store }

export const lazy = () => import('./lazy')
export const sum = (a: number, b: number) => add(a, b) + legacy()
