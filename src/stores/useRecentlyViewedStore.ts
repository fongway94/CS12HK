import { create } from "zustand"
import { Product } from "../lib/db/types"

interface RecentlyViewedState {
  items: Product[]
  maxItems: number
  addProduct: (product: Product) => void
  clearHistory: () => void
}

function isBrowser() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  } catch {
    return false
  }
}

function loadStored(): Product[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem("cs12_recently_viewed")
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStored(items: Product[]) {
  if (!isBrowser()) return
  try { localStorage.setItem("cs12_recently_viewed", JSON.stringify(items)) } catch {}
}

export const useRecentlyViewedStore = create<RecentlyViewedState>((set, get) => ({
  items: loadStored(),
  maxItems: 10,
  addProduct: (product) => {
    const current = get().items
    // Remove if already exists
    const filtered = current.filter(p => p.id !== product.id)
    // Add to front
    const updated = [product, ...filtered].slice(0, get().maxItems)
    set({ items: updated })
    saveStored(updated)
  },
  clearHistory: () => {
    set({ items: [] })
    saveStored([])
  }
}))