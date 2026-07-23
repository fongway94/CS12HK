import { useLayoutEffect } from "react"
import { useLocation } from "react-router-dom"

const REVEAL_SELECTOR = "main > section, main > article, [data-reveal]"

/**
 * Adds subtle, one-time entrance motion as content reaches the viewport.
 * MutationObserver also covers products and other content loaded asynchronously.
 */
export function MotionEffects() {
  const location = useLocation()

  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const observed = new WeakSet<Element>()

    const reveal = (element: Element) => {
      element.classList.remove("reveal-pending")
      element.classList.add("reveal-visible")
    }

    const intersectionObserver = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          reveal(entry.target)
          intersectionObserver.unobserve(entry.target)
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -7% 0px" }
    )

    const register = (root: ParentNode = document) => {
      const elements = root.querySelectorAll(REVEAL_SELECTOR)
      for (const element of elements) {
        if (observed.has(element) || element.classList.contains("reveal-visible")) continue
        observed.add(element)
        if (reducedMotion) reveal(element)
        else {
          element.classList.add("reveal-pending")
          intersectionObserver.observe(element)
        }
      }
    }

    register()
    const mutationObserver = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) {
            if (node.matches(REVEAL_SELECTOR)) register(node.parentElement || document)
            else register(node)
          }
        }
      }
    })
    mutationObserver.observe(document.getElementById("root") || document.body, {
      childList: true,
      subtree: true
    })

    return () => {
      intersectionObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [location.pathname, location.search])

  return null
}
