import { create } from "zustand"

interface WaitlistState {
  subscribedProducts: string[] // product IDs user has subscribed to
  subscribe: (productId: string, email: string) => Promise<{ success: boolean; message: string }>
  unsubscribe: (productId: string) => void
  isSubscribed: (productId: string) => boolean
}

function isBrowser() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  } catch {
    return false
  }
}

function loadStored(): string[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem("cs12_waitlist_subscriptions")
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStored(items: string[]) {
  if (!isBrowser()) return
  try { localStorage.setItem("cs12_waitlist_subscriptions", JSON.stringify(items)) } catch {}
}

export const useWaitlistStore = create<WaitlistState>((set, get) => ({
  subscribedProducts: loadStored(),
  subscribe: async (productId: string, email: string) => {
    // Call API to add to waitlist
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email })
      })
      const data = await response.json()
      if (data.success) {
        const current = get().subscribedProducts
        if (!current.includes(productId)) {
          const updated = [...current, productId]
          set({ subscribedProducts: updated })
          saveStored(updated)
        }
        return { success: true, message: data.message || "Subscribed successfully" }
      }
      return { success: false, message: data.message || "Failed to subscribe" }
    } catch {
      return { success: false, message: "Network error" }
    }
  },
  unsubscribe: (productId) => {
    const current = get().subscribedProducts
    const updated = current.filter(id => id !== productId)
    set({ subscribedProducts: updated })
    saveStored(updated)
  },
  isSubscribed: (productId) => get().subscribedProducts.includes(productId)
}))