import type { Product } from '../domain/product'

export function hasStock(product: Product, quantity: number): boolean {
  return product.stock >= quantity
}

export function reserve(product: Product, quantity: number): Product {
  return { ...product, stock: product.stock - quantity }
}
