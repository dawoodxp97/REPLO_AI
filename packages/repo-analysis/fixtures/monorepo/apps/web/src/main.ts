import { formatPrice, type Product } from '@acme/core'
import { renderCatalog } from './catalog'

const products: Product[] = [{ id: 'tea', priceCents: 450 }]

console.log(renderCatalog(products))
console.log(formatPrice(450))
