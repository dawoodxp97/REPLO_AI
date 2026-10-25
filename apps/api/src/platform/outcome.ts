export type Outcome<T, R> = { kind: 'ok'; value: T } | { kind: 'refused'; refusal: R }

export const ok = <T>(value: T): Outcome<T, never> => ({ kind: 'ok', value })

export const refused = <R>(refusal: R): Outcome<never, R> => ({ kind: 'refused', refusal })
