export type BaseProps<T> = T extends (props: infer P) => unknown
  ? Omit<P, 'className'> & { className?: string }
  : never
