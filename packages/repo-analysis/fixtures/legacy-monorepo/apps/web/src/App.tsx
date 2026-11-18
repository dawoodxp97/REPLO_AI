import { routes } from './routes'

export function App() {
  return (
    <main>
      {routes.map((route) => (
        <route.element key={route.path} />
      ))}
    </main>
  )
}
