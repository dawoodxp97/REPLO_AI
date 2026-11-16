import type { PreflightRefusal } from './preflight'

export type PlanRefusal = PreflightRefusal | { code: 'MODEL_NOT_ALLOWED'; modelId: string }
