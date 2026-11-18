import type { Product, ProductInput } from '../domain/product'

export interface ProductDeps {
  list(): Promise<Product[]>
  create(input: ProductInput): Promise<Product>
}

export function createProductService(deps: ProductDeps) {
  return {
    list: () => deps.list(),
    create: (input: ProductInput) => deps.create(input),
  }
}
