import { formatPrice } from '@acme/core/src/price'
import type { Product } from '@acme/core'

export function renderCatalog(products: Product[]): string {
  return products.map((product) => `${product.id}: ${formatPrice(product.priceCents)}`).join('\n')
}
