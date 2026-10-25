import { Provider } from 'react-redux'
import { store } from './app/store'
import { App } from './App'

export function Root() {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  )
}
