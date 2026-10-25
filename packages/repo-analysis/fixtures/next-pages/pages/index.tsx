import { loadCatalog } from 'lib/data'

export default function Home() {
  return <ul>{loadCatalog().map((item) => <li key={item}>{item}</li>)}</ul>
}
