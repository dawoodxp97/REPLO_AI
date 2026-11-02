import { useEffect, useSyncExternalStore, type RefObject } from 'react'

const noSubscription = () => () => undefined
const clientLabel = () => (/mac|iphone|ipad/i.test(navigator.platform) ? '⌘' : 'Ctrl')
const serverLabel = () => 'Ctrl'

export function useSearchShortcut(input: RefObject<HTMLInputElement | null>) {
  const modifierLabel = useSyncExternalStore(noSubscription, clientLabel, serverLabel)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        input.current?.focus()
        input.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [input])

  return modifierLabel
}
