import { create } from "zustand"
import { getDBClient } from "../lib/db/client"
import type { BackInStockWaitlist } from "../lib/db/types"

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
    try {
      const normalizedEmail = email.trim().toLowerCase()
      if (!normalizedEmail) return { success: false, message: "Email is required" }

      // The current app uses DBClient/localAdapter. The old implementation
      // called an unimplemented /api/waitlist route and therefore never saved.
      const db = getDBClient()
      const entries = await db.getBackInStockWaitlist(productId)
      const existing = entries.find(entry =>
        entry.email.toLowerCase() === normalizedEmail && !entry.notifiedAt
      )

      if (!existing) {
        const entry: BackInStockWaitlist = {
          id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? `waitlist_${crypto.randomUUID()}`
            : `waitlist_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          productId,
          email: normalizedEmail,
          createdAt: new Date().toISOString()
        }
        await db.addToWaitlist(entry)
      }

      const current = get().subscribedProducts
      if (!current.includes(productId)) {
        const updated = [...current, productId]
        set({ subscribedProducts: updated })
        saveStored(updated)
      }
      return {
        success: true,
        message: existing ? "You are already subscribed to this alert" : "Subscribed successfully"
      }
    } catch {
      return { success: false, message: "Could not save your alert. Please try again." }
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