import { useEffect, useState } from 'react'

export function useIsVisible(): [(node: Element | null) => void, boolean] {
  const [node, setNode] = useState<Element | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!node || visible) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, visible])

  return [setNode, visible]
}
