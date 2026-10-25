import { useEffect, useState, type RefObject } from 'react'

export function useIsVisible(ref: RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])

  return visible
}
