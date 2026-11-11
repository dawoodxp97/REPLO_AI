import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

export const TYPE_SCALE = ['micro', 'meta', 'compact', 'brand', 'lesson-sm', 'inline-code'] as const

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [...TYPE_SCALE],
      tracking: ['display'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
