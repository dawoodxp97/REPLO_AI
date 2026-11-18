export interface Product {
  id: string
  name: string
  priceCents: number
  stock: number
}

export interface ProductInput {
  name: string
  priceCents: number
  stock: number
}
