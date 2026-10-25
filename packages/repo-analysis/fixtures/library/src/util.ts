export interface Shape {
  sides: number
}

export type Id = string

export enum Color {
  Red,
  Blue,
}

export class Store {
  load() {
    return []
  }

  save(items: unknown[]) {
    return items.length
  }
}

export const util = { version: 1 }
