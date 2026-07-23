import { create } from "zustand"

interface WishlistState {
  items: string[] // product ids
  toggle: (productId: string) => void
  has: (productId: string) => boolean
  clear: () => void
}

function loadWishlist(): string[] {
  try {
    const raw = localStorage.getItem("cs12_wishlist")
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveWishlist(items: string[]) {
  try { localStorage.setItem("cs12_wishlist", JSON.stringify(items)) } catch {}
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: loadWishlist(),

  toggle: (productId: string) => {
    const items = get().items.includes(productId)
      ? get().items.filter(id => id !== productId)
      : [...get().items, productId]
    saveWishlist(items)
    set({ items })
  },

  has: (productId: string) => {
    return get().items.includes(productId)
  },

  clear: () => {
    saveWishlist([])
    set({ items: [] })
  }
}))
